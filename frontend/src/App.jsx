import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CaptureGrid from './components/CaptureGrid';
import QualityInspector from './components/QualityInspector';
import CorrectionModal from './components/CorrectionModal';
import PanoramaViewer360 from './components/PanoramaViewer360';
import HotspotModal from './components/HotspotModal';
import PropertyGraphMap from './components/PropertyGraphMap';
import ProvenanceLedger from './components/ProvenanceLedger';
import MLPlayground from './components/MLPlayground';

import { 
  fetchProject, 
  setProjectMode, 
  createRoom, 
  uploadFace, 
  runQualityScan, 
  addManualBox,
  triggerAiReconstruction,
  triggerPhotoPatch,
  verifyCorrection,
  stitchRoom,
  createHotspot,
  loadSampleDataset,
  expertSignoff
} from './api';

import { 
  Globe, 
  Sparkles, 
  Layers, 
  Sliders, 
  AlertTriangle, 
  ShieldCheck, 
  Compass, 
  RotateCw,
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [project, setProject] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [selectedFace, setSelectedFace] = useState('north');
  const [inspectingFace, setInspectingFace] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null); // { faceDirection, bbox }
  const [hotspotClickCoords, setHotspotClickCoords] = useState(null);
  
  // Modals & Panels
  const [showGraph, setShowGraph] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [showMlPlayground, setShowMlPlayground] = useState(false);
  const [isStitching, setIsStitching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active room data
  const activeRoom = project?.rooms?.[activeRoomId];
  const allRoomsList = Object.values(project?.rooms || {});

  // Initial load
  useEffect(() => {
    loadInitialProject();
  }, []);

  const loadInitialProject = async () => {
    try {
      setIsLoading(true);
      const proj = await fetchProject();
      setProject(proj);
      if (proj.initial_room_id && proj.rooms[proj.initial_room_id]) {
        setActiveRoomId(proj.initial_room_id);
      } else {
        const firstRoomId = Object.keys(proj.rooms || {})[0];
        if (firstRoomId) setActiveRoomId(firstRoomId);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
    setSelectedFace('north');
  };

  const handleCreateRoom = async (name, category) => {
    try {
      const newRoom = await createRoom(name, category);
      await loadInitialProject();
      setActiveRoomId(newRoom.id);
    } catch (err) {
      alert(`Failed to create room: ${err.message}`);
    }
  };

  const handleToggleMode = async () => {
    const nextMode = project?.project_type === 'heritage' ? 'real_estate' : 'heritage';
    try {
      await setProjectMode(nextMode);
      setProject((prev) => ({ ...prev, project_type: nextMode }));
    } catch (err) {
      alert(`Failed to switch mode: ${err.message}`);
    }
  };

  const handleUploadFace = async (direction, file) => {
    if (!activeRoomId) return;
    try {
      const res = await uploadFace(activeRoomId, direction, file);
      // Refresh project state
      const updatedProj = await fetchProject();
      setProject(updatedProj);
      setSelectedFace(direction);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  const handleInspectFace = (direction) => {
    setInspectingFace(direction);
  };

  const handleAddManualBox = async (faceDirection, bboxData) => {
    if (!activeRoomId) return;
    try {
      await addManualBox(activeRoomId, faceDirection, bboxData);
      const updatedProj = await fetchProject();
      setProject(updatedProj);
    } catch (err) {
      alert(`Failed to add bounding box: ${err.message}`);
    }
  };

  const handleAcceptAllAsClean = async (faceDirection) => {
    // If user verifies the face as clean
    setInspectingFace(null);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
  };

  const handleOpenCorrectionModal = (faceDirection, bbox) => {
    setCorrectionTarget({ faceDirection, bbox });
  };

  const handleTriggerAiReconstruction = async (faceDirection, regionId, method) => {
    return await triggerAiReconstruction(activeRoomId, faceDirection, regionId, method);
  };

  const handleTriggerPhotoPatch = async (faceDirection, regionId, patchFile) => {
    return await triggerPhotoPatch(activeRoomId, faceDirection, regionId, patchFile);
  };

  const handleVerifyCorrection = async (candidateId, action, notes) => {
    const res = await verifyCorrection(activeRoomId, candidateId, action, notes);
    const updatedProj = await fetchProject();
    setProject(updatedProj);
    setCorrectionTarget(null);
    return res;
  };

  const handleStitch = async () => {
    if (!activeRoomId) return;
    setIsStitching(true);
    try {
      const res = await stitchRoom(activeRoomId);
      const updatedProj = await fetchProject();
      setProject(updatedProj);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    } catch (err) {
      alert(`Stitching error: ${err.message}`);
    } finally {
      setIsStitching(false);
    }
  };

  const handleLoadDemo = async (datasetType) => {
    setIsLoading(true);
    try {
      const res = await loadSampleDataset(datasetType);
      setProject(res.project);
      setActiveRoomId(res.loaded_room_id);
      confetti({ particleCount: 90, spread: 60 });
    } catch (err) {
      alert(`Demo load failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHotspotSubmit = async (hotspotData) => {
    try {
      await createHotspot(activeRoomId, hotspotData);
      const updatedProj = await fetchProject();
      setProject(updatedProj);
      confetti({ particleCount: 60, spread: 50 });
    } catch (err) {
      alert(`Hotspot creation error: ${err.message}`);
    }
  };

  const handleExpertSignoff = async (roomId, name, notes, approved) => {
    await expertSignoff(roomId, name, notes, approved);
    const updatedProj = await fetchProject();
    setProject(updatedProj);
  };

  if (isLoading && !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-brand-400" />
        <span className="text-sm font-semibold tracking-wide">Loading Immersive Environment...</span>
      </div>
    );
  }

  const isStitched = activeRoom?.stitching_status === 'stitched' && !!activeRoom?.stitched_equirectangular_url;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-brand-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        project={project}
        activeRoomId={activeRoomId}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
        projectMode={project?.project_type || 'heritage'}
        onToggleMode={handleToggleMode}
        onStitch={handleStitch}
        isStitching={isStitching}
        onLoadDemo={handleLoadDemo}
        onOpenProvenance={() => setShowProvenance(true)}
        onOpenGraph={() => setShowGraph(true)}
        onOpenMlPlayground={() => setShowMlPlayground(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* If room is stitched, display the 3D Panoramic Viewer as Primary Viewport */}
        {isStitched ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            <PanoramaViewer360
              equirectangularUrl={activeRoom.stitched_equirectangular_url}
              crossCubemapUrl={activeRoom.cross_cubemap_url}
              roomName={activeRoom.name}
              hotspots={activeRoom.hotspots || []}
              onNavigateRoom={(targetId) => handleSelectRoom(targetId)}
              onAddHotspotRequest={(coords) => setHotspotClickCoords(coords)}
              allRooms={allRoomsList}
            />

            {/* Second-Stage Refinement / Directional Face Re-inspection Workbench */}
            <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-400" />
                    Second-Stage Refinement & Underlying 6-Face Capture Grid
                  </h3>
                  <p className="text-xs text-slate-400">
                    Iterative cycle: <strong className="text-slate-200">detect → verify → correct → verify → refine</strong>. You can inspect or patch any cubemap face at any time.
                  </p>
                </div>
              </div>

              <CaptureGrid
                activeRoom={activeRoom}
                onUploadFace={handleUploadFace}
                onInspectFace={handleInspectFace}
                selectedFace={selectedFace}
                onSelectFace={setSelectedFace}
              />
            </div>
          </div>
        ) : (
          /* Unstitched Capture View */
          <div className="space-y-6">
            <CaptureGrid
              activeRoom={activeRoom}
              onUploadFace={handleUploadFace}
              onInspectFace={handleInspectFace}
              selectedFace={selectedFace}
              onSelectFace={setSelectedFace}
            />

            {/* Prompt to Stitch when ready */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-950/40 via-slate-900/60 to-indigo-950/40 border border-brand-500/20 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  Ready to Reconstruct 3D Photosphere?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Once your 6 directional photos (N, S, E, W, Up, Down) are verified, click below to stitch into an interactive 360° sphere view.
                </p>
              </div>

              <button
                onClick={handleStitch}
                disabled={isStitching}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isStitching ? <RotateCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>Stitch 360° Photosphere Now</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Quality Inspection Canvas Workbench */}
      {inspectingFace && (
        <QualityInspector
          faceDirection={inspectingFace}
          faceUrl={activeRoom?.faces?.[inspectingFace]}
          qualityReport={activeRoom?.quality_reports?.[inspectingFace]}
          onClose={() => setInspectingFace(null)}
          onOpenCorrectionModal={(faceDir, bbox) => handleOpenCorrectionModal(faceDir, bbox)}
          onAddManualBox={handleAddManualBox}
          onAcceptAllAsClean={handleAcceptAllAsClean}
        />
      )}

      {/* Human-in-the-Loop Correction Workbench Modal */}
      {correctionTarget && (
        <CorrectionModal
          faceDirection={correctionTarget.faceDirection}
          bbox={correctionTarget.bbox}
          onClose={() => setCorrectionTarget(null)}
          onTriggerAiReconstruction={handleTriggerAiReconstruction}
          onTriggerPhotoPatch={handleTriggerPhotoPatch}
          onVerifyCorrection={handleVerifyCorrection}
        />
      )}

      {/* Hotspot Placement Modal */}
      {hotspotClickCoords && (
        <HotspotModal
          currentRoomId={activeRoomId}
          allRooms={allRoomsList}
          clickCoords={hotspotClickCoords}
          onClose={() => setHotspotClickCoords(null)}
          onSubmit={handleAddHotspotSubmit}
        />
      )}

      {/* Property Environment Graph Minimap */}
      {showGraph && (
        <PropertyGraphMap
          project={project}
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          onClose={() => setShowGraph(false)}
        />
      )}

      {/* Provenance Audit Ledger Modal */}
      {showProvenance && (
        <ProvenanceLedger
          project={project}
          activeRoomId={activeRoomId}
          onClose={() => setShowProvenance(false)}
          onExpertSignoff={handleExpertSignoff}
        />
      )}

      {/* ML Engine Extensibility Dev Panel */}
      {showMlPlayground && (
        <MLPlayground onClose={() => setShowMlPlayground(false)} />
      )}

    </div>
  );
}
