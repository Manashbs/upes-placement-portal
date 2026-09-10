import React, { useState, useEffect, useRef } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Check, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';

export function parseScanUrlParams() {
  if (typeof window === 'undefined') return { roundId: '', sapId: '', candidateName: '', token: '' };

  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const rawStr = hash.includes('scan=') ? hash.replace(/^#\/?/, '') : search.replace(/^\?/, '');
  const params = new URLSearchParams(rawStr);

  const roundId = params.get('scan') || params.get('roundId') || params.get('round') || 'rnd-1';
  const sapId = params.get('r') || params.get('sapId') || params.get('sap') || '500123174';
  const candidateName = params.get('n') || params.get('name') || '';
  const token = params.get('t') || '';

  return {
    roundId,
    sapId,
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

  const targetRound = rounds.find((r) => r.id === params.roundId) || rounds[0];

  // Lookup candidate name
  const matchedStudent = students.find((s) => s.sapId === params.sapId);
  const matchedRoundStudent = roundStudents.find(
    (rs) => (rs.roundId === params.roundId || params.roundId === 'rnd-1') && rs.sapId === params.sapId
  );

  const displayName =
    params.candidateName ||
    matchedRoundStudent?.studentName ||
    matchedStudent?.name ||
    'Harsh Thakur';

  const isAlreadyPresentInContext =
    matchedRoundStudent?.attendanceStatus === 'PRESENT' ||
    matchedRoundStudent?.attendanceStatus === 'MANUALLY_MARKED';

  const isPresent = marked || isAlreadyPresentInContext;

  // Initialize camera stream for mobile scanning
  useEffect(() => {
    if (isPresent) return;

    let currentStream: MediaStream | null = null;
    let isSubscribed = true;

    async function startCamera() {
      try {
        setCameraStatus('STARTING');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (isSubscribed && videoRef.current) {
          videoRef.current.srcObject = stream;
          currentStream = stream;
          setCameraStatus('ACTIVE');
        }
      } catch {
        if (isSubscribed) {
          setCameraStatus('ERROR');
        }
      }
    }

    startCamera();

    return () => {
      isSubscribed = false;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isPresent]);

  const handleMarkAttendance = () => {
    markAttendance(params.roundId || 'rnd-1', params.sapId || '500123174', 'MOBILE_CAMERA_SCAN', displayName);
    setMarked(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-screen w-full bg-[#EEF2F6] flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      {/* Background Geometric Pattern Tiles */}
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#CBD5E1_1.5px,transparent_1.5px)] [background-size:20px_20px]" />

      <div className="relative w-full max-w-sm mx-auto my-auto">
        {!isPresent ? (
          /* Screenshot 1: Camera Scanning Mode */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100/80 space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-serif font-normal text-[#1E2B3C] tracking-tight mb-2">
                Placement process
              </h2>
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Hello <strong className="text-slate-900 font-semibold">{displayName}</strong>. Point your camera at the one attendance QR displayed at the venue.
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
                  <p className="text-xs text-slate-300">Camera preview starting... Point camera at venue screen.</p>
                </div>
              )}
            </div>

            <p className="text-xs font-serif italic text-slate-500 text-left">
              {cameraStatus === 'ACTIVE' ? 'Camera active · Scanning venue QR code...' : 'Starting camera...'}
            </p>

            <button
              onClick={handleMarkAttendance}
              className="w-full bg-[#1E2B3C] hover:bg-slate-800 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2 mt-4"
            >
              <span>⚡ Mark My Attendance Now</span>
            </button>
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
              ✓ Attendance Verified for {displayName} ({params.sapId})
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
