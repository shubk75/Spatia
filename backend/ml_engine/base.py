"""
Base classes and type schemas for the ML Engine.
Designed for easy extension by adding PyTorch, TensorFlow, ONNX, or Cloud AI models.
"""
from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
import numpy as np


class QualityIssueType(str, Enum):
    BLUR = "blur"
    NOISE = "noise"
    OVEREXPOSURE = "overexposure"
    UNDEREXPOSURE = "underexposure"
    LOW_RESOLUTION = "low_resolution"
    SEAM_ARTIFACT = "seam_artifact"
    UNKNOWN = "unknown"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RegionBBox(BaseModel):
    """Represents an identified unclear region on an image."""
    id: str = Field(..., description="Unique ID for this region")
    x: float = Field(..., description="Normalized X coordinate [0.0 - 1.0]")
    y: float = Field(..., description="Normalized Y coordinate [0.0 - 1.0]")
    width: float = Field(..., description="Normalized width [0.0 - 1.0]")
    height: float = Field(..., description="Normalized height [0.0 - 1.0]")
    issue_type: QualityIssueType = Field(default=QualityIssueType.BLUR)
    severity: SeverityLevel = Field(default=SeverityLevel.MEDIUM)
    confidence: float = Field(default=0.85, description="Confidence score [0.0 - 1.0]")
    score: float = Field(default=0.0, description="Raw metric score")
    description: str = Field(default="", description="Human-readable explanation of the defect")
    is_user_verified: bool = Field(default=False, description="Has the user confirmed this region?")
    is_rejected: bool = Field(default=False, description="Has user marked as false positive?")
    selected_method: Optional[str] = Field(default=None, description="'ai' or 'photo_capture'")
    resolution_status: str = Field(default="pending", description="pending, in_progress, resolved, rejected")
    
    # Capture guidance for Option 2 (Capture Clearer Photograph)
    guidance: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Guidance metadata for capturing a clearer photograph (distance, angle, direction)"
    )


class QualityMetric(BaseModel):
    """Aggregate quality measurements for an entire image."""
    blur_score: float = Field(..., description="Laplacian variance (higher is sharper)")
    blur_level: str = Field(..., description="Sharp, Moderate, Blurry")
    noise_sigma: float = Field(..., description="Estimated noise standard deviation")
    noise_level: str = Field(..., description="Clean, Moderate, Noisy")
    underexposed_percent: float = Field(..., description="Percentage of crushed black pixels")
    overexposed_percent: float = Field(..., description="Percentage of clipped white pixels")
    dynamic_range_score: float = Field(..., description="Dynamic range quality [0.0 - 100.0]")
    detail_entropy: float = Field(..., description="Information entropy / texture richness")
    overall_quality_score: float = Field(..., description="Composite quality rating [0.0 - 100.0]")


class QualityReport(BaseModel):
    """Complete quality analysis output for an image or face."""
    face_direction: str = Field(..., description="north, south, east, west, up, down, or custom")
    overall_score: float = Field(..., description="0-100 overall visual clarity score")
    metrics: QualityMetric
    unclear_regions: List[RegionBBox] = Field(default_factory=list)
    has_issues: bool = Field(default=False)
    timestamp: str = Field(default="")
    detector_model: str = Field(default="OpenCV-Hybrid-CV-v1")


class ReconstructionResult(BaseModel):
    """Result of AI Reconstruction (Option 1)."""
    region_id: str
    face_direction: str
    method: str = "ai_inpainting"
    model_name: str
    preview_url: str
    original_crop_url: str
    reconstructed_crop_url: str
    psnr_estimate: Optional[float] = None
    confidence: float = 0.9
    created_at: str = ""


class PatchAlignmentResult(BaseModel):
    """Result of Targeted Photo Patch alignment (Option 2)."""
    region_id: str
    face_direction: str
    inliers_count: int
    homography_matrix: Optional[List[List[float]]] = None
    preview_url: str
    blending_method: str = "poisson_seamless_clone"
    warp_success: bool = True
    guidance_match_score: float = 0.95


class BaseQualityDetector(ABC):
    """Abstract base class for Quality & Uncertainty Detectors."""
    
    @abstractmethod
    def detect_quality(self, image_np: np.ndarray, face_direction: str = "unknown") -> QualityReport:
        """
        Analyze an image (BGR or RGB np.ndarray) and return a QualityReport
        with aggregate metrics and detected unclear bounding boxes.
        """
        pass


class BaseReconstructor(ABC):
    """Abstract base class for AI Reconstruction & Inpainting models."""
    
    @abstractmethod
    def reconstruct_region(
        self,
        image_np: np.ndarray,
        mask_np: np.ndarray,
        bbox: RegionBBox,
        method: str = "telea"
    ) -> np.ndarray:
        """
        Inpaint / reconstruct the region defined by mask_np in image_np.
        Returns the reconstructed image_np.
        """
        pass


class BaseAligner(ABC):
    """Abstract base class for Patch Alignment and Warping."""
    
    @abstractmethod
    def align_and_blend_patch(
        self,
        base_image_np: np.ndarray,
        patch_image_np: np.ndarray,
        target_bbox: RegionBBox
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Align patch_image_np to base_image_np inside target_bbox using feature matching
        and apply seamless Poisson / multi-band blending.
        """
        pass
