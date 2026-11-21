import { RotateCcw, Shield } from 'lucide-react';
import { audioEngine } from '../engine/AudioEngine';
import { PlayerProfile } from '../types/game';

interface ExitScreenProps {
  profile: PlayerProfile;
  onReturnToMenu: () => void;
}

export function ExitScreen({ profile, onReturnToMenu }: ExitScreenProps) {
  return (
    <div className="w-full h-full bg-[#090B0E] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#12161D] border border-zinc-800 rounded-xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-orange-600/15 border border-orange-500/40 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-orange-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-zinc-100">
          O'YIN SEANSI YAKUNLANDI
        </h1>
        <p className="text-sm text-zinc-400">
          Rahmat, <strong className="text-zinc-200">{profile.username}</strong>! Sizning barcha natijalaringiz va qurol tanlovlaringiz xavfsiz saqlandi.
        </p>

        <div className="grid grid-cols-2 gap-3 py-2 text-left">
          <div className="bg-[#0B0E13] border border-zinc-800 rounded-lg p-3">
            <div className="text-[11px] text-zinc-400">Daraja</div>
            <div className="font-mono-num text-lg font-bold text-orange-400">
              {profile.level}-daraja
            </div>
          </div>
          <div className="bg-[#0B0E13] border border-zinc-800 rounded-lg p-3">
            <div className="text-[11px] text-zinc-400">G'alabalar</div>
            <div className="font-mono-num text-lg font-bold text-zinc-100">
              {profile.wins} / {profile.matchesPlayed}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            audioEngine.playUiClick();
            onReturnToMenu();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-orange-600 hover:bg-orange-500 text-white font-display font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>BOSH MENYUGA QAYTISH</span>
        </button>
      </div>
    </div>
  );
}
