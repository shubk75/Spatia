"""
Room Graph & Property Navigation Service.
Manages:
- Connected rooms graph (nodes & doorway edges)
- 3D spatial hotspot coordinates in spherical space (yaw, pitch, radius)
- Heritage preservation provenance audit history ledger
"""
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class HotspotPortal(BaseModel):
    """Represents a clickable 3D doorway / portal linking to another room."""
    id: str = Field(default_factory=lambda: f"hs-{uuid.uuid4().hex[:8]}")
    source_room_id: str
    target_room_id: str
    label: str = Field(default="Doorway to Room")
    description: str = Field(default="Click to enter")
    yaw_deg: float = Field(default=0.0, description="Horizontal angle in degrees [-180 to +180]")
    pitch_deg: float = Field(default=0.0, description="Vertical angle in degrees [-90 to +90]")
    icon_type: str = Field(default="door", description="door, stairs, arrow, info, portal")
    transition_effect: str = Field(default="fade_zoom", description="fade_zoom, slide, instant")


class ProvenanceEvent(BaseModel):
    """Audit log entry for Heritage Preservation / Real Estate verification."""
    id: str = Field(default_factory=lambda: f"prov-{uuid.uuid4().hex[:8]}")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    event_type: str = Field(..., description="capture_upload, quality_scan, user_verification, ai_reconstruction, photo_patch, expert_signoff")
    room_id: str
    face_direction: Optional[str] = None
    region_id: Optional[str] = None
    author: str = Field(default="User (Operator)")
    details: Dict[str, Any] = Field(default_factory=dict)
    provenance_hash: Optional[str] = None


class RoomNode(BaseModel):
    """A single reconstructed panoramic environment (one room / viewpoint)."""
    id: str = Field(default_factory=lambda: f"room-{uuid.uuid4().hex[:6]}")
    name: str = Field(default="New Room")
    category: str = Field(default="living_room", description="living_room, bedroom, kitchen, hall, temple, outdoor, other")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    # Image Paths / URLs for the 6 faces
    faces: Dict[str, Optional[str]] = Field(
        default_factory=lambda: {
            "north": None,
            "south": None,
            "east": None,
            "west": None,
            "up": None,
            "down": None
        }
    )
    
    # Metadata for each face (EXIF, capture time)
    faces_metadata: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    # Unclear regions detected per face
    quality_reports: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    # Stitched 360 outputs
    stitched_equirectangular_url: Optional[str] = None
    cross_cubemap_url: Optional[str] = None
    stitching_status: str = Field(default="unstitched", description="unstitched, processing, stitched, refined")
    
    # 3D Doorway Hotspots in this room
    hotspots: List[HotspotPortal] = Field(default_factory=list)
    
    # Verification and expert sign-off
    is_expert_verified: bool = False
    expert_notes: str = ""


class PropertyProject(BaseModel):
    """Top-level property project containing multiple connected rooms."""
    id: str = Field(default_factory=lambda: f"proj-{uuid.uuid4().hex[:8]}")
    name: str = Field(default="Immersive Reconstruction Project")
    description: str = Field(default="Multi-room AI-assisted 360° environment")
    project_type: str = Field(default="heritage", description="heritage or real_estate")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    initial_room_id: Optional[str] = None
    rooms: Dict[str, RoomNode] = Field(default_factory=dict)
    provenance_log: List[ProvenanceEvent] = Field(default_factory=list)


class RoomGraphService:
    def __init__(self):
        self.projects: Dict[str, PropertyProject] = {}
        self.active_project_id: Optional[str] = None

    def get_or_create_default_project(self) -> PropertyProject:
        if not self.projects:
            proj = PropertyProject(
                id="default-project",
                name="Heritage & Architecture Showcase",
                description="AI-Assisted Immersive Reconstruction Tour"
            )
            # Create default room
            room1 = RoomNode(
                id="room-main",
                name="Living Grand Hall",
                category="hall"
            )
            proj.rooms[room1.id] = room1
            proj.initial_room_id = room1.id
            self.projects[proj.id] = proj
            self.active_project_id = proj.id
            
            # Add initial provenance
            self.log_provenance(
                project_id=proj.id,
                room_id=room1.id,
                event_type="project_created",
                details={"name": proj.name}
            )
            
        return self.projects[self.active_project_id]

    def add_room(self, project_id: str, name: str, category: str = "living_room") -> RoomNode:
        proj = self.projects.get(project_id)
        if not proj:
            raise KeyError("Project not found")
            
        new_room = RoomNode(
            name=name,
            category=category
        )
        proj.rooms[new_room.id] = new_room
        if not proj.initial_room_id:
            proj.initial_room_id = new_room.id
            
        self.log_provenance(
            project_id=project_id,
            room_id=new_room.id,
            event_type="room_added",
            details={"room_name": name, "category": category}
        )
        return new_room

    def add_hotspot(
        self,
        project_id: str,
        source_room_id: str,
        target_room_id: str,
        label: str,
        yaw_deg: float,
        pitch_deg: float,
        icon_type: str = "door"
    ) -> HotspotPortal:
        proj = self.projects.get(project_id)
        if not proj or source_room_id not in proj.rooms or target_room_id not in proj.rooms:
            raise ValueError("Invalid project or room IDs")
            
        hotspot = HotspotPortal(
            source_room_id=source_room_id,
            target_room_id=target_room_id,
            label=label,
            yaw_deg=yaw_deg,
            pitch_deg=pitch_deg,
            icon_type=icon_type
        )
        
        proj.rooms[source_room_id].hotspots.append(hotspot)
        self.log_provenance(
            project_id=project_id,
            room_id=source_room_id,
            event_type="hotspot_linked",
            details={
                "target_room_name": proj.rooms[target_room_id].name,
                "yaw": yaw_deg,
                "pitch": pitch_deg
            }
        )
        return hotspot

    def log_provenance(
        self,
        project_id: str,
        room_id: str,
        event_type: str,
        face_direction: Optional[str] = None,
        region_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        author: str = "System / User"
    ) -> ProvenanceEvent:
        proj = self.projects.get(project_id)
        if not proj:
            return None
            
        event = ProvenanceEvent(
            event_type=event_type,
            room_id=room_id,
            face_direction=face_direction,
            region_id=region_id,
            author=author,
            details=details or {}
        )
        proj.provenance_log.append(event)
        return event


# Global singleton
room_graph_service = RoomGraphService()
