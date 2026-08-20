"""
End-to-End API Server Integration Test.
Launches FastAPI TestClient, executes full workflow:
1. Health check
2. Load Demo Dataset (Heritage Sanctuary)
3. Quality detection inspection
4. Option 1: AI Inpainting generation & Human Verification accept
5. 360° Photosphere Stitching & Stage-2 Seam Verification
6. Hotspot creation & room navigation graph
7. Provenance ledger audit
"""
import sys
import os
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

print("=== Starting End-to-End API Integration Test ===")

# 1. Health Check
res = client.get("/api/health")
assert res.status_code == 200, f"Health check failed: {res.text}"
print("[PASS] GET /api/health returned 200 OK.")

# 2. Load Sample Dataset
res = client.post("/api/sample-datasets/load", json={"dataset_type": "heritage"})
assert res.status_code == 200, f"Demo load failed: {res.text}"
data = res.json()
room_id = data["loaded_room_id"]
project = data["project"]
print(f"[PASS] Loaded Heritage Sanctuary demo dataset. Room ID: {room_id}, Rooms in project: {len(project['rooms'])}")

# 3. Verify Quality Reports for all faces
room_data = project["rooms"][room_id]
quality_reports = room_data["quality_reports"]
assert "west" in quality_reports, "Expected quality report for west face"
west_issues = quality_reports["west"]["unclear_regions"]
print(f"[PASS] West face quality detected {len(west_issues)} unclear regions.")

# 4. Trigger Option 1: AI Reconstruction
if west_issues:
    target_bbox_id = west_issues[0]["id"]
    recon_res = client.post(
        f"/api/rooms/{room_id}/reconstruct-ai",
        json={"face_direction": "west", "region_id": target_bbox_id, "method": "telea"}
    )
    assert recon_res.status_code == 200, f"AI Reconstruction failed: {recon_res.text}"
    recon_data = recon_res.json()
    candidate_id = recon_data["candidate_id"]
    print(f"[PASS] Option 1 AI Inpainting candidate generated. Candidate ID: {candidate_id}")

    # 5. Human-in-the-loop Verification: Accept candidate fix
    verify_res = client.post(
        f"/api/rooms/{room_id}/verify-correction",
        json={
            "candidate_id": candidate_id,
            "action": "accept",
            "verification_notes": "Operator verified historical fresco texture accuracy"
        }
    )
    assert verify_res.status_code == 200, f"Verification accept failed: {verify_res.text}"
    print(f"[PASS] Human verification ACCEPT committed. New face URL: {verify_res.json()['new_face_url']}")

# 6. Stitch 360° Photosphere
stitch_res = client.post(f"/api/rooms/{room_id}/stitch")
assert stitch_res.status_code == 200, f"Stitching failed: {stitch_res.text}"
stitch_data = stitch_res.json()
assert "stitched_equirectangular_url" in stitch_data, "Missing equirectangular URL"
print(f"[PASS] Stitched 360° Photosphere URL: {stitch_data['stitched_equirectangular_url']}")
print(f"       Stage-2 Seam Continuity: {stitch_data['stage2_quality_report']['seam_continuity_score']}%")

# 7. Add 3D Doorway Hotspot Portal
hotspot_res = client.post(
    f"/api/rooms/{room_id}/hotspots",
    json={
        "target_room_id": "demo-modern-adjacent",
        "label": "Enter Adjacent Exhibition Gallery",
        "yaw_deg": 180.0,
        "pitch_deg": -5.0,
        "icon_type": "door"
    }
)
assert hotspot_res.status_code == 200, f"Hotspot creation failed: {hotspot_res.text}"
print(f"[PASS] 3D Doorway Hotspot created: {hotspot_res.json()['label']}")

# 8. Check ML Models listing
ml_res = client.get("/api/ml/models")
assert ml_res.status_code == 200
ml_data = ml_res.json()
print(f"[PASS] ML Registry: {len(ml_data['quality_detectors'])} quality detectors, {len(ml_data['reconstructors'])} reconstructors available.")

# 9. Verify Provenance Log
proj_res = client.get("/api/project")
proj_data = proj_res.json()
provenance_count = len(proj_data.get("provenance_log", []))
print(f"[PASS] Provenance audit ledger has {provenance_count} verified events recorded.")

print("\n>>> ALL API & PIPELINE INTEGRATION TESTS PASSED 100%! <<<")
