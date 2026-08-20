import React, { useState } from 'react';
import { 
  Globe, 
  Layers, 
  Sparkles, 
  Building, 
  Landmark, 
  Plus, 
  Compass, 
  History, 
  Cpu, 
  CheckCircle2, 
  RotateCw,
  FolderOpen,
  Share2,
  ChevronDown
} from 'lucide-react';

export default function Navbar({
  project,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  projectMode,
  onToggleMode,
  onStitch,
  isStitching,
  onLoadDemo,
  onOpenProvenance,
  onOpenGraph,
  onOpenMlPlayground
}) {
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCat, setNewRoomCat] = useState('living_room');

  const roomsList = Object.values(project?.rooms || {});
  const activeRoom = project?.rooms?.[activeRoomId];

  const handleCreateRoomSubmit = (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName.trim(), newRoomCat);
      setNewRoomName('');
      setShowNewRoomModal(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
            <Globe className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
                AURA 3D
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                AI + Human-in-Loop
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              {projectMode === 'heritage' ? 'Digital Heritage Preservation' : 'Real Estate Virtual Tour'}
            </p>
          </div>
        </div>

        {/* Room Navigation & Switcher */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
          <div className="flex items-center gap-1.5 px-2 text-slate-400 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden md:inline">Room:</span>
          </div>

          <select
            value={activeRoomId || ''}
            onChange={(e) => onSelectRoom(e.target.value)}
            aria-label="Select active room"
            className="bg-slate-800 text-slate-100 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            {roomsList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.stitching_status === 'stitched' ? '360 Ready' : 'Capture'})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewRoomModal(true)}
            title="Add another room to property"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors border border-slate-700/80"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Mode Switcher */}
          <button
            onClick={onToggleMode}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              projectMode === 'heritage'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40 shadow-sm shadow-amber-500/10'
                : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40 shadow-sm shadow-indigo-500/10'
            }`}
            title="Toggle between Heritage Preservation and Real Estate Mode"
          >
            {projectMode === 'heritage' ? (
              <>
                <Landmark className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Heritage Archive</span>
              </>
            ) : (
              <>
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Real Estate Tour</span>
              </>
            )}
          </button>

          {/* Demo Datasets dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden md:inline">Demo Datasets</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Instant 1-Click Test Drives
                </div>
                <button
                  onClick={() => {
                    onLoadDemo('heritage');
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-start gap-2.5 transition-colors"
                >
                  <Landmark className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-300">Temple Sanctuary</div>
                    <div className="text-[11px] text-slate-400">6 faces + simulated fresco blur & entrance highlight</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadDemo('modern');
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-start gap-2.5 transition-colors"
                >
                  <Building className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-brand-300">Modern City Loft</div>
                    <div className="text-[11px] text-slate-400">Skyline windows, living room, dining, bookshelves</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Property Graph & Minimap */}
          <button
            onClick={onOpenGraph}
            title="Property Navigation Map"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Heritage Provenance Audit Log */}
          <button
            onClick={onOpenProvenance}
            title="Provenance Audit Ledger"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors relative"
          >
            <History className="w-4 h-4 text-amber-400" />
            {project?.provenance_log?.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {project.provenance_log.length}
              </span>
            )}
          </button>

          {/* ML Engine Extensibility Dev Panel */}
          <button
            onClick={onOpenMlPlayground}
            title="ML Engine & Custom Model Registry"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <Cpu className="w-4 h-4 text-purple-400" />
          </button>

          {/* Primary Action: Stitch Cubemap & 360 Sphere */}
          <button
            onClick={onStitch}
            disabled={isStitching}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-brand-500/25 border border-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStitching ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-brand-200" />
                <span>Stitching 360°...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-brand-200" />
                <span>Stitch 360° Sphere</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-400" />
              Add Connected Room
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add another environment node to link via 3D doorway portals in your property graph.
            </p>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bedroom, Balcony, Art Studio..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newRoomCat}
                  onChange={(e) => setNewRoomCat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="living_room">Living Room</option>
                  <option value="bedroom">Bedroom</option>
                  <option value="kitchen">Kitchen / Dining</option>
                  <option value="hall">Gallery / Corridor</option>
                  <option value="temple">Historical Shrine / Temple</option>
                  <option value="outdoor">Balcony / Courtyard</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
