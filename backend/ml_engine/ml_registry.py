"""
ML Registry: Extensible plugin system for Quality Detectors and AI Reconstructors.
Allows seamless swapping between Traditional CV, PyTorch Models, ONNX, and Cloud AI.
"""
from typing import Dict, Any, Type, Optional
import numpy as np

from .base import (
    BaseQualityDetector,
    BaseReconstructor,
    BaseAligner,
    QualityReport,
    RegionBBox
)
from .cv_quality_detector import OpenCVQualityDetector
from .cv_reconstructor import OpenCVReconstructor


class MLRegistry:
    """
    Central registry for all AI/ML models in the system.
    Users can easily register their own custom PyTorch / ONNX / HuggingFace models.
    """
    
    def __init__(self):
        self._quality_detectors: Dict[str, BaseQualityDetector] = {}
        self._reconstructors: Dict[str, BaseReconstructor] = {}
        self._aligners: Dict[str, BaseAligner] = {}
        
        # Default active model keys
        self.active_quality_detector_key: str = "opencv_cv"
        self.active_reconstructor_key: str = "opencv_inpaint"
        self.active_aligner_key: str = "opencv_homography"
        
        # Register default Classical Computer Vision implementations
        self.register_quality_detector("opencv_cv", OpenCVQualityDetector())
        self.register_reconstructor("opencv_inpaint", OpenCVReconstructor())
        self.register_aligner("opencv_homography", OpenCVReconstructor())

    def register_quality_detector(self, name: str, detector: BaseQualityDetector):
        """Register a new Quality Detector instance."""
        self._quality_detectors[name] = detector

    def register_reconstructor(self, name: str, reconstructor: BaseReconstructor):
        """Register a new AI Inpainting / Reconstruction model."""
        self._reconstructors[name] = reconstructor

    def register_aligner(self, name: str, aligner: BaseAligner):
        """Register a new Patch Aligner instance."""
        self._aligners[name] = aligner

    def get_quality_detector(self, name: Optional[str] = None) -> BaseQualityDetector:
        key = name or self.active_quality_detector_key
        if key not in self._quality_detectors:
            raise KeyError(f"Quality detector '{key}' not registered. Available: {list(self._quality_detectors.keys())}")
        return self._quality_detectors[key]

    def get_reconstructor(self, name: Optional[str] = None) -> BaseReconstructor:
        key = name or self.active_reconstructor_key
        if key not in self._reconstructors:
            raise KeyError(f"Reconstructor '{key}' not registered. Available: {list(self._reconstructors.keys())}")
        return self._reconstructors[key]

    def get_aligner(self, name: Optional[str] = None) -> BaseAligner:
        key = name or self.active_aligner_key
        if key not in self._aligners:
            raise KeyError(f"Aligner '{key}' not registered. Available: {list(self._aligners.keys())}")
        return self._aligners[key]

    def list_available_models(self) -> Dict[str, Any]:
        """Returns details about all available and registered ML components."""
        return {
            "quality_detectors": [
                {
                    "key": "opencv_cv",
                    "name": "Hybrid Computer Vision Detector (Laplacian + Wavelet + Clipping)",
                    "type": "classical_cv",
                    "status": "active",
                    "is_active": self.active_quality_detector_key == "opencv_cv"
                },
                {
                    "key": "pytorch_lama_inpaint_stub",
                    "name": "PyTorch / ONNX Deep Inpainter (LaMa / Diffusion)",
                    "type": "neural_network",
                    "status": "ready_for_custom_weights",
                    "is_active": self.active_quality_detector_key == "pytorch_lama_inpaint_stub"
                },
                {
                    "key": "gemini_multimodal_analyzer_stub",
                    "name": "Gemini Vision Multimodal Quality Assessor",
                    "type": "cloud_vlm",
                    "status": "api_hook_available",
                    "is_active": self.active_quality_detector_key == "gemini_multimodal_analyzer_stub"
                }
            ],
            "reconstructors": [
                {
                    "key": "opencv_inpaint",
                    "name": "OpenCV Fast Marching & Navier-Stokes Inpainting",
                    "type": "fast_inpainting",
                    "status": "active",
                    "is_active": self.active_reconstructor_key == "opencv_inpaint"
                },
                {
                    "key": "custom_neural_reconstructor",
                    "name": "Custom Neural Texture Synthesizer (User ML Hook)",
                    "type": "deep_learning",
                    "status": "ready_for_user_model",
                    "is_active": False
                }
            ],
            "active_models": {
                "quality_detector": self.active_quality_detector_key,
                "reconstructor": self.active_reconstructor_key,
                "aligner": self.active_aligner_key
            }
        }


# Global singleton instance
ml_registry = MLRegistry()
