import React, { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useChatStore } from '../store/chatStore';
import { Phone, Key, Lock, Loader2 } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { authStep, sendCode, signIn, signIn2FA, restoreSession } = useTelegram();
  const { auth, isLoading, error } = useChatStore();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (auth.sessionString && !auth.isAuthenticated) {
      restoreSession();
    }
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendCode(phone);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(code);
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn2FA(password);
  };

  return (
    <div className="min-h-screen bg-[#0e1621] flex items-center justify-center p-4">
      <div className="bg-[#17212b] rounded-xl p-8 w-full max-w-[360px]">
        <div className="text-center mb-8">
          {/* Telegram Logo */}
          <div className="w-[120px] h-[120px] mx-auto mb-6">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="60" fill="url(#telegram-gradient)"/>
              <path
                d="M26.5 58.5L84.2 35.5C86.8 34.5 89.3 36.3 88.5 39L78.5 82C77.8 84.8 74.5 86 72.2 84.3L54 71L45.5 79.2C44.2 80.5 42 79.6 42 77.8V65.5L76.5 37.5L38.5 61.5L26.5 57.5C24 56.7 24 53.3 26.5 52.5L26.5 58.5Z"
                fill="white"
              />
              <defs>
                <linearGradient id="telegram-gradient" x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#37AEE2"/>
                  <stop offset="1" stopColor="#1E96C8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-[24px] font-medium text-white mb-2">Telegram</h1>
          <p className="text-[#6c7883] text-[15px]">
            {authStep === 'phone' && 'Iltimos, mamlakat kodini tasdiqlang va telefon raqamingizni kiriting.'}
            {authStep === 'code' && `${auth.phone} raqamiga kod yubordik.`}
            {authStep === '2fa' && 'Hisobingiz ikki bosqichli parol bilan himoyalangan.'}
          </p>
        </div>

        {error && (
          <div className="bg-[#e53935]/10 border border-[#e53935]/30 text-[#e53935] px-4 py-3 rounded-lg mb-4 text-[14px]">
            {error}
          </div>
        )}

        {authStep === 'phone' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7883]" size={20} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full bg-[#242f3d] text-white pl-12 pr-4 py-3.5 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3390ec] placeholder:text-[#6c7883]"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !phone}
              className="w-full bg-[#3390ec] hover:bg-[#2b7fd4] text-white py-3.5 rounded-xl font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                'Keyingi'
              )}
            </button>
          </form>
        )}

        {authStep === 'code' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7883]" size={20} />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Kod"
                className="w-full bg-[#242f3d] text-white pl-12 pr-4 py-3.5 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3390ec] placeholder:text-[#6c7883] tracking-[0.5em] text-center"
                disabled={isLoading}
                maxLength={5}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || code.length < 5}
              className="w-full bg-[#3390ec] hover:bg-[#2b7fd4] text-white py-3.5 rounded-xl font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                'Keyingi'
              )}
            </button>
          </form>
        )}

        {authStep === '2fa' && (
          <form onSubmit={handle2FA} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7883]" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parol"
                className="w-full bg-[#242f3d] text-white pl-12 pr-4 py-3.5 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3390ec] placeholder:text-[#6c7883]"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-[#3390ec] hover:bg-[#2b7fd4] text-white py-3.5 rounded-xl font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                'Tasdiqlash'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
