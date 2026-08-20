"""
OpenCV & Traditional Computer Vision based Quality & Uncertainty Detector.
Evaluates Blur (Laplacian), Noise, Exposure clipping, and Low-detail areas.
Generates localized bounding boxes with guidance parameters for Option 2 capture.
"""
import uuid
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
from datetime import datetime

from .base import (
    BaseQualityDetector,
    QualityReport,
    QualityMetric,
    RegionBBox,
    QualityIssueType,
    SeverityLevel
)


class OpenCVQualityDetector(BaseQualityDetector):
    def __init__(
        self,
        blur_threshold: float = 100.0,
        noise_threshold: float = 12.0,
        exposure_clip_ratio: float = 0.04,
        grid_divisions: int = 8
    ):
        self.blur_threshold = blur_threshold
        self.noise_threshold = noise_threshold
        self.exposure_clip_ratio = exposure_clip_ratio
        self.grid_divisions = grid_divisions

    def _estimate_noise_sigma(self, gray: np.ndarray) -> float:
        """Estimates image noise standard deviation using Donoho's MAD on Laplacian."""
        h, w = gray.shape
        M = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]])
        sigma = np.sum(np.abs(cv2.filter2D(gray, -1, M)))
        sigma = sigma * np.sqrt(0.5 * np.pi) / (6 * (w - 2) * (h - 2))
        return float(sigma)

    def _calculate_entropy(self, gray: np.ndarray) -> float:
        """Calculates 2D Shannon entropy of the grayscale image."""
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.ravel() / (hist.sum() + 1e-7)
        non_zeros = hist[hist > 0]
        return float(-np.sum(non_zeros * np.log2(non_zeros)))

    def _generate_capture_guidance(
        self,
        face_direction: str,
        norm_x: float,
        norm_y: float,
        norm_w: float,
        norm_h: float,
        issue_type: QualityIssueType
    ) -> Dict[str, Any]:
        """
        Calculates targeted physical guidance for Option 2 (Capture a Clearer Photograph).
        """
        center_x = norm_x + norm_w / 2.0
        center_y = norm_y + norm_h / 2.0
        
        # Calculate horizontal and vertical angle offsets from center of face
        # Assuming typical 90-degree field of view for cubemap faces
        fov_deg = 90.0
        angle_h_deg = round((center_x - 0.5) * fov_deg, 1)
        angle_v_deg = round((0.5 - center_y) * fov_deg, 1)
        
        recommended_dist = "1.0m - 1.5m"
        lens_advice = "Normal wide (24mm - 35mm equivalent)"
        
        if issue_type == QualityIssueType.BLUR:
            instruction = f"Hold camera steady or use tripod. Focus directly on the center of this target region. Suggested shutter >= 1/125s."
            rec_distance = "0.8m - 1.2m closer than original spot"
        elif issue_type == QualityIssueType.OVEREXPOSURE:
            instruction = f"Lower exposure compensation (-1.0 to -2.0 EV) or shield direct light source to preserve highlight details."
            rec_distance = "Maintain position, adjust exposure metering"
        elif issue_type == QualityIssueType.UNDEREXPOSURE:
            instruction = f"Increase exposure (+1.0 to +1.5 EV), use ambient fill lighting or night capture mode for darker shadows."
            rec_distance = "Maintain position, increase ISO or exposure time"
        elif issue_type == QualityIssueType.NOISE:
            instruction = f"Decrease ISO to <= 200, lengthen shutter time and stabilize camera on a flat surface."
            rec_distance = "1.0m from target area"
        else:
            instruction = f"Step closer to capture high-frequency surface texture and fine architectural details."
            rec_distance = "0.5m - 0.9m macro/close range"

        direction_names = {
            "north": "North (0°)",
            "east": "East (90°)",
            "south": "South (180°)",
            "west": "West (270°)",
            "up": "Ceiling / Up (+90° Pitch)",
            "down": "Floor / Down (-90° Pitch)"
        }
        face_label = direction_names.get(face_direction.lower(), face_direction.capitalize())

        return {
            "target_face": face_direction,
            "target_face_label": face_label,
            "relative_angle_horizontal": f"{'+' if angle_h_deg > 0 else ''}{angle_h_deg}° ({'Right' if angle_h_deg > 0 else 'Left'} of center)",
            "relative_angle_vertical": f"{'+' if angle_v_deg > 0 else ''}{angle_v_deg}° ({'Above' if angle_v_deg > 0 else 'Below'} horizon)",
            "recommended_distance": rec_distance,
            "lens_focal_suggestion": lens_advice,
            "camera_instructions": instruction,
            "target_normalized_coords": {
                "x": round(norm_x, 4),
                "y": round(norm_y, 4),
                "w": round(norm_w, 4),
                "h": round(norm_h, 4)
            }
        }

    def detect_quality(self, image_np: np.ndarray, face_direction: str = "north") -> QualityReport:
        """
        Full quality analysis for an image or cubemap face.
        """
        # Ensure BGR or Gray
        if len(image_np.shape) == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            h, w, c = image_np.shape
        else:
            gray = image_np
            h, w = gray.shape
            c = 1

        # 1. Global Metrics
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        blur_var = float(laplacian.var())
        noise_sigma = self._estimate_noise_sigma(gray)
        entropy = self._calculate_entropy(gray)
        
        # Exposure Clipping
        total_pixels = float(h * w)
        underexposed_count = np.sum(gray <= 10)
        overexposed_count = np.sum(gray >= 245)
        underexposed_pct = float((underexposed_count / total_pixels) * 100.0)
        overexposed_pct = float((overexposed_count / total_pixels) * 100.0)
        
        # Dynamic Range
        p5, p95 = np.percentile(gray, [5, 95])
        dynamic_range_score = float(min(100.0, max(0.0, (p95 - p5) / 255.0 * 100.0)))
        
        # Quality ratings
        blur_level = "Sharp" if blur_var >= 180 else ("Moderate" if blur_var >= 80 else "Blurry")
        noise_level = "Clean" if noise_sigma < 6 else ("Moderate" if noise_sigma < 15 else "Noisy")
        
        # Composite score
        # Base starts at 100, penalties for blur, noise, clipping
        score = 100.0
        if blur_var < 50:
            score -= 30.0
        elif blur_var < 100:
            score -= 15.0
            
        if noise_sigma > 15:
            score -= 20.0
        elif noise_sigma > 8:
            score -= 10.0
            
        if (underexposed_pct + overexposed_pct) > 15:
            score -= 25.0
        elif (underexposed_pct + overexposed_pct) > 5:
            score -= 10.0
            
        overall_score = float(max(10.0, min(100.0, score)))

        # 2. Local Grid Analysis for Unclear Regions
        unclear_regions: List[RegionBBox] = []
        
        rows = self.grid_divisions
        cols = self.grid_divisions
        cell_h = h // rows
        cell_w = w // cols

        # Grid defect maps
        blur_grid = np.zeros((rows, cols))
        noise_grid = np.zeros((rows, cols))
        over_grid = np.zeros((rows, cols))
        under_grid = np.zeros((rows, cols))

        for r in range(rows):
            for c_idx in range(cols):
                y1 = r * cell_h
                y2 = (r + 1) * cell_h if r < rows - 1 else h
                x1 = c_idx * cell_w
                x2 = (c_idx + 1) * cell_w if c_idx < cols - 1 else w
                
                patch = gray[y1:y2, x1:x2]
                if patch.size == 0:
                    continue
                    
                patch_lap = cv2.Laplacian(patch, cv2.CV_64F).var()
                patch_noise = self._estimate_noise_sigma(patch)
                patch_over = np.sum(patch >= 248) / float(patch.size)
                patch_under = np.sum(patch <= 8) / float(patch.size)
                
                blur_grid[r, c_idx] = patch_lap
                noise_grid[r, c_idx] = patch_noise
                over_grid[r, c_idx] = patch_over
                under_grid[r, c_idx] = patch_under

        # Cluster and generate bounding boxes
        # We find anomalous cells that significantly deviate from good standards
        for r in range(rows):
            for c_idx in range(cols):
                # Check Overexposure
                if over_grid[r, c_idx] > 0.15:
                    norm_x = (c_idx * cell_w) / float(w)
                    norm_y = (r * cell_h) / float(h)
                    norm_w = min(1.0 - norm_x, (cell_w * 1.5) / float(w))
                    norm_h = min(1.0 - norm_y, (cell_h * 1.5) / float(h))
                    
                    guidance = self._generate_capture_guidance(
                        face_direction, norm_x, norm_y, norm_w, norm_h, QualityIssueType.OVEREXPOSURE
                    )
                    
                    unclear_regions.append(
                        RegionBBox(
                            id=f"box-{uuid.uuid4().hex[:8]}",
                            x=round(norm_x, 4),
                            y=round(norm_y, 4),
                            width=round(norm_w, 4),
                            height=round(norm_h, 4),
                            issue_type=QualityIssueType.OVEREXPOSURE,
                            severity=SeverityLevel.HIGH if over_grid[r, c_idx] > 0.35 else SeverityLevel.MEDIUM,
                            confidence=round(min(0.98, float(over_grid[r, c_idx] * 2.0)), 2),
                            score=round(float(over_grid[r, c_idx] * 100), 1),
                            description=f"Overexposed highlight clipping detected ({round(over_grid[r, c_idx]*100, 1)}% clipped pixels)",
                            guidance=guidance
                        )
                    )
                # Check Underexposure
                elif under_grid[r, c_idx] > 0.25:
                    norm_x = (c_idx * cell_w) / float(w)
                    norm_y = (r * cell_h) / float(h)
                    norm_w = min(1.0 - norm_x, (cell_w * 1.5) / float(w))
                    norm_h = min(1.0 - norm_y, (cell_h * 1.5) / float(h))
                    
                    guidance = self._generate_capture_guidance(
                        face_direction, norm_x, norm_y, norm_w, norm_h, QualityIssueType.UNDEREXPOSURE
                    )
                    
                    unclear_regions.append(
                        RegionBBox(
                            id=f"box-{uuid.uuid4().hex[:8]}",
                            x=round(norm_x, 4),
                            y=round(norm_y, 4),
                            width=round(norm_w, 4),
                            height=round(norm_h, 4),
                            issue_type=QualityIssueType.UNDEREXPOSURE,
                            severity=SeverityLevel.HIGH if under_grid[r, c_idx] > 0.5 else SeverityLevel.MEDIUM,
                            confidence=round(min(0.95, float(under_grid[r, c_idx] * 1.8)), 2),
                            score=round(float(under_grid[r, c_idx] * 100), 1),
                            description=f"Crushed black / shadow underexposure ({round(under_grid[r, c_idx]*100, 1)}% black)",
                            guidance=guidance
                        )
                    )
                # Check Local Blur (if significantly below global median or < 40)
                elif blur_grid[r, c_idx] < 35.0 and blur_var > 60.0:
                    norm_x = (c_idx * cell_w) / float(w)
                    norm_y = (r * cell_h) / float(h)
                    norm_w = min(1.0 - norm_x, (cell_w * 1.5) / float(w))
                    norm_h = min(1.0 - norm_y, (cell_h * 1.5) / float(h))
                    
                    guidance = self._generate_capture_guidance(
                        face_direction, norm_x, norm_y, norm_w, norm_h, QualityIssueType.BLUR
                    )
                    
                    unclear_regions.append(
                        RegionBBox(
                            id=f"box-{uuid.uuid4().hex[:8]}",
                            x=round(norm_x, 4),
                            y=round(norm_y, 4),
                            width=round(norm_w, 4),
                            height=round(norm_h, 4),
                            issue_type=QualityIssueType.BLUR,
                            severity=SeverityLevel.HIGH if blur_grid[r, c_idx] < 15 else SeverityLevel.MEDIUM,
                            confidence=round(max(0.70, min(0.96, (50.0 - blur_grid[r, c_idx]) / 50.0)), 2),
                            score=round(float(blur_grid[r, c_idx]), 1),
                            description=f"Localized motion blur or out-of-focus optics (Var: {round(blur_grid[r, c_idx], 1)})",
                            guidance=guidance
                        )
                    )

        # Merge overlapping bounding boxes to avoid duplicates
        merged_regions = self._merge_overlapping_boxes(unclear_regions)

        metrics = QualityMetric(
            blur_score=round(blur_var, 2),
            blur_level=blur_level,
            noise_sigma=round(noise_sigma, 2),
            noise_level=noise_level,
            underexposed_percent=round(underexposed_pct, 2),
            overexposed_percent=round(overexposed_pct, 2),
            dynamic_range_score=round(dynamic_range_score, 1),
            detail_entropy=round(entropy, 2),
            overall_quality_score=round(overall_score, 1)
        )

        return QualityReport(
            face_direction=face_direction,
            overall_score=round(overall_score, 1),
            metrics=metrics,
            unclear_regions=merged_regions,
            has_issues=len(merged_regions) > 0,
            timestamp=datetime.now().isoformat(),
            detector_model="OpenCV-Hybrid-CV-v1"
        )

    def _merge_overlapping_boxes(self, boxes: List[RegionBBox]) -> List[RegionBBox]:
        """Simple Non-Maximum Suppression / box union to keep results clean and concise."""
        if not boxes:
            return []
        
        # Limit to max 4 most significant boxes per face to not overwhelm the user
        boxes_sorted = sorted(boxes, key=lambda b: (b.severity == SeverityLevel.HIGH, b.confidence), reverse=True)
        kept: List[RegionBBox] = []

        for b in boxes_sorted:
            # Check overlap with already kept boxes
            overlap = False
            for k in kept:
                # Calculate Intersection over Union (IoU)
                ix1 = max(b.x, k.x)
                iy1 = max(b.y, k.y)
                ix2 = min(b.x + b.width, k.x + k.width)
                iy2 = min(b.y + b.height, k.y + k.height)
                
                if ix2 > ix1 and iy2 > iy1:
                    inter_area = (ix2 - ix1) * (iy2 - iy1)
                    b_area = b.width * b.height
                    k_area = k.width * k.height
                    iou = inter_area / float(b_area + k_area - inter_area)
                    if iou > 0.25:
                        overlap = True
                        break
            if not overlap and len(kept) < 5:
                kept.append(b)

        return kept
