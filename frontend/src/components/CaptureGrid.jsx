import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Camera, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Compass, 
  Eye, 
  Sliders, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const DIRECTIONS = [
  { key: 'north', label: 'North', angle: '0°', icon: 'N', desc: 'Front / Facing 0°' },
  { key: 'east', label: 'East', angle: '90°', icon: 'E', desc: 'Right / Facing 90°' },
  { key: 'south', label: 'South', angle: '180°', icon: 'S', desc: 'Back / Facing 180°' },
  { key: 'west', label: 'West', angle: '270°', icon: 'W', desc: 'Left / Facing 270°' },
  { key: 'up', label: 'Up / Ceiling', angle: '+90° Pitch', icon: 'U', desc: 'Ceiling / Sky' },
  { key: 'down', label: 'Down / Floor', angle: '-90° Pitch', icon: 'D', desc: 'Floor / Ground' },
];

export default function CaptureGrid({
  activeRoom,
  onUploadFace,
  onInspectFace,
  selectedFace,
  onSelectFace
}) {
  const [selectedExif, setSelectedExif] = useState(null);
  const fileInputRefs = useRef({});

  const handleFileChange = (direction, e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFace(direction, file);
    }
  };

  const getFaceStatus = (dirKey) => {
    const url = activeRoom?.faces?.[dirKey];
    const report = activeRoom?.quality_reports?.[dirKey];
    
    if (!url) return { label: 'Empty', color: 'text-slate-500 bg-slate-800/40 border-slate-700/50' };
    
    const issues = report?.unclear_regions || [];
    const unresolved = issues.filter(i => !i.is_user_verified && !i.is_rejected);
    
    if (unresolved.length > 0) {
      return { 
        label: `${unresolved.length} Unclear Area${unresolved.length > 1 ? 's' : ''}`, 
        color: 'text-amber-300 bg-amber-950/40 border-amber-500/30' 
      };
    }
    
    return { 
      label: 'Verified & Ready', 
      color: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30' 
    };
  };

  return (
    <div className="space-y-4">
      {/* Header bar with capture tips and directional compass summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-400" />
            6-Directional Capture Setup
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture 6 images from approximately one center position (North, South, East, West, Up, Down).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-300 font-medium px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse"></span>
            <span>
              Captured: {Object.values(activeRoom?.faces || {}).filter(Boolean).length} / 6
            </span>
          </div>
        </div>
      </div>

      {/* 6 Grid Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DIRECTIONS.map((dir) => {
          const faceUrl = activeRoom?.faces?.[dir.key];
          const faceMeta = activeRoom?.faces_metadata?.[dir.key];
          const report = activeRoom?.quality_reports?.[dir.key];
          const status = getFaceStatus(dir.key);
          const isSelected = selectedFace === dir.key;
          const issues = report?.unclear_regions || [];
          const unresolvedIssues = issues.filter(i => !i.is_user_verified && !i.is_rejected);

          return (
            <div
              key={dir.key}
              onClick={() => onSelectFace(dir.key)}
              className={`relative rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                isSelected 
                  ? 'border-brand-500 bg-slate-900/90 shadow-xl shadow-brand-500/10 ring-2 ring-brand-500/30'
                  : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {/* Card Top Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center">
                    {dir.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white leading-tight">{dir.label}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{dir.angle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Status Badge */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                    {status.label}
                  </span>

                  {/* EXIF button */}
                  {faceMeta?.exif && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExif({ direction: dir.label, meta: faceMeta.exif });
                      }}
                      title="View EXIF Metadata"
                      className="p-1 rounded-md text-slate-400 hover:text-brand-300 hover:bg-slate-800 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Image Preview / Upload Area */}
              <div className="relative aspect-square w-full bg-slate-950/60 flex items-center justify-center overflow-hidden group">
                {faceUrl ? (
                  <>
                    <img
                      src={faceUrl}
                      alt={dir.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Quality Score Overlay */}
                    {report?.overall_score !== undefined && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${report.overall_score >= 80 ? 'bg-emerald-400' : report.overall_score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span>Quality: {report.overall_score}%</span>
                      </div>
                    )}

                    {/* Unclear Region Indicator Pills */}
                    {unresolvedIssues.length > 0 && (
                      <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-xl bg-amber-950/85 backdrop-blur-md border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between animate-pulse-slow">
                        <span className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{unresolvedIssues.length} problem region{unresolvedIssues.length > 1 ? 's' : ''} detected</span>
                        </span>
                        <span className="font-semibold text-amber-300 underline text-[10px]">Inspect</span>
                      </div>
                    )}

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity flex items-center justify-center gap-2 p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectFace(dir.key);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg flex items-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect & Fix
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[dir.key]?.click();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Replace
                      </button>
                    </div>
                  </>
                ) : (
                  /* Empty state */
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRefs.current[dir.key]?.click();
                    }}
                    className="flex flex-col items-center justify-center p-6 text-center text-slate-400 hover:text-brand-300 transition-colors w-full h-full border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-xl m-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-brand-400 transition-colors" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">Upload {dir.label} Photo</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{dir.desc}</span>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => (fileInputRefs.current[dir.key] = el)}
                  onChange={(e) => handleFileChange(dir.key, e)}
                  className="hidden"
                />
              </div>

              {/* Card Footer actions */}
              <div className="p-3 bg-slate-900/60 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (faceUrl) {
                      onInspectFace(dir.key);
                    } else {
                      fileInputRefs.current[dir.key]?.click();
                    }
                  }}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center justify-center gap-1.5"
                >
                  {faceUrl ? (
                    <>
                      <Sliders className="w-3.5 h-3.5 text-brand-400" />
                      <span>Verify & Correct</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 ml-auto" />
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EXIF Metadata Modal */}
      {selectedExif && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-400" />
                EXIF Metadata — {selectedExif.direction}
              </h3>
              <button
                onClick={() => setSelectedExif(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-500">Camera Make/Model</span>
                <span className="font-semibold">{selectedExif.meta.camera_make || 'Unknown'} {selectedExif.meta.camera_model || ''}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-500">Focal Length</span>
                <span className="font-semibold">{selectedExif.meta.focal_length_mm ? `${selectedExif.meta.focal_length_mm} mm` : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-500">Aperture / Exposure</span>
                <span className="font-semibold">{selectedExif.meta.f_number ? `f/${selectedExif.meta.f_number}` : 'N/A'} • {selectedExif.meta.exposure_time || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-500">ISO Rating</span>
                <span className="font-semibold">{selectedExif.meta.iso || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                <span className="text-slate-500">Original Resolution</span>
                <span className="font-semibold">{selectedExif.meta.width} × {selectedExif.meta.height} px</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-300">
                <span className="text-slate-500">Orientation Tag</span>
                <span className="font-semibold">{selectedExif.meta.orientation_label || 'Normal (0°)'}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedExif(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
