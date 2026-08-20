import React, { useState } from 'react';
import { 
  History, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Sparkles, 
  Download, 
  FileText,
  UserCheck
} from 'lucide-react';

export default function ProvenanceLedger({
  project,
  activeRoomId,
  onClose,
  onExpertSignoff
}) {
  const [expertName, setExpertName] = useState('');
  const [expertNotes, setExpertNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logs = [...(project?.provenance_log || [])].reverse();
  const activeRoom = project?.rooms?.[activeRoomId];

  const handleSignoffSubmit = async (e) => {
    e.preventDefault();
    if (!expertName.trim() || !expertNotes.trim()) return;
    setIsSubmitting(true);
    try {
      await onExpertSignoff(activeRoomId, expertName.trim(), expertNotes.trim(), true);
      setExpertName('');
      setExpertNotes('');
    } catch (err) {
      alert(`Signoff error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadJsonReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `provenance_audit_${project.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-modal max-w-3xl w-full rounded-3xl p-6 shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Provenance & Historical Authenticity Ledger
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Heritage Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Immutable audit trail of all photographic sources, quality flaws, AI inpainting vs physical photos, and expert verifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadJsonReport}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download Full JSON Provenance Ledger"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">Export Audit</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expert Sign-off Section */}
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Qualified Expert Verification & Sign-Off
            </span>
            {activeRoom?.is_expert_verified ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Expert Certified
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pending Certification
              </span>
            )}
          </div>

          {activeRoom?.is_expert_verified ? (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-emerald-300">{activeRoom.expert_notes}</p>
              <p className="text-[11px] text-slate-500">Historical truth verified for: {activeRoom.name}</p>
            </div>
          ) : (
            <form onSubmit={handleSignoffSubmit} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Expert / Conservator Name..."
                  value={expertName}
                  onChange={(e) => setExpertName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Archival certification notes..."
                  value={expertNotes}
                  onChange={(e) => setExpertNotes(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Certify Historical Truth</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Chronological Audit Timeline */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Activity Timeline ({logs.length} events)
          </span>

          <div className="space-y-2">
            {logs.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {event.event_type.includes('ai') ? (
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  ) : event.event_type.includes('patch') || event.event_type.includes('capture') ? (
                    <Camera className="w-4 h-4 text-brand-400" />
                  ) : event.event_type.includes('signoff') ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-200 capitalize">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {event.face_direction && (
                    <span className="text-[10px] font-semibold text-brand-300 block">
                      Target: {event.face_direction.toUpperCase()} Face
                    </span>
                  )}

                  {event.details && (
                    <pre className="mt-1 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
