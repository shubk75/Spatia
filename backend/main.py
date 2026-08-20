"""
AI-Assisted Immersive Environment Reconstruction Backend.
FastAPI Application serving REST endpoints for:
- 6-Directional Capture & EXIF Preprocessing
- Quality & Uncertainty Detection (Traditional CV + Pluggable ML)
- Human Verification & Correction (Option 1 AI Reconstruction / Option 2 Targeted Photo Patch)
- 360° Cubemap & Equirectangular Photosphere Stitching
- Multi-room Property Graph & 3D Doorway Portals
- Heritage Provenance Ledger & Expert Sign-off
"""
import os
import io
import uuid
import base64
import numpy as np
import cv2
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from ml_engine.base import (
    RegionBBox,
    QualityIssueType,
    SeverityLevel
)
from ml_engine.ml_registry import ml_registry
from services.exif_service import ExifService
from services.quality_service import QualityService
from services.reconstruction_service import ReconstructionService
from services.stitching_service import StitchingService
from services.room_graph_service import room_graph_service, PropertyProject, RoomNode, HotspotPortal
from services.sample_data_service import SampleDataService

# Storage directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")
STITCHED_DIR = os.path.join(STORAGE_DIR, "stitched")
PREVIEWS_DIR = os.path.join(STORAGE_DIR, "previews")

for d in [STORAGE_DIR, UPLOADS_DIR, STITCHED_DIR, PREVIEWS_DIR]:
    os.makedirs(d, exist_ok=True)

app = FastAPI(
    title="AI-Assisted Immersive Environment Reconstruction API",
    description="Backend API for 360° Photosphere / Cubemap Reconstruction with Human-in-the-Loop Validation",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=STORAGE_DIR), name="static")

# Service instances
quality_service = QualityService()
reconstruction_service = ReconstructionService()
stitching_service = StitchingService(output_face_size=1024)

# In-memory candidate corrections waiting for user verification: {candidate_id: dict}
pending_verifications: Dict[str, Dict[str, Any]] = {}


# --- Helper functions ---
def save_numpy_image(img_bgr: np.ndarray, folder: str, prefix: str = "img") -> Tuple[str, str]:
    filename = f"{prefix}_{uuid.uuid4().hex[:10]}.jpg"
    filepath = os.path.join(folder, filename)
    cv2.imwrite(filepath, img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 94])
    rel_url = f"/static/{os.path.basename(folder)}/{filename}"
    return filepath, rel_url


# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI-Assisted Immersive Reconstruction",
        "timestamp": datetime.now().isoformat(),
        "ml_registry": ml_registry.list_available_models()
    }


@app.get("/api/project")
def get_current_project():
    proj = room_graph_service.get_or_create_default_project()
    return proj.model_dump()


@app.post("/api/project/set-mode")
def set_project_mode(mode: str = Body(..., embed=True)):
    proj = room_graph_service.get_or_create_default_project()
    if mode in ["heritage", "real_estate"]:
        proj.project_type = mode
        room_graph_service.log_provenance(
            project_id=proj.id,
            room_id=proj.initial_room_id or "root",
            event_type="project_mode_changed",
            details={"mode": mode}
        )
    return {"status": "success", "project_type": proj.project_type}


@app.post("/api/rooms")
def create_room(name: str = Body(..., embed=True), category: str = Body("living_room", embed=True)):
    proj = room_graph_service.get_or_create_default_project()
    new_room = room_graph_service.add_room(proj.id, name=name, category=category)
    return new_room.model_dump()


