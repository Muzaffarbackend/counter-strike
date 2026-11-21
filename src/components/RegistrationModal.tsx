import React, { useState } from 'react';
import { Shield, UserCheck } from 'lucide-react';
import { AVATAR_OPTIONS } from '../data/storage';
import { audioEngine } from '../engine/AudioEngine';

interface RegistrationModalProps {
  onRegister: (username: string, avatarId: string) => void;
}

export function RegistrationModal({ onRegister }: RegistrationModalProps) {
  const [username, setUsername] = useState('');
  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0].id);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = username.trim();
    if (cleaned.length < 2) {
      setError('Foydalanuvchi nomi kamida 2 ta belgidan iborat bo\'lishi kerak.');
      return;
    }
    audioEngine.playUiClick();
    audioEngine.startMenuMusic();
    onRegister(cleaned, avatarId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0E] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_55%)] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#12161D] border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-orange-500" />
          <h1 className="font-display text-2xl font-bold tracking-wide text-zinc-100">
            TEMIR FRONT — RO'YXATDAN O'TISH
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Jangovar profilingizni yarating. Statistika, daraja va yutuqlar qurilmangizda saqlanadi.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="reg-username" className="block text-xs font-semibold text-zinc-300 mb-2">
              Foydalanuvchi nomi (Chaqiruv belgisi)
            </label>
            <input
              id="reg-username"
              type="text"
              maxLength={18}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Masalan: Lochin_UZ"
              className="w-full px-4 py-3 bg-[#0B0E13] border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-300 mb-3">
              O'yinchi belgisini tanlang
            </span>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_OPTIONS.map((av) => {
                const selected = avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playUiHover();
                      setAvatarId(av.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all whitespace-nowrap ${
                      selected
                        ? 'bg-orange-500/15 border-orange-500 text-zinc-100'
                        : 'bg-[#0B0E13] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                      style={{ backgroundColor: av.color }}
                    />
                    <span className="text-sm font-medium truncate">{av.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-orange-600 hover:bg-orange-500 text-white font-display font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            <UserCheck className="w-5 h-5" />
            <span>PROFILNI SAQLASH VA KIRISH</span>
          </button>
        </form>
      </div>
    </div>
  );
}
