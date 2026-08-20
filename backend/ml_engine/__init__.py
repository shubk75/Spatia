"""
ML Engine Package for AI-Assisted Immersive Environment Reconstruction.
Provides modular, extensible interfaces for Quality Detection, Reconstruction, and Alignment.
"""
from .base import (
    BaseQualityDetector,
    BaseReconstructor,
    BaseAligner,
    RegionBBox,
    QualityMetric,
    QualityReport,
    ReconstructionResult,
    PatchAlignmentResult,
    QualityIssueType,
    SeverityLevel
)
from .cv_quality_detector import OpenCVQualityDetector
from .cv_reconstructor import OpenCVReconstructor
from .ml_registry import ml_registry

__all__ = [
    "BaseQualityDetector",
    "BaseReconstructor",
    "BaseAligner",
    "RegionBBox",
    "QualityMetric",
    "QualityReport",
    "ReconstructionResult",
    "PatchAlignmentResult",
    "QualityIssueType",
    "SeverityLevel",
    "OpenCVQualityDetector",
    "OpenCVReconstructor",
    "ml_registry"
]
