import React, { useState, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { AlertCircle, Lock, User, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = usePortal();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep input boxes empty on mount, preventing any browser autofill persistence
  useEffect(() => {
    setUsername('');
    setPassword('');
  }, []);

  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [recaptchaLoading, setRecaptchaLoading] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState(false);

  const handleRecaptchaClick = () => {
    if (recaptchaVerified || recaptchaLoading) return;
    setRecaptchaLoading(true);
    setRecaptchaError(false);
    setTimeout(() => {
      setRecaptchaLoading(false);
      setRecaptchaVerified(true);
    }, 700);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recaptchaVerified) {
      setRecaptchaError(true);
      setError('Please complete the Google reCAPTCHA verification.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const success = login(username, password, rememberMe);
      if (!success) {
        setError('Invalid username or password. Please check credentials.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative p-4 select-none overflow-hidden bg-[#edf2f7]">
      {/* Background Geometric Diamond Grid Pattern matching Screenshot 1 */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 1.5px, transparent 1.5px), radial-gradient(#e2e8f0 1.5px, #edf2f7 1.5px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
        }}
      />

      {/* Decorative subtle ambient backdrop highlights */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(226, 232, 240, 0.6) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(226, 232, 240, 0.6) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(226, 232, 240, 0.6) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(226, 232, 240, 0.6) 75%)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
        }}
      />

      {/* Login Floating White Card */}
      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-xl shadow-xl border border-slate-200/90 px-8 sm:px-10 py-10 transition-all">
        
        {/* UPES Brand Logo Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 mb-6">
          <div className="flex items-center justify-center">
            <img 
              src="/upes-logo.svg" 
              alt="UPES - UNIVERSITY OF TOMORROW" 
              className="h-12 w-auto max-w-[200px] object-contain select-none pointer-events-none"
            />
          </div>

          <div className="pt-2">
            <h1 
              className="text-2xl text-[#1E3A8A] font-semibold tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Placement Desk
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              UPES Career Services placement operations
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Decoy hidden inputs to divert aggressive browser credential autofill */}
          <input type="text" name="fake_username_prevent_autofill" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" name="fake_password_prevent_autofill" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

          {/* Username Field */}
          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold text-slate-600">
              Username
            </label>
            <input
              type="text"
              name="upes_login_user"
              id="upes_login_user"
              required
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=""
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md outline-none text-slate-800 focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-all font-medium"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold text-slate-600">
              Password
            </label>
            <input
              type="password"
              name="upes_login_pwd"
              id="upes_login_pwd"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md outline-none text-slate-800 focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-all font-medium"
            />
          </div>

          {/* Remember me & Portal label */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="text-slate-500 text-xs">Remember me</span>
            </label>

            <span className="text-xs text-slate-400 font-medium">
              UPES Placement Portal
            </span>
          </div>

          {/* Google reCAPTCHA v2 Active Widget */}
          <div className="pt-2 flex justify-center">
            <div
              onClick={handleRecaptchaClick}
              className={`w-[304px] h-[78px] bg-[#f9f9f9] rounded-sm px-3 flex items-center justify-between transition-all cursor-pointer select-none ${
                recaptchaError
                  ? 'border-2 border-rose-400 ring-2 ring-rose-200'
                  : recaptchaVerified
                  ? 'border border-emerald-400 shadow-xs'
                  : 'border border-[#d3d3d3] hover:border-[#b8b8b8] shadow-xs'
              }`}
            >
              {/* Checkbox and Label */}
              <div className="flex items-center space-x-3">
                <div
                  className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
                    recaptchaVerified
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white border-2 border-[#c1c1c1]'
                  }`}
                >
                  {recaptchaLoading && (
                    <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {recaptchaVerified && <Check className="w-5 h-5 text-white stroke-[3]" />}
                </div>

                <span className="text-sm font-sans text-[#222] font-normal">
                  I'm not a robot
                </span>
              </div>

              {/* Google reCAPTCHA Brand Badge */}
              <div className="flex flex-col items-center justify-center text-right pl-2">
                <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 4C14.0589 4 6 12.0589 6 22H11C11 14.8203 16.8203 9 24 9V4Z" fill="#1A73E8" />
                  <path d="M42 22C42 12.0589 33.9411 4 24 4V9C31.1797 9 37 14.8203 37 22H42Z" fill="#4285F4" />
                  <path d="M24 44C33.9411 44 42 35.9411 42 26H37C37 33.1797 31.1797 39 24 39V44Z" fill="#34A853" />
                  <path d="M6 26C6 35.9411 14.0589 44 24 44V39C16.8203 39 11 33.1797 11 26H6Z" fill="#FBBC05" />
                </svg>
                <span className="text-[10px] text-[#555] font-sans font-medium tracking-tight mt-0.5">
                  reCAPTCHA
                </span>
                <div className="text-[8px] text-[#555] space-x-1">
                  <a
                    href="https://www.google.com/intl/en/policies/privacy/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-[#555]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy
                  </a>
                  <span>-</span>
                  <a
                    href="https://www.google.com/intl/en/policies/terms/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-[#555]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button matching Screenshot 1's warm sand/gold color */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#E5BC7D] hover:bg-[#D4A85F] active:scale-[0.99] text-white font-bold text-sm rounded-md shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75"
          >
            {loading ? (
              <span className="inline-flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                <span>Verifying credentials...</span>
              </span>
            ) : (
              <span>Log in</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
