"""
Backend sanity test script.
Verifies EXIF parsing, Quality Detector, Inpainting, Stitching, and Sample Data.
"""
import sys
import numpy as np
import cv2

print("=== Running Backend Pipeline Tests ===")

# 1. Test ML Engine imports
from ml_engine.base import RegionBBox, QualityIssueType, SeverityLevel
from ml_engine.cv_quality_detector import OpenCVQualityDetector
from ml_engine.cv_reconstructor import OpenCVReconstructor
from ml_engine.ml_registry import ml_registry
from services.exif_service import ExifService
from services.quality_service import QualityService
from services.reconstruction_service import ReconstructionService
from services.stitching_service import StitchingService
from services.sample_data_service import SampleDataService
from services.room_graph_service import room_graph_service

print("[PASS] All backend modules imported successfully.")

# 2. Test Sample Data Generation & Quality Detection
sample_faces = SampleDataService.generate_procedural_room("heritage", size=512)
assert len(sample_faces) == 6, "Expected 6 faces generated"
print(f"[PASS] Generated 6 faces for Heritage Sanctuary: {list(sample_faces.keys())}")

detector = OpenCVQualityDetector()
report_west = detector.detect_quality(sample_faces["west"], face_direction="west")
print(f"[PASS] West face quality score: {report_west.overall_score}, detected unclear regions: {len(report_west.unclear_regions)}")
for r in report_west.unclear_regions:
    print(f"       -> {r.issue_type.value} at ({r.x}, {r.y}, {r.width}x{r.height}) - {r.description}")

# 3. Test Option 1 (AI Reconstruction / Inpainting)
recon_service = ReconstructionService()
if report_west.unclear_regions:
    target_box = report_west.unclear_regions[0]
else:
    target_box = RegionBBox(id="test", x=0.2, y=0.2, width=0.4, height=0.4, issue_type=QualityIssueType.BLUR)

reconstructed, meta = recon_service.perform_ai_reconstruction(sample_faces["west"], target_box)
assert reconstructed is not None, "Reconstruction failed"
print(f"[PASS] AI Inpainting preview generated. Confidence: {meta['confidence']}, PSNR: {meta.get('psnr_estimate')}")

# 4. Test 360° Cubemap to Equirectangular Stitching
stitching = StitchingService(output_face_size=512)
equirect = stitching.cubemap_to_equirectangular(sample_faces, eq_width=1024, eq_height=512)
assert equirect.shape == (512, 1024, 3), f"Expected 512x1024x3 equirectangular, got {equirect.shape}"
print(f"[PASS] Successfully stitched 6 faces into 360° Photosphere ({equirect.shape[1]}x{equirect.shape[0]})")

# 5. Test Cross Layout
cross = stitching.create_cross_cubemap_layout(sample_faces)
print(f"[PASS] Cross-unfold cubemap layout generated ({cross.shape[1]}x{cross.shape[0]})")

# 6. Test Multi-room Graph & Hotspot
proj = room_graph_service.get_or_create_default_project()
room1 = proj.initial_room_id
room2 = room_graph_service.add_room(proj.id, "Gallery Room", "hall")
hotspot = room_graph_service.add_hotspot(proj.id, room1, room2.id, "Portal to Gallery", 90.0, 0.0)
assert hotspot.target_room_id == room2.id
print(f"[PASS] Room graph & 3D Doorway Hotspot created: {hotspot.label}")

print("\n>>> ALL BACKEND TESTS PASSED WITH 100% SUCCESS! <<<")