@app.post("/api/rooms/{room_id}/upload-face")
async def upload_directional_face(
    room_id: str,
    direction: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Uploads a directional image (North, South, East, West, Up, Down, or Patch),
    extracts EXIF metadata, saves image, and executes initial quality assessment.
    """
    proj = room_graph_service.get_or_create_default_project()
    if room_id not in proj.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = proj.rooms[room_id]
    direction_clean = direction.lower().strip()
    
    # Read bytes
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # 1. EXIF Metadata extraction
    exif_meta = ExifService.extract_metadata(image_bytes)

    # 2. Decode image and ensure BGR
    img_array = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    # Standardize face dimensions (1024x1024)
    std_img = stitching_service.standardize_face(img_bgr, 1024)

    # Save to disk
    filepath, rel_url = save_numpy_image(std_img, UPLOADS_DIR, prefix=f"{room_id}_{direction_clean}")

    # Store face in room
    room.faces[direction_clean] = rel_url
    room.faces_metadata[direction_clean] = {
        "file_path": filepath,
        "original_filename": file.filename,
        "uploaded_at": datetime.now().isoformat(),
        "exif": exif_meta
    }

    # 3. Quality & Uncertainty Detection
    report = quality_service.analyze_image_array(std_img, face_direction=direction_clean)
    room.quality_reports[direction_clean] = report.model_dump()

    # Log provenance
    room_graph_service.log_provenance(
        project_id=proj.id,
        room_id=room.id,
        event_type="capture_upload",
        face_direction=direction_clean,
        details={
            "filename": file.filename,
            "quality_score": report.overall_score,
            "detected_issues_count": len(report.unclear_regions),
            "camera": exif_meta.get("camera_model")
        }
    )

    return {
        "room_id": room_id,
        "direction": direction_clean,
        "url": rel_url,
        "exif": exif_meta,
        "quality_report": report.model_dump()
    }


@app.post("/api/rooms/{room_id}/quality-scan")
def run_quality_scan(room_id: str, direction: Optional[str] = Body(None, embed=True)):
    """
    Re-runs quality detection on one face or all faces in the room.
    """
    proj = room_graph_service.get_or_create_default_project()
    if room_id not in proj.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = proj.rooms[room_id]
    faces_to_scan = [direction.lower()] if direction else ["north", "south", "east", "west", "up", "down"]
    
    results = {}
    for f in faces_to_scan:
        url = room.faces.get(f)
        if url:
            rel_path = url.replace("/static/", "")
            full_path = os.path.join(STORAGE_DIR, rel_path)
            if os.path.exists(full_path):
                img = cv2.imread(full_path)
                if img is not None:
                    report = quality_service.analyze_image_array(img, face_direction=f)
                    room.quality_reports[f] = report.model_dump()
                    results[f] = report.model_dump()

    return {"room_id": room_id, "reports": results}


@app.post("/api/rooms/{room_id}/manual-box")
def add_manual_bounding_box(
    room_id: str,
    face_direction: str = Body(...),
    x: float = Body(...),
    y: float = Body(...),
    width: float = Body(...),
    height: float = Body(...),
    issue_type: str = Body("blur"),
    description: str = Body("User marked unclear region")
):
    """
    Allows user to manually draw and add an unclear region on an image.
    """
    proj = room_graph_service.get_or_create_default_project()
    if room_id not in proj.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = proj.rooms[room_id]
    face_key = face_direction.lower()
    
    detector = ml_registry.get_quality_detector()
    issue_enum = QualityIssueType(issue_type) if issue_type in QualityIssueType.__members__.values() else QualityIssueType.BLUR
    
    # Calculate capture guidance
    guidance = detector._generate_capture_guidance(face_key, x, y, width, height, issue_enum)
    
    new_box = RegionBBox(
        id=f"manual-{uuid.uuid4().hex[:8]}",
        x=x,
        y=y,
        width=width,
        height=height,
        issue_type=issue_enum,
        severity=SeverityLevel.HIGH,
        confidence=1.0,
        score=99.0,
        description=description,
        is_user_verified=True,
        guidance=guidance
    )
    
    if face_key not in room.quality_reports or not room.quality_reports[face_key]:
        room.quality_reports[face_key] = {
            "face_direction": face_key,
            "overall_score": 85.0,
            "unclear_regions": []
        }
        
    room.quality_reports[face_key]["unclear_regions"].append(new_box.model_dump())
    
    room_graph_service.log_provenance(
        project_id=proj.id,
        room_id=room_id,
        event_type="manual_defect_flagged",
        face_direction=face_key,
        region_id=new_box.id,
        details={"box": new_box.model_dump()}
    )
    
    return {"status": "success", "box": new_box.model_dump()}


@app.post("/api/rooms/{room_id}/reconstruct-ai")
def trigger_ai_reconstruction(
    room_id: str,
    face_direction: str = Body(...),
    region_id: str = Body(...),
    method: str = Body("telea")
):
    """
    Option 1: AI Reconstruction / Inpainting.
    Generates candidate inpainting preview and stores it for human verification.
    """
    proj = room_graph_service.get_or_create_default_project()
    if room_id not in proj.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = proj.rooms[room_id]
    face_key = face_direction.lower()
    url = room.faces.get(face_key)
    if not url:
        raise HTTPException(status_code=400, detail="Face image not uploaded")
        
    rel_path = url.replace("/static/", "")
    full_path = os.path.join(STORAGE_DIR, rel_path)
    base_img = cv2.imread(full_path)
    if base_img is None:
        raise HTTPException(status_code=400, detail="Failed to read face image")

    # Find the region box
    report = room.quality_reports.get(face_key, {})
    regions = report.get("unclear_regions", [])
    target_box = None
    for r in regions:
        if r.get("id") == region_id:
            target_box = RegionBBox(**r)
            break
            
    if not target_box:
        # Fallback default center box if not found
        target_box = RegionBBox(
            id=region_id,
            x=0.3, y=0.3, width=0.4, height=0.4,
            issue_type=QualityIssueType.BLUR
        )

    # Perform AI Inpainting
    reconstructed_bgr, meta = reconstruction_service.perform_ai_reconstruction(
        base_img,
        target_box,
        method=method
    )

    # Create candidate verification entry
    candidate_id = f"cand-{uuid.uuid4().hex[:10]}"
    pending_verifications[candidate_id] = {
        "candidate_id": candidate_id,
        "room_id": room_id,
        "face_direction": face_key,
        "region_id": region_id,
        "method_type": "ai_reconstruction",
        "method": method,
        "reconstructed_bgr": reconstructed_bgr,
        "meta": meta
    }

    return {
        "candidate_id": candidate_id,
        "region_id": region_id,
        "preview_url": meta["preview_url"],
        "original_crop_url": meta["original_crop_url"],
        "reconstructed_crop_url": meta["reconstructed_crop_url"],
        "psnr_estimate": meta.get("psnr_estimate"),
        "confidence": meta.get("confidence", 0.92),
        "status": "awaiting_human_verification"
    }


@app.post("/api/rooms/{room_id}/reconstruct-patch")
async def trigger_photo_patch_reconstruction(
    room_id: str,
    face_direction: str = Form(...),
    region_id: str = Form(...),
    patch_file: UploadFile = File(...)
):
    """
    Option 2: Targeted Photograph Guidance & Patch Homography Alignment.
    Aligns user's targeted capture and stores candidate for human verification.
    """
    proj = room_graph_service.get_or_create_default_project()
    if room_id not in proj.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = proj.rooms[room_id]
    face_key = face_direction.lower()
    url = room.faces.get(face_key)
    if not url:
        raise HTTPException(status_code=400, detail="Base face image not uploaded")
        
    rel_path = url.replace("/static/", "")
    full_path = os.path.join(STORAGE_DIR, rel_path)
    base_img = cv2.imread(full_path)
    if base_img is None:
        raise HTTPException(status_code=400, detail="Failed to read base image")

    # Read patch image bytes
    patch_bytes = await patch_file.read()
    patch_array = np.frombuffer(patch_bytes, np.uint8)
    patch_img = cv2.imdecode(patch_array, cv2.IMREAD_COLOR)
    if patch_img is None:
        raise HTTPException(status_code=400, detail="Invalid patch image")

    # Find target bounding box
    report = room.quality_reports.get(face_key, {})
    regions = report.get("unclear_regions", [])
    target_box = None
    for r in regions:
        if r.get("id") == region_id:
            target_box = RegionBBox(**r)
            break
            
    if not target_box:
        target_box = RegionBBox(
            id=region_id,
            x=0.2, y=0.2, width=0.6, height=0.6,
            issue_type=QualityIssueType.BLUR
        )

    # Perform Patch Alignment and Blending
    patched_bgr, meta = reconstruction_service.perform_photo_patch_alignment(
        base_img,
        patch_img,
        target_box
    )

    candidate_id = f"cand-{uuid.uuid4().hex[:10]}"
    pending_verifications[candidate_id] = {
        "candidate_id": candidate_id,
        "room_id": room_id,
        "face_direction": face_key,
        "region_id": region_id,
        "method_type": "photo_patch",
        "patched_bgr": patched_bgr,
        "meta": meta
    }

    return {
        "candidate_id": candidate_id,
        "region_id": region_id,
        "preview_url": meta["preview_url"],
        "original_crop_url": meta["original_crop_url"],
        "reconstructed_crop_url": meta["reconstructed_crop_url"],
        "patch_input_preview": meta.get("patch_input_preview"),
        "alignment_details": meta.get("alignment_details"),
        "status": "awaiting_human_verification"
    }


@app.post("/api/rooms/{room_id}/verify-correction")
def verify_correction(
    room_id: str,
    candidate_id: str = Body(...),
    action: str = Body(...), # "accept" or "reject"
    verification_notes: Optional[str] = Body(None)
):
    """
    Human-in-the-loop validation endpoint:
    - 'accept': Commits the reconstructed/patched image to the face and marks region resolved.
    - 'reject': Discards candidate fix and keeps original.
    """
    proj = room_graph_service.get_or_create_default_project()
    if candidate_id not in pending_verifications:
        raise HTTPException(status_code=404, detail="Candidate verification not found or expired")
        
    candidate = pending_verifications.pop(candidate_id)
    room = proj.rooms.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    face_key = candidate["face_direction"]
    region_id = candidate["region_id"]
    method_type = candidate["method_type"]

    if action.lower() == "accept":
        # Commit updated image
        img_to_save = candidate.get("reconstructed_bgr") if "reconstructed_bgr" in candidate else candidate.get("patched_bgr")
        filepath, rel_url = save_numpy_image(img_to_save, UPLOADS_DIR, prefix=f"{room_id}_{face_key}_verified")
        
        room.faces[face_key] = rel_url
        if face_key in room.faces_metadata:
            room.faces_metadata[face_key]["file_path"] = filepath
            room.faces_metadata[face_key]["last_modified"] = datetime.now().isoformat()

        # Update region status in quality report
        report = room.quality_reports.get(face_key, {})
        for r in report.get("unclear_regions", []):
            if r.get("id") == region_id:
                r["is_user_verified"] = True
                r["resolution_status"] = "resolved"
                r["selected_method"] = method_type

        # Provenance Log
        room_graph_service.log_provenance(
            project_id=proj.id,
            room_id=room_id,
            event_type="human_verification_accepted",
            face_direction=face_key,
            region_id=region_id,
            details={
                "action": "accepted",
                "method": method_type,
                "notes": verification_notes or "User confirmed visual accuracy"
            }
        )

        # Re-run quick quality score
        new_report = quality_service.analyze_image_array(img_to_save, face_direction=face_key)
        room.quality_reports[face_key]["overall_score"] = new_report.overall_score
        room.quality_reports[face_key]["metrics"] = new_report.metrics.model_dump()

        return {
            "status": "accepted_and_committed",
            "face_direction": face_key,
            "new_face_url": rel_url,
            "new_quality_score": new_report.overall_score
        }
    else:
        # User rejected candidate
        report = room.quality_reports.get(face_key, {})
        for r in report.get("unclear_regions", []):
            if r.get("id") == region_id:
                r["is_rejected"] = True
                r["resolution_status"] = "rejected_by_user"

        room_graph_service.log_provenance(
            project_id=proj.id,
            room_id=room_id,
            event_type="human_verification_rejected",
            face_direction=face_key,
            region_id=region_id,
            details={
                "action": "rejected",
                "method": method_type,
                "notes": verification_notes or "User rejected proposed reconstruction"
            }
        )

        return {
            "status": "rejected",
            "face_direction": face_key,
            "region_id": region_id
        }


@app.post("/api/rooms/{room_id}/stitch")
def stitch_room_cubemap(room_id: str):
    """
    Aligns and stitches the 6 directional photographs into:
    1. Seamless 6-face cubemap
    2. High-resolution 360° Equirectangular Photosphere Panorama
    3. Cross-unfolded cubemap preview
    Runs Stage-2 uncertainty analysis on the final stitched photosphere!
    """
    proj = room_graph_service.get_or_create_default_project()
    if room_id not in proj.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = proj.rooms[room_id]
    
    # Load all 6 face images
    face_images: Dict[str, np.ndarray] = {}
    for f in ["north", "south", "east", "west", "up", "down"]:
        url = room.faces.get(f)
        if url:
            rel_path = url.replace("/static/", "")
            full_path = os.path.join(STORAGE_DIR, rel_path)
            if os.path.exists(full_path):
                img = cv2.imread(full_path)
                if img is not None:
                    face_images[f] = img
                    continue
        # If missing face, generate default ambient face
        blank = np.full((1024, 1024, 3), 100, dtype=np.uint8)
        cv2.putText(blank, f"{f.upper()} VIEW", (250, 512), cv2.FONT_HERSHEY_DUPLEX, 1.2, (230, 230, 230), 2)
        face_images[f] = blank

    # 1. Stitch into 360° Equirectangular Sphere (2048 x 1024)
    equirectangular = stitching_service.cubemap_to_equirectangular(face_images, eq_width=2048, eq_height=1024)
    eq_path, eq_url = save_numpy_image(equirectangular, STITCHED_DIR, prefix=f"{room_id}_equirectangular")

    # 2. Generate Cross Cubemap layout (1536 x 2048)
    cross_layout = stitching_service.create_cross_cubemap_layout(face_images)
    cross_path, cross_url = save_numpy_image(cross_layout, STITCHED_DIR, prefix=f"{room_id}_cross")

    room.stitched_equirectangular_url = eq_url
    room.cross_cubemap_url = cross_url
    room.stitching_status = "stitched"

    # 3. Stage-2 Uncertainty & Seam Detection
    stage2_report = quality_service.analyze_stitched_sphere(equirectangular)

    # Log provenance
    room_graph_service.log_provenance(
        project_id=proj.id,
        room_id=room_id,
        event_type="cubemap_stitched_and_verified",
        details={
            "equirectangular_url": eq_url,
            "cross_url": cross_url,
            "seam_continuity_score": stage2_report.get("seam_continuity_score", 95.0)
        }
    )

    return {
        "status": "success",
        "room_id": room_id,
        "stitched_equirectangular_url": eq_url,
        "cross_cubemap_url": cross_url,
        "stage2_quality_report": stage2_report
    }


@app.post("/api/rooms/{room_id}/hotspots")
def create_hotspot(
    room_id: str,
    target_room_id: str = Body(...),
    label: str = Body("Doorway to Room"),
    yaw_deg: float = Body(0.0),
    pitch_deg: float = Body(0.0),
    icon_type: str = Body("door")
):
    """
    Creates an interactive 3D doorway / portal link inside the 360 viewer.
    """
    proj = room_graph_service.get_or_create_default_project()
    hotspot = room_graph_service.add_hotspot(
        project_id=proj.id,
        source_room_id=room_id,
        target_room_id=target_room_id,
        label=label,
        yaw_deg=yaw_deg,
        pitch_deg=pitch_deg,
        icon_type=icon_type
    )
    return hotspot.model_dump()


@app.delete("/api/rooms/{room_id}/hotspots/{hotspot_id}")
def delete_hotspot(room_id: str, hotspot_id: str):
    proj = room_graph_service.get_or_create_default_project()
    room = proj.rooms.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room.hotspots = [h for h in room.hotspots if h.id != hotspot_id]
    return {"status": "deleted", "hotspot_id": hotspot_id}


@app.post("/api/rooms/{room_id}/signoff")
def expert_signoff(
    room_id: str,
    expert_name: str = Body(...),
    expert_notes: str = Body(...),
    is_approved: bool = Body(True)
):
    """
    Heritage Mode: Qualified expert validation sign-off and historical truth certification.
    """
    proj = room_graph_service.get_or_create_default_project()
    room = proj.rooms.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room.is_expert_verified = is_approved
    room.expert_notes = f"Signed by {expert_name}: {expert_notes}"

    room_graph_service.log_provenance(
        project_id=proj.id,
        room_id=room_id,
        event_type="expert_signoff",
        author=expert_name,
        details={
            "approved": is_approved,
            "expert_name": expert_name,
            "notes": expert_notes
        }
    )

    return {"status": "success", "is_expert_verified": room.is_expert_verified, "expert_notes": room.expert_notes}


@app.post("/api/sample-datasets/load")
def load_sample_dataset(dataset_type: str = Body("heritage", embed=True)):
    """
    Loads pre-packaged 6-directional demo datasets (Heritage Sanctuary or Modern Loft)
    with realistic simulated defects for instant 1-click test drives!
    """
    proj = room_graph_service.get_or_create_default_project()
    
    # Generate 6 faces
    faces = SampleDataService.generate_procedural_room(dataset_type, size=1024)
    
    room_name = "Ancient Temple Sanctuary" if dataset_type == "heritage" else "Modern City Loft"
    room_category = "temple" if dataset_type == "heritage" else "living_room"
    
    # Create or update room
    room = RoomNode(
        id=f"demo-{dataset_type}",
        name=room_name,
        category=room_category
    )
    
    # Save face images and run initial quality detection
    for direction, img_bgr in faces.items():
        filepath, rel_url = save_numpy_image(img_bgr, UPLOADS_DIR, prefix=f"demo_{dataset_type}_{direction}")
        room.faces[direction] = rel_url
        room.faces_metadata[direction] = {
            "file_path": filepath,
            "original_filename": f"demo_{direction}.jpg",
            "uploaded_at": datetime.now().isoformat(),
            "exif": {
                "has_exif": True,
                "camera_make": "Sony Alpha" if dataset_type == "heritage" else "Apple",
                "camera_model": "ILCE-7RM4" if dataset_type == "heritage" else "iPhone 15 Pro",
                "focal_length_mm": 24.0,
                "f_number": 2.8,
                "iso": 100,
                "exposure_time": "1/60s"
            }
        }
        # Run quality scan
        report = quality_service.analyze_image_array(img_bgr, face_direction=direction)
        room.quality_reports[direction] = report.model_dump()

    # Pre-stitch for immediate viewing
    equirect = stitching_service.cubemap_to_equirectangular(faces, eq_width=2048, eq_height=1024)
    eq_path, eq_url = save_numpy_image(equirect, STITCHED_DIR, prefix=f"demo_{dataset_type}_equirect")
    cross = stitching_service.create_cross_cubemap_layout(faces)
    _, cross_url = save_numpy_image(cross, STITCHED_DIR, prefix=f"demo_{dataset_type}_cross")

    room.stitched_equirectangular_url = eq_url
    room.cross_cubemap_url = cross_url
    room.stitching_status = "stitched"

    # Add second room if loading heritage dataset to showcase multi-room connection
    if dataset_type == "heritage":
        loft_faces = SampleDataService.generate_procedural_room("modern", size=1024)
        loft_room = RoomNode(
            id="demo-modern-adjacent",
            name="Adjacent Exhibition Gallery",
            category="hall"
        )
        for direction, img_bgr in loft_faces.items():
            _, rel_url = save_numpy_image(img_bgr, UPLOADS_DIR, prefix=f"demo_adj_{direction}")
            loft_room.faces[direction] = rel_url
        
        loft_eq = stitching_service.cubemap_to_equirectangular(loft_faces, eq_width=2048, eq_height=1024)
        _, loft_eq_url = save_numpy_image(loft_eq, STITCHED_DIR, prefix="demo_adj_eq")
        loft_room.stitched_equirectangular_url = loft_eq_url
        loft_room.stitching_status = "stitched"
        proj.rooms[loft_room.id] = loft_room

        # Create interactive 3D Doorway Hotspot from Sanctuary -> Exhibition Gallery
        room.hotspots.append(
            HotspotPortal(
                source_room_id=room.id,
                target_room_id=loft_room.id,
                label="Enter Exhibition Gallery",
                description="Click to walk through ancient portal",
                yaw_deg=180.0, # Facing South entrance
                pitch_deg=-5.0,
                icon_type="door"
            )
        )
        # Reverse portal from Exhibition Gallery -> Sanctuary
        loft_room.hotspots.append(
            HotspotPortal(
                source_room_id=loft_room.id,
                target_room_id=room.id,
                label="Return to Temple Sanctuary",
                description="Click to return",
                yaw_deg=0.0,
                pitch_deg=0.0,
                icon_type="door"
            )
        )

    proj.rooms[room.id] = room
    proj.initial_room_id = room.id
    
    room_graph_service.log_provenance(
        project_id=proj.id,
        room_id=room.id,
        event_type="sample_dataset_loaded",
        details={"dataset_type": dataset_type, "rooms_count": len(proj.rooms)}
    )

    return {
        "status": "success",
        "loaded_room_id": room.id,
        "project": proj.model_dump()
    }


@app.get("/api/ml/models")
def get_ml_models():
    return ml_registry.list_available_models()


@app.post("/api/ml/set-active")
def set_active_model(
    detector: Optional[str] = Body(None),
    reconstructor: Optional[str] = Body(None)
):
    if detector:
        ml_registry.active_quality_detector_key = detector
    if reconstructor:
        ml_registry.active_reconstructor_key = reconstructor
    return {
        "status": "success",
        "active_models": {
            "quality_detector": ml_registry.active_quality_detector_key,
            "reconstructor": ml_registry.active_reconstructor_key
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
