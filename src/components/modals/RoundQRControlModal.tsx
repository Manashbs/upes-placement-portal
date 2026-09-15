import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePortal } from '../../context/PortalContext';
import { Round } from '../../types';
import { Download, RefreshCw, ShieldCheck, MapPin, FileSpreadsheet } from 'lucide-react';
import { exportRosterExcel, exportExactSheetWithAttendance } from '../../utils/excelUtils';

interface RoundQRControlModalProps {
  round: Round | null;
  onClose: () => void;
}

export const RoundQRControlModal: React.FC<RoundQRControlModalProps> = ({ round, onClose }) => {
  const { roundStudents, regenerateQR, toggleGeoFence } = usePortal();

  if (!round) return null;

  const currentRoundStudents = roundStudents.filter((rs) => rs.roundId === round.id);

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('round-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `UPES_QR_${round.companyName}_${round.name}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
              ATTENDANCE CONTROL DESK
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
              {round.companyName} — {round.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Live Permanent Signed QR Code Display */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-4 flex flex-col items-center justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100 inline-block relative">
            <QRCodeSVG
              id="round-qr-svg"
              value={round.qrToken}
              size={180}
              level="H"
              includeMargin={true}
            />
            <div className="mt-2 text-[10px] font-mono text-slate-400">
              Token ID: {round.qrToken.slice(0, 16)}...
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Permanent QR Code · Valid Throughout Round</span>
          </div>
        </div>

        {/* Security Info */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
            <div className="flex items-center space-x-2 font-extrabold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Single Security QR Code (Scan Anywhere)</span>
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
              ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => regenerateQR(round.id)}
              className="w-full inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>Regenerate QR</span>
            </button>

            <button
              onClick={handleDownloadQR}
              className="w-full inline-flex items-center justify-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download QR</span>
            </button>
          </div>

          <button
            onClick={() => exportExactSheetWithAttendance(round.id, round.companyName, round.name, currentRoundStudents, [], 'xlsx')}
            className="w-full inline-flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2.5 rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Official Round Roster Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
