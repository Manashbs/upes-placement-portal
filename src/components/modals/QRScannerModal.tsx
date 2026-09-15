import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { validateQRToken } from '../../utils/qrUtils';
import { QrCode, CheckCircle2, AlertTriangle, Sparkles, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoundId?: string;
  sapId?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  targetRoundId,
  sapId = '59001234',
}) => {
  const { rounds, markAttendance } = usePortal();
  const [tokenInput, setTokenInput] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState(targetRoundId || rounds[1]?.id || rounds[0]?.id || '');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const currentRound = rounds.find((r) => r.id === selectedRoundId);

  const handleSimulateScanCurrent = () => {
    if (!currentRound) return;

    // Validate signed token
    const tokenValidation = validateQRToken(currentRound.qrToken);
    if (!tokenValidation.valid) {
      setScanResult({ success: false, message: tokenValidation.message });
      return;
    }

    const result = markAttendance(currentRound.id, sapId, 'DYNAMIC_QR_CAMERA_SCANNER');
    setScanResult(result);

    if (result.success) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    }
  };

  const handleCustomTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput) return;

    const tokenValidation = validateQRToken(tokenInput.trim());
    if (!tokenValidation.valid) {
      setScanResult({ success: false, message: tokenValidation.message });
      return;
    }

    const matchedRoundId = tokenValidation.data?.roundId || selectedRoundId;
    const result = markAttendance(matchedRoundId, sapId, 'QR_TOKEN_SUBMIT');
    setScanResult(result);

    if (result.success) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-slate-900">QR Code Attendance Scanner</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 font-bold text-sm">✕</button>
        </div>

        {/* Camera simulation view */}
        <div className="bg-slate-950 text-white p-6 rounded-3xl text-center space-y-4 relative overflow-hidden border border-slate-800">
          <div className="w-36 h-36 mx-auto rounded-2xl border-2 border-dashed border-amber-400 flex items-center justify-center relative bg-slate-900/50">
            <div className="absolute inset-0 bg-amber-400/10 animate-pulse" />
            <QrCode className="w-16 h-16 text-amber-400 opacity-80" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Align QR Code inside frame</p>
            <p className="text-[10px] text-slate-400">Scanning for signed round token...</p>
          </div>

          <button
            onClick={handleSimulateScanCurrent}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            ⚡ Scan Displayed Round QR Code
          </button>
        </div>

        {/* Custom token paste option */}
        <form onSubmit={handleCustomTokenSubmit} className="space-y-3">
          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Target Round</label>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>{r.companyName} — {r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Paste Token String (Optional)</label>
            <input
              type="text"
              placeholder="e.g. UPES-SEC-MS-OA-2026..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0B132B] hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all"
          >
            Verify Signed Token & Submit
          </button>
        </form>

        {/* Scan Result */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1 ${
              scanResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-1.5 font-bold">
              {scanResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span>{scanResult.success ? 'Verified & Marked Present!' : 'Verification Failed'}</span>
            </div>
            <div>{scanResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
};
