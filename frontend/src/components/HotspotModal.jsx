import React, { useState } from 'react';
import { DoorOpen, X, Compass, ArrowRight } from 'lucide-react';

export default function HotspotModal({
  currentRoomId,
  allRooms = [],
  clickCoords,
  onClose,
  onSubmit
}) {
  const destinationRooms = allRooms.filter((r) => r.id !== currentRoomId);
  const [targetRoomId, setTargetRoomId] = useState(destinationRooms[0]?.id || '');
  const [label, setLabel] = useState('');
  const [iconType, setIconType] = useState('door');

  const selectedTargetRoom = allRooms.find((r) => r.id === targetRoomId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetRoomId) return;

    const finalLabel = label.trim() || `Enter ${selectedTargetRoom?.name || 'Room'}`;
    onSubmit({
      target_room_id: targetRoomId,
      label: finalLabel,
      yaw_deg: clickCoords?.yaw_deg || 0,
      pitch_deg: clickCoords?.pitch_deg || 0,
      icon_type: iconType
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-brand-400" />
            Place 3D Doorway Portal
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Destination Room
            </label>
            <select
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              {destinationRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Portal Label
            </label>
            <input
              type="text"
              placeholder={`e.g. Enter ${selectedTargetRoom?.name || 'Living Room'}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-400" />
              <span>3D Spherical Angle</span>
            </span>
            <span className="font-mono font-semibold text-slate-200">
              Yaw: {clickCoords?.yaw_deg}° • Pitch: {clickCoords?.pitch_deg}°
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Create Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
