import { useState } from 'react';
import { ArrowLeft, Award, Save } from 'lucide-react';
import { AVATAR_OPTIONS } from '../data/storage';
import { audioEngine } from '../engine/AudioEngine';
import { PlayerProfile } from '../types/game';

interface ProfileScreenProps {
  profile: PlayerProfile;
  onUpdateProfile: (next: PlayerProfile) => void;
  onBack: () => void;
}

export function ProfileScreen({ profile, onUpdateProfile, onBack }: ProfileScreenProps) {
  const [username, setUsername] = useState(profile.username);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [savedNotice, setSavedNotice] = useState(false);

  const kdRatio =
    profile.deaths > 0 ? (profile.kills / profile.deaths).toFixed(2) : profile.kills.toFixed(2);
  const accuracy =
    profile.shotsFired > 0 ? Math.round((profile.shotsHit / profile.shotsFired) * 100) : 0;
  const winRate =
    profile.matchesPlayed > 0 ? Math.round((profile.wins / profile.matchesPlayed) * 100) : 0;

  const xpPerLevel = 500;
  const xpProgress = profile.xp % xpPerLevel;
  const xpPct = Math.min(100, Math.round((xpProgress / xpPerLevel) * 100));

  const saveChanges = () => {
    audioEngine.playUiClick();
    onUpdateProfile({
      ...profile,
      username: username.trim() || profile.username,
      avatarId,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="w-full h-full bg-[#090B0E] text-zinc-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800/80 bg-[#0D1016]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              audioEngine.playUiClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#151922] hover:bg-[#1E2430] border border-zinc-800 rounded-lg text-sm text-zinc-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Orqaga</span>
          </button>
          <h1 className="font-display text-2xl font-bold tracking-wider">O'YINCHI PROFILI</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Identity + XP Level */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#12161D] border border-zinc-800 rounded-xl p-6 space-y-5">
              <h2 className="font-display text-lg font-bold">Shaxsiy ma'lumotlar</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  maxLength={18}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#0B0E13] border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={saveChanges}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-4 h-4" />
                  <span>{savedNotice ? 'Saqlandi!' : 'Saqlash'}</span>
                </button>
              </div>

              <div>
                <span className="block text-xs text-zinc-400 mb-2">Avatar belgisi</span>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => {
                        audioEngine.playUiHover();
                        setAvatarId(av.id);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                        avatarId === av.id
                          ? 'bg-orange-500/15 border-orange-500 text-zinc-100'
                          : 'bg-[#0B0E13] border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: av.color }} />
                      <span>{av.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#12161D] border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400">Jangovar tajriba</span>
                  <div className="font-display text-3xl font-bold text-orange-400 mt-1">
                    {profile.level}-daraja
                  </div>
                </div>
                <Award className="w-10 h-10 text-orange-500" />
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                  <span>Keyingi darajagacha</span>
                  <span className="font-mono-num text-zinc-200">
                    {xpProgress} / {xpPerLevel} XP
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#0B0E13] rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-orange-500 transition-all"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Stat Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#12161D] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">O'tkazilgan o'yinlar</div>
              <div className="font-mono-num text-2xl font-bold text-zinc-100 mt-1">
                {profile.matchesPlayed}
              </div>
              <div className="text-xs text-emerald-400 mt-1">
                G'alaba ulushi: {winRate}%
              </div>
            </div>
            <div className="bg-[#12161D] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Zarba / O'lim (K/D)</div>
              <div className="font-mono-num text-2xl font-bold text-zinc-100 mt-1">{kdRatio}</div>
              <div className="text-xs text-zinc-400 mt-1">
                {profile.kills} zarba · {profile.deaths} o'lim
              </div>
            </div>
            <div className="bg-[#12161D] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Otish aniqligi</div>
              <div className="font-mono-num text-2xl font-bold text-zinc-100 mt-1">{accuracy}%</div>
              <div className="text-xs text-zinc-400 mt-1">
                {profile.shotsHit} / {profile.shotsFired} tegish
              </div>
            </div>
            <div className="bg-[#12161D] border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-400">Umumiy tajriba (XP)</div>
              <div className="font-mono-num text-2xl font-bold text-orange-400 mt-1">
                {profile.xp}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Saqlash: LocalStorage</div>
            </div>
          </div>

          {/* Match History */}
          <div className="bg-[#12161D] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="font-display text-lg font-bold">O'yinlar tarixi</h2>
            </div>

            {profile.matchHistory.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Hali yakunlangan janglar mavjud emas. Birinchi jangni boshlang!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0C0F14] text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-6">Natija</th>
                      <th className="py-3 px-4">Xarita</th>
                      <th className="py-3 px-4">Rejim</th>
                      <th className="py-3 px-4">Hisob</th>
                      <th className="py-3 px-4">K / D</th>
                      <th className="py-3 px-6 text-right">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {profile.matchHistory.map((m) => (
                      <tr key={m.id} className="hover:bg-[#161B24]">
                        <td className="py-3 px-6 font-bold">
                          <span className={m.won ? 'text-emerald-400' : 'text-red-400'}>
                            {m.won ? "G'ALABA" : "MAG'LUBIYAT"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-200">{m.mapName}</td>
                        <td className="py-3 px-4 text-zinc-400">{m.modeName}</td>
                        <td className="py-3 px-4 font-mono-num text-zinc-200">
                          {m.scoreA} : {m.scoreB}
                        </td>
                        <td className="py-3 px-4 font-mono-num text-zinc-200">
                          {m.kills} / {m.deaths}
                        </td>
                        <td className="py-3 px-6 text-right font-mono-num text-zinc-500">
                          {m.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
