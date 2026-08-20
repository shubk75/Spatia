import React, { useRef, useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  Camera, 
  Check, 
  X, 
  Plus, 
  ShieldCheck, 
  Eye, 
  Layers, 
  ArrowLeft,
  Wand2,
  Info,
  Maximize2
} from 'lucide-react';

export default function QualityInspector({
  faceDirection,
  faceUrl,
  qualityReport,
  onClose,
  onOpenCorrectionModal,
  onAddManualBox,
  onAcceptAllAsClean
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDraw, setCurrentDraw] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const regions = qualityReport?.unclear_regions || [];
  const metrics = qualityReport?.metrics;

  // Redraw canvas with image and bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !faceUrl) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = faceUrl;

    img.onload = () => {
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 1024;
      
      // Draw base image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw all unclear region bounding boxes
      regions.forEach((box) => {
        const x = box.x * canvas.width;
        const y = box.y * canvas.height;
        const w = box.width * canvas.width;
        const h = box.height * canvas.height;
        const isSelected = box.id === selectedBoxId;

        let strokeColor = '#f59e0b'; // Amber for blur
        let fillColor = 'rgba(245, 158, 11, 0.15)';
        if (box.issue_type === 'overexposure') {
          strokeColor = '#06b6d4';
          fillColor = 'rgba(6, 182, 212, 0.15)';
        } else if (box.issue_type === 'underexposure') {
          strokeColor = '#3b82f6';
          fillColor = 'rgba(59, 130, 246, 0.15)';
        } else if (box.issue_type === 'noise') {
          strokeColor = '#a855f7';
          fillColor = 'rgba(168, 85, 247, 0.15)';
        }

        if (box.is_user_verified) {
          strokeColor = '#10b981';
          fillColor = 'rgba(16, 185, 129, 0.2)';
        } else if (box.is_rejected) {
          strokeColor = '#64748b';
          fillColor = 'rgba(100, 116, 139, 0.1)';
        }

        // Fill & Stroke Bounding Box
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.setLineDash(box.is_rejected ? [6, 4] : []);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // Tag label header
        const labelText = `${box.is_user_verified ? '✓ Resolved' : box.issue_type.toUpperCase()} (${Math.round(box.confidence * 100)}%)`;
        ctx.font = 'bold 13px sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const tagHeight = 22;
        const tagWidth = textMetrics.width + 16;
        
        ctx.fillStyle = strokeColor;
        ctx.fillRect(x, Math.max(0, y - tagHeight), tagWidth, tagHeight);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(labelText, x + 8, Math.max(16, y - 6));
      });

      // Draw manual user in-progress drag box
      if (currentDraw) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          currentDraw.x * canvas.width,
          currentDraw.y * canvas.height,
          currentDraw.w * canvas.width,
          currentDraw.h * canvas.height
        );
        ctx.setLineDash([]);
      }
    };
  }, [faceUrl, regions, selectedBoxId, currentDraw]);

  // Mouse event handlers for manual region drawing and clicking
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    if (isDrawingMode) {
      setIsDrawing(true);
      setDrawStart({ x: clickX, y: clickY });
      setCurrentDraw({ x: clickX, y: clickY, w: 0, h: 0 });
    } else {
      // Find clicked bounding box
      const clicked = regions.find(
        (b) => clickX >= b.x && clickX <= b.x + b.width && clickY >= b.y && clickY <= b.y + b.height
      );
      if (clicked) {
        setSelectedBoxId(clicked.id);
      } else {
        setSelectedBoxId(null);
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;

    const normX = Math.min(drawStart.x, currentX);
    const normY = Math.min(drawStart.y, currentY);
    const normW = Math.abs(currentX - drawStart.x);
    const normH = Math.abs(currentY - drawStart.y);

    setCurrentDraw({ x: normX, y: normY, w: normW, h: normH });
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && currentDraw && currentDraw.w > 0.03 && currentDraw.h > 0.03) {
      onAddManualBox(faceDirection, {
        x: currentDraw.x,
        y: currentDraw.y,
        width: currentDraw.w,
        height: currentDraw.h,
        issue_type: 'blur',
        description: 'User marked unclear region for correction'
      });
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw(null);
    setIsDrawingMode(false);
  };

  const activeBox = regions.find((r) => r.id === selectedBoxId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white capitalize">
                {faceDirection} Face — Visual Quality Inspection
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Human-in-the-Loop
              </span>
            </div>
            <p className="text-xs text-slate-400">
              "AI proposes, the user validates." Verify detected quality defects and choose AI or photographic correction.
            </p>
          </div>
        </div>

        {/* Action button toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              isDrawingMode
                ? 'bg-brand-600 border-brand-400 text-white shadow-lg shadow-brand-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isDrawingMode ? 'Drawing Active (Click & Drag)' : 'Draw Custom Region'}</span>
          </button>

          <button
            onClick={() => onAcceptAllAsClean(faceDirection)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition-all"
            title="Accept this face as visually clear without further modifications"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accept As Clear</span>
          </button>
        </div>
      </div>

      {/* Main Workbench Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 min-h-0 overflow-hidden">
        
        {/* Left / Center: Interactive Canvas */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 overflow-auto relative">
          <div ref={containerRef} className="relative max-w-full max-h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`max-h-[68vh] max-w-full object-contain rounded-xl shadow-2xl ${
                isDrawingMode ? 'cursor-crosshair' : 'cursor-pointer'
              }`}
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-4">
            <span>💡 Click any highlighted bounding box to inspect and resolve</span>
            <span>•</span>
            <span>Click &apos;Draw Custom Region&apos; to mark a problematic area manually</span>
          </div>
        </div>

        {/* Right Panel: Defects List & Resolution Workbench */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                Detected Regions ({regions.length})
              </h3>
              {metrics && (
                <span className="text-xs font-mono text-slate-400">
                  Blur Score: {metrics.blur_score} ({metrics.blur_level})
                </span>
              )}
            </div>

            {/* List of Regions */}
            <div className="space-y-3 mt-3">
              {regions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-300">No Problematic Regions Detected</p>
                  <p className="text-[11px] text-slate-500 mt-1">This directional photograph passes sharpness, noise, and exposure checks.</p>
                </div>
              ) : (
                regions.map((box, idx) => {
                  const isSelected = box.id === selectedBoxId;
                  return (
                    <div
                      key={box.id}
                      onClick={() => setSelectedBoxId(box.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-950/30 ring-1 ring-brand-500'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {box.issue_type}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          box.is_user_verified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : box.is_rejected
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {box.is_user_verified ? 'Resolved' : box.is_rejected ? 'Rejected' : `${Math.round(box.confidence * 100)}% Confidence`}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2">{box.description}</p>

                      {/* Quick Action Buttons */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCorrectionModal(faceDirection, box);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>Resolve Issue</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Region Detailed Card */}
          {activeBox && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-300">Selected Target Guidance</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Coordinates: {Math.round(activeBox.x * 100)}%, {Math.round(activeBox.y * 100)}%
                </span>
              </div>
              
              {activeBox.guidance && (
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Target Angle:</span>
                    <span className="font-semibold text-slate-200">{activeBox.guidance.relative_angle_horizontal}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Distance:</span>
                    <span className="font-semibold text-slate-200">{activeBox.guidance.recommended_distance}</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 italic pt-1">
                    "{activeBox.guidance.camera_instructions}"
                  </p>
                </div>
              )}

              <button
                onClick={() => onOpenCorrectionModal(faceDirection, activeBox)}
                className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Open Resolution Workbench</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
