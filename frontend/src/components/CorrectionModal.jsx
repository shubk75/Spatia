import React, { useState } from 'react';
import { 
  Sparkles, 
  Camera, 
  Check, 
  X, 
  Wand2, 
  RotateCw, 
  Sliders, 
  Compass, 
  Info, 
  ShieldCheck, 
  Upload,
  ArrowRight,
  SplitSquareVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CorrectionModal({
  faceDirection,
  bbox,
  onClose,
  onTriggerAiReconstruction,
  onTriggerPhotoPatch,
  onVerifyCorrection
}) {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'photo_capture'
  const [aiMethod, setAiMethod] = useState('telea'); // 'telea' or 'navier_stokes'
  const [isLoading, setIsLoading] = useState(false);
  const [candidateResult, setCandidateResult] = useState(null);
  const [sliderPos, setSliderPos] = useState(50); // For before/after slider
  const [patchFile, setPatchFile] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Handle Option 1: AI Reconstruction
  const handleGenerateAi = async () => {
    setIsLoading(true);
    try {
      const res = await onTriggerAiReconstruction(faceDirection, bbox.id, aiMethod);
      setCandidateResult(res);
    } catch (err) {
      alert(`AI Reconstruction error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Option 2: Upload Patch
  const handleUploadPatchSubmit = async (e) => {
    e.preventDefault();
    if (!patchFile) {
      alert('Please select a photograph to upload');
      return;
    }
    setIsLoading(true);
    try {
      const res = await onTriggerPhotoPatch(faceDirection, bbox.id, patchFile);
      setCandidateResult(res);
    } catch (err) {
      alert(`Photo patch alignment error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Human Verification Decision
  const handleVerify = async (action) => {
    if (!candidateResult?.candidate_id) return;
    setIsLoading(true);
    try {
      await onVerifyCorrection(candidateResult.candidate_id, action, verificationNotes);
      if (action === 'accept') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
      onClose();
    } catch (err) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const guidance = bbox.guidance;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-modal max-w-3xl w-full rounded-3xl p-6 shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-400"></span>
              <h2 className="text-base font-bold text-white">
                Resolve Unclear Region — {faceDirection.toUpperCase()}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {bbox.issue_type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Philosophy: <strong className="text-slate-200">"AI proposes, the user validates."</strong> Choose a resolution method, preview candidate results, and confirm acceptability.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Method Selection Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('ai');
              setCandidateResult(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Option 1 — AI Reconstruction</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('photo_capture');
              setCandidateResult(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'photo_capture'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Option 2 — Capture Clearer Photo</span>
          </button>
        </div>

        {/* Tab 1 Content: AI Reconstruction */}
        {activeTab === 'ai' && (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="text-xs font-bold text-white">AI Inpainting & Texture Synthesis Engine</h4>
                <p className="text-[11px] text-slate-400">
                  Synthesizes replacement texture based on surrounding structural contours.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={aiMethod}
                  onChange={(e) => setAiMethod(e.target.value)}
                  className="bg-slate-800 text-xs font-medium text-slate-200 rounded-xl px-3 py-1.5 border border-slate-700 focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="telea">Fast Marching (Telea Algorithm)</option>
                  <option value="navier_stokes">Navier-Stokes Fluid Inpainting</option>
                </select>

                <button
                  onClick={handleGenerateAi}
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>Generate Candidate</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Capture Guidance & Photo Patch Upload */}
        {activeTab === 'photo_capture' && (
          <div className="mt-5 space-y-4">
            {/* Visual Viewfinder Guidance Card */}
            {guidance && (
              <div className="p-4 rounded-2xl bg-amber-950/25 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" />
                    Target Viewfinder Guidance
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    Highest Physical Accuracy
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Target Direction</span>
                    <span className="font-semibold text-slate-200">{guidance.target_face_label}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Angle Offset</span>
                    <span className="font-semibold text-slate-200">{guidance.relative_angle_horizontal}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Recommended Distance</span>
                    <span className="font-semibold text-slate-200">{guidance.recommended_distance}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p>{guidance.camera_instructions}</p>
                </div>
              </div>
            )}

            {/* Photo Patch Uploader */}
            <form onSubmit={handleUploadPatchSubmit} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="patch-upload"
                  accept="image/*"
                  onChange={(e) => setPatchFile(e.target.files?.[0])}
                  className="hidden"
                />
                <label
                  htmlFor="patch-upload"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-brand-400" />
                  <span>{patchFile ? patchFile.name : 'Select Targeted Photograph'}</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {patchFile ? `${Math.round(patchFile.size / 1024)} KB ready` : 'Upload clearer photo to patch region'}
                </span>
              </div>

              <button
                type="submit"
                disabled={!patchFile || isLoading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>Align & Blend Patch</span>
              </button>
            </form>
          </div>
        )}

        {/* Candidate Verification Workbench: Before / After Comparison */}
        {candidateResult && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-900/80 border border-brand-500/30 space-y-4 animate-in fade-in slide-in-from-bottom-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-brand-300 flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4" />
                Human-in-the-Loop Validation: Candidate Inspection
              </span>
              <div className="flex items-center gap-2 text-xs">
                {candidateResult.psnr_estimate && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px]">
                    PSNR: {candidateResult.psnr_estimate} dB
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 font-semibold text-[10px]">
                  Confidence: {Math.round((candidateResult.confidence || 0.9) * 100)}%
                </span>
              </div>
            </div>

            {/* Side by side / swipe comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Original Unclear Crop</span>
                <div className="aspect-square w-full rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                  <img
                    src={candidateResult.original_crop_url}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-emerald-400 block">
                  {activeTab === 'ai' ? 'AI Inpainted Proposal' : 'Patched & Blended Result'}
                </span>
                <div className="aspect-square w-full rounded-xl overflow-hidden border border-emerald-500/50 bg-black flex items-center justify-center ring-2 ring-emerald-500/20">
                  <img
                    src={candidateResult.reconstructed_crop_url}
                    alt="Reconstructed"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Notes input */}
            <div>
              <input
                type="text"
                placeholder="Optional verification notes (e.g. 'Preserves historical fresco texture', 'Approved by operator')..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Verification Decision Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleVerify('reject')}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-red-400" />
                <span>Reject Candidate</span>
              </button>

              <button
                onClick={() => handleVerify('accept')}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Accept & Commit Fix</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
