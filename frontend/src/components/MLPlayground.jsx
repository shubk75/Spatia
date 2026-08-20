import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  X, 
  Code, 
  Sliders, 
  Check, 
  Sparkles, 
  Layers, 
  Copy, 
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { fetchMlModels, setActiveMlModel } from '../api';

export default function MLPlayground({ onClose }) {
  const [modelsData, setModelsData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchMlModels().then(setModelsData).catch(console.error);
  }, []);

  const samplePyTorchHook = `"""
Custom PyTorch / HuggingFace ML Model Integration Example.
Place your model inside backend/ml_engine/my_custom_model.py
"""
import torch
import numpy as np
from ml_engine.base import BaseReconstructor, RegionBBox
from ml_engine.ml_registry import ml_registry

class PyTorchDeepInpainter(BaseReconstructor):
    def __init__(self, weights_path="models/lama_inpaint.pth"):
        # Load your PyTorch or ONNX checkpoint
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # self.model = torch.load(weights_path).to(self.device)
        print(f"PyTorch Deep Inpainter initialized on {self.device}")

    def reconstruct_region(self, image_np: np.ndarray, mask_np: np.ndarray, bbox: RegionBBox, method: str = "neural"):
        # Convert BGR np.ndarray -> Tensor [1, 3, H, W]
        # input_tensor = torch.from_numpy(image_np).permute(2, 0, 1).unsqueeze(0).float() / 255.0
        # with torch.no_grad():
        #     output_tensor = self.model(input_tensor.to(self.device))
        # return (output_tensor.squeeze().permute(1, 2, 0).cpu().numpy() * 255.0).astype(np.uint8)
        return image_np

# Register into the ML Engine with 1 line:
ml_registry.register_reconstructor("pytorch_deep_inpaint", PyTorchDeepInpainter())
`;

  const copySnippet = () => {
    navigator.clipboard.writeText(samplePyTorchHook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-modal max-w-3xl w-full rounded-3xl p-6 shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                ML Engine & Model Extensibility Hub
              </h2>
              <p className="text-xs text-slate-400">
                Modular architecture designed for dropping in custom PyTorch, ONNX, and Cloud AI models.
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

        {/* Registered Models List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Quality Detectors */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Registered Quality Detectors
            </span>
            <div className="space-y-2">
              {modelsData?.quality_detectors?.map((det) => (
                <div key={det.key} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{det.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      det.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {det.is_active ? 'Active' : 'Ready'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Key: {det.key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reconstructors */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Registered AI Reconstructors
            </span>
            <div className="space-y-2">
              {modelsData?.reconstructors?.map((rec) => (
                <div key={rec.key} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{rec.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      rec.is_active ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {rec.is_active ? 'Active' : 'Slot Open'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Key: {rec.key}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Code Extension Template */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-brand-400" />
              How to Plug In Custom PyTorch Models
            </span>
            <button
              onClick={copySnippet}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Hook Code'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-slate-950 text-[11px] font-mono text-brand-300/90 overflow-x-auto max-h-44 border border-slate-800/80">
            {samplePyTorchHook}
          </pre>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close Hub
          </button>
        </div>

      </div>
    </div>
  );
}
