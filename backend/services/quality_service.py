"""
Quality and Uncertainty Detection orchestration service.
Supports both Stage-1 (per-face capture) and Stage-2 (post-stitching cubemap / sphere) analysis.
"""
from typing import Dict, Any, List, Optional
import numpy as np
import cv2
import uuid
from PIL import Image
import io

from ml_engine.base import QualityReport, RegionBBox, QualityIssueType, SeverityLevel
from ml_engine.ml_registry import ml_registry


class QualityService:
    def __init__(self):
        pass

    def analyze_image_bytes(
        self,
        image_bytes: bytes,
        face_direction: str = "north",
        model_name: Optional[str] = None
    ) -> QualityReport:
        """
        Runs quality detection on uploaded image bytes.
        """
        image_array = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Failed to decode image bytes")
            
        detector = ml_registry.get_quality_detector(model_name)
        report = detector.detect_quality(img_bgr, face_direction=face_direction)
        return report

    def analyze_image_array(
        self,
        img_bgr: np.ndarray,
        face_direction: str = "north",
        model_name: Optional[str] = None
    ) -> QualityReport:
        detector = ml_registry.get_quality_detector(model_name)
        return detector.detect_quality(img_bgr, face_direction=face_direction)

    def analyze_stitched_sphere(
        self,
        equirectangular_bgr: np.ndarray,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Stage-2 Quality Analysis: Analyzes the stitched 360° photosphere for seams,
        polar distortion artifacts, and composite blur.
        """
        detector = ml_registry.get_quality_detector(model_name)
        h, w, c = equirectangular_bgr.shape
        
        # 1. Inspect Seam Boundary (X = 0 and X = W)
        seam_width = int(w * 0.05)
        left_seam = equirectangular_bgr[:, :seam_width]
        right_seam = equirectangular_bgr[:, -seam_width:]
        
        # Calculate seam continuity gradient
        seam_diff = np.mean(np.abs(left_seam.astype(np.float32) - np.fliplr(right_seam).astype(np.float32)))
        seam_continuity_score = float(max(0.0, min(100.0, 100.0 - (seam_diff * 2.0))))
        
        # 2. General Quality Report on equirectangular image
        report = detector.detect_quality(equirectangular_bgr, face_direction="stitched_360_sphere")
        
        # Add seam issue if discontinuity detected
        if seam_continuity_score < 70.0:
            report.unclear_regions.append(
                RegionBBox(
                    id=f"seam-{uuid.uuid4().hex[:6]}",
                    x=0.0,
                    y=0.2,
                    width=0.05,
                    height=0.6,
                    issue_type=QualityIssueType.SEAM_ARTIFACT,
                    severity=SeverityLevel.HIGH if seam_continuity_score < 50 else SeverityLevel.MEDIUM,
                    confidence=0.88,
                    score=round(100.0 - seam_continuity_score, 1),
                    description=f"Seam boundary discontinuity detected along 360° wrap (Diff: {round(seam_diff, 1)})",
                    guidance={
                        "target_face": "seam_360",
                        "camera_instructions": "Check alignment between North and West overlap. Ensure overlapping features exist."
                    }
                )
            )

        return {
            "stage": "second_stage_post_stitch",
            "overall_score": report.overall_score,
            "seam_continuity_score": round(seam_continuity_score, 1),
            "metrics": report.metrics.model_dump(),
            "unclear_regions": [r.model_dump() for r in report.unclear_regions],
            "has_post_stitch_issues": len(report.unclear_regions) > 0
        }
