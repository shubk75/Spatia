import React from 'react';
import { 
  Compass, 
  X, 
  Layers, 
  DoorOpen, 
  ArrowRight, 
  CheckCircle2, 
  Building, 
  Landmark,
  Plus
} from 'lucide-react';

export default function PropertyGraphMap({
  project,
  activeRoomId,
  onSelectRoom,
  onClose
}) {
  const rooms = Object.values(project?.rooms || {});

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-modal max-w-3xl w-full rounded-3xl p-6 shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Property Environment Graph
              </h2>
              <p className="text-xs text-slate-400">
                Connected network of fixed-position panoramic rooms linked via 3D doorway portals.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Graph Nodes Grid */}
        <div className="py-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const has360 = room.stitching_status === 'stitched';
              const outboundHotspots = room.hotspots || [];

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    onSelectRoom(room.id);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'border-brand-500 bg-brand-950/30 shadow-xl ring-2 ring-brand-500/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {room.category}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white">
                          Active View
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{room.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      {has360 ? '360° Photosphere Ready' : 'Capture in progress'}
                    </p>
                  </div>

                  {/* Outbound Portals */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Connected Doorways ({outboundHotspots.length})
                    </span>
                    {outboundHotspots.length > 0 ? (
                      outboundHotspots.map((hs) => {
                        const targetName = project?.rooms?.[hs.target_room_id]?.name || 'Target Room';
                        return (
                          <div key={hs.id} className="text-xs text-brand-300 flex items-center gap-1.5 font-medium">
                            <DoorOpen className="w-3 h-3 text-brand-400 flex-shrink-0" />
                            <span className="truncate">{hs.label} ({targetName})</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No doorway portals placed yet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close Map
          </button>
        </div>

      </div>
    </div>
  );
}
