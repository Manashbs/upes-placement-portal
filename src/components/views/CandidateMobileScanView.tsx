import React, { useState, useEffect, useRef } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Check, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';

import { validateQRToken } from '../../utils/qrUtils';

export function parseScanUrlParams() {
  if (typeof window === 'undefined') return { roundId: '', sapId: '', candidateName: '', token: '' };

  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const rawStr = hash.includes('scan=') ? hash.replace(/^#\/?/, '') : search.replace(/^\?/, '');
  const params = new URLSearchParams(rawStr);

  const roundId = params.get('scan') || params.get('roundId') || params.get('round') || '';
  const sapId = params.get('r') || params.get('sapId') || params.get('sap') || '';
  const candidateName = params.get('n') || params.get('name') || '';
  const token = params.get('t') || '';

  return {
    roundId,
    sapId: String(sapId).trim(),
    candidateName: candidateName ? decodeURIComponent(candidateName) : '',
    token,
  };
}

export const CandidateMobileScanView: React.FC = () => {
  const { rounds, students, roundStudents, markAttendance } = usePortal();
  const [params, setParams] = useState(parseScanUrlParams);
  const [marked, setMarked] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'STARTING' | 'ACTIVE' | 'ERROR'>('STARTING');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    const handleUrlChange = () => {
      setParams(parseScanUrlParams());
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const cleanSap = String(params.sapId || '').trim();

  // Lookup candidate name dynamically by SAP ID or URL parameter
  const matchedStudent = students.find((s) => String(s.sapId).trim() === cleanSap);
  const matchedRoundStudent = roundStudents.find(
    (rs) => String(rs.sapId).trim() === cleanSap && rs.roundId === params.roundId
  );

  const displayName =
    params.candidateName ||
    matchedRoundStudent?.studentName ||
    matchedStudent?.name ||
    (cleanSap ? `Candidate (${cleanSap})` : 'Student Candidate');

  const isAlreadyPresentInContext =
    Boolean(cleanSap) &&
    Boolean(matchedRoundStudent) &&
    (matchedRoundStudent?.attendanceStatus === 'PRESENT' ||
      matchedRoundStudent?.attendanceStatus === 'MANUALLY_MARKED');

  const isPresent = marked || isAlreadyPresentInContext;

  // Real-Time Camera Frame Scanning Loop via jsQR
  useEffect(() => {
    if (isPresent) return;

    let animationFrameId: number;
    let currentStream: MediaStream | null = null;
    let isSubscribed = true;

    async function startCameraAndScan() {
      try {
        setCameraStatus('STARTING');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
        });

        if (isSubscribed && videoRef.current) {
          videoRef.current.srcObject = stream;
          currentStream = stream;
          setCameraStatus('ACTIVE');
          isScanningRef.current = true;
          animationFrameId = requestAnimationFrame(scanFrame);
        }
      } catch {
        if (isSubscribed) {
          setCameraStatus('ERROR');
        }
      }
    }

    const scanFrame = () => {
      if (!isScanningRef.current) return;

      const video = videoRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }

        const scanCanvas = canvasRef.current;
        const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          scanCanvas.width = video.videoWidth;
          scanCanvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

          const imageData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const scannedText = code.data;
            const tokenCheck = validateQRToken(scannedText);

            const isValidQR =
              tokenCheck.valid ||
              scannedText.includes('UPES') ||
              (Boolean(params.roundId) && scannedText.includes(params.roundId));

            if (isValidQR && cleanSap && params.roundId) {
              isScanningRef.current = false;
              // Use the roundId from the QR token if available, otherwise fall back to URL param
              const targetRoundId = tokenCheck.data?.roundId || params.roundId;
              markAttendance(targetRoundId, cleanSap, 'REAL_CAMERA_QR_SCAN', displayName);
              setMarked(true);
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

              if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
              }
              return;
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(scanFrame);
    };

    startCameraAndScan();

    return () => {
      isSubscribed = false;
      isScanningRef.current = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isPresent, params.roundId, cleanSap, displayName, markAttendance]);

  return (
    <div className="min-h-screen w-full bg-[#EEF2F6] flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Background Geometric Pattern Tiles */}
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#CBD5E1_1.5px,transparent_1.5px)] [background-size:20px_20px]" />

      <div className="relative w-full max-w-sm mx-auto my-auto">
        {!isPresent ? (
          /* Screenshot 1: Camera Scanning Mode (NO manual button) */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100/80 space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-serif font-normal text-[#1E2B3C] tracking-tight mb-2">
                Placement process
              </h2>
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Hello <strong className="text-slate-900 font-semibold">{displayName}</strong>. Point your camera at the venue Security QR code to verify attendance.
              </p>
            </div>

            {/* Video Camera Container Frame */}
            <div className="relative w-full aspect-square bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center my-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Box Overlay */}
              <div className="absolute inset-10 border border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-12 h-0.5 bg-amber-400/80 animate-pulse" />
              </div>

              {cameraStatus === 'STARTING' && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                  <span className="text-xs text-slate-300 font-serif italic animate-pulse">
                    Starting camera...
                  </span>
                </div>
              )}

              {cameraStatus === 'ERROR' && (
                <div className="absolute inset-0 bg-slate-900 p-4 flex flex-col items-center justify-center text-center space-y-2">
                  <Camera className="w-8 h-8 text-amber-400 opacity-80" />
                  <p className="text-xs text-slate-300">Allow camera permission to scan venue Security QR Code.</p>
                </div>
              )}
            </div>

            <p className="text-xs font-serif italic text-slate-500 text-left">
              {cameraStatus === 'ACTIVE' ? 'Camera active · Point camera at venue Security QR to mark attendance...' : 'Starting camera...'}
            </p>
          </div>
        ) : (
          /* Screenshot 2: Already Marked / Attendance Confirmation Mode */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100/80 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="text-left border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-serif font-normal text-[#1E2B3C] tracking-tight mb-1">
                Placement process
              </h2>
              <p className="text-xs text-slate-500 font-sans">
                Attendance confirmation
              </p>
            </div>

            {/* Ticket Badge & Icon */}
            <div className="py-2 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#B38728] text-white flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <h3 className="text-xl font-serif font-normal text-[#1E2B3C]">
                Already marked
              </h3>
            </div>

            {/* Lime Green Banner */}
            <div className="w-full bg-[#20F090] text-slate-950 font-extrabold text-xs py-3.5 px-4 rounded-2xl shadow-xs leading-snug">
              ✓ Attendance Verified for {displayName} {params.sapId ? `(${params.sapId})` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-[11px] text-slate-400 font-sans tracking-wide">
        UPES Placement Cell · Mobile Attendance System
      </div>
    </div>
  );
};
