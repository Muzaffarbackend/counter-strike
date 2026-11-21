import { ArrowLeft, Play } from 'lucide-react';
import { TEAM_NAMES } from '../data/characters';
import { getMapThumbnailUrl, MAPS } from '../data/maps';
import { audioEngine } from '../engine/AudioEngine';
import { DifficultyLevel, GameModeId, MatchConfig, TeamId } from '../types/game';

interface CreateMatchScreenProps {
  config: MatchConfig;
  onChange: (cfg: MatchConfig) => void;
  onStartMatch: () => void;
  onBack: () => void;
}

const GAME_MODES: Array<{
  id: GameModeId;
  name: string;
  desc: string;
  defaults: Partial<MatchConfig>;
}> = [
  {
    id: 'classic',
    name: "Klassik o'yin",
    desc: "Raundlar bo'yicha taktik jang. Jamoani yo'q qilish yoki signal nuqtasini egallash raund g'olibini aniqlaydi.",
    defaults: { durationSeconds: 120, roundLimit: 5, botCountPerTeam: 4 },
  },
  {
    id: 'tdm',
    name: "Jamoaviy o'lim janggi",
    desc: "Tezkor qayta tirilish bilan uzluksiz jang. Belgilangan ballga birinchi yetgan jamoa g'olib bo'ladi.",
    defaults: { durationSeconds: 240, targetScore: 25, botCountPerTeam: 4 },
  },
  {
    id: 'practice',
    name: 'Mashq rejimi',
    desc: "Cheksiz o'q-dorilar va harakatlanuvchi nishonlar bilan qurollarni sinash hamda merganlikni oshirish.",
    defaults: { durationSeconds: 600, botCountPerTeam: 4 },
  },
  {
    id: 'bot_match',
    name: "Botlar bilan o'yin",
    desc: "Sun'iy intellekt jamoalariga qarshi muvozanatli taktik to'qnashuv.",
    defaults: { durationSeconds: 180, targetScore: 20, botCountPerTeam: 5 },
  },
  {
    id: 'custom',
    name: "Maxsus o'yin",
    desc: "Raund davomiyligi, ishtirokchilar soni, qiyinlik va maqsadli ballni o'zingiz moslang.",
    defaults: {},
  },
];

const DIFFICULTIES: Array<{ id: DifficultyLevel; label: string }> = [
  { id: 'easy', label: 'Oson' },
  { id: 'medium', label: "O'rta" },
  { id: 'hard', label: 'Qiyin' },
  { id: 'expert', label: 'Ekspert' },
];

export function CreateMatchScreen({
  config,
  onChange,
  onStartMatch,
  onBack,
}: CreateMatchScreenProps) {
  const activeMap = MAPS.find((m) => m.id === config.mapId) || MAPS[0];

  const selectMode = (modeItem: (typeof GAME_MODES)[number]) => {
    audioEngine.playUiClick();
    onChange({
      ...config,
      mode: modeItem.id,
      ...modeItem.defaults,
    });
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
          <h1 className="font-display text-2xl font-bold tracking-wider">O'YIN YARATISH</h1>
        </div>

        <button
          onClick={() => {
            audioEngine.playUiClick();
            onStartMatch();
          }}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-display font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          <Play className="w-4 h-4" />
          <span>JANGNI BOSHLASH</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: 5 Game Modes */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-200 mb-4">O'yin rejimi</h2>
            {GAME_MODES.map((m) => {
              const active = config.mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => selectMode(m)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-orange-500/12 border-orange-500'
                      : 'bg-[#12161D] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-base font-bold text-zinc-100">{m.name}</span>
                    {active && <span className="text-xs font-semibold text-orange-400">Tanlangan</span>}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{m.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Right: Configuration */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#12161D] border border-zinc-800 rounded-xl p-6 space-y-6">
              <h2 className="font-display text-lg font-bold text-zinc-200">O'yin sozlamalari</h2>

              {/* Team Choice */}
              <div>
                <span className="block text-xs font-semibold text-zinc-400 mb-2.5">Jamoani tanlash</span>
                <div className="grid grid-cols-2 gap-3">
                  {(['A', 'B'] as TeamId[]).map((tid) => {
                    const tInfo = TEAM_NAMES[tid];
                    const selected = config.team === tid;
                    return (
                      <button
                        key={tid}
                        onClick={() => {
                          audioEngine.playUiClick();
                          onChange({ ...config, team: tid });
                        }}
                        className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-orange-500/12 border-orange-500'
                            : 'bg-[#0C0F14] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-sm font-bold text-zinc-100">{tInfo.name}</div>
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-1">{tInfo.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <span className="block text-xs font-semibold text-zinc-400 mb-2.5">
                  Sun'iy intellekt qiyinligi
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        audioEngine.playUiClick();
                        onChange({ ...config, difficulty: d.id });
                      }}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        config.difficulty === d.id
                          ? 'bg-orange-600 border-orange-500 text-white'
                          : 'bg-[#0C0F14] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Duration, Bot Count, Target/Rounds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-400">Davomiylik (soniya)</span>
                    <span className="font-mono-num text-orange-400 font-semibold">
                      {config.durationSeconds} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={600}
                    step={30}
                    value={config.durationSeconds}
                    onChange={(e) => onChange({ ...config, durationSeconds: Number(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-400">Har bir jamoadagi jangchilar</span>
                    <span className="font-mono-num text-orange-400 font-semibold">
                      {config.botCountPerTeam} vs {config.botCountPerTeam}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={config.botCountPerTeam}
                    onChange={(e) => onChange({ ...config, botCountPerTeam: Number(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                {config.mode === 'classic' ? (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-400">Raundlar soni</span>
                      <span className="font-mono-num text-orange-400 font-semibold">
                        {config.roundLimit} raund
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={2}
                      value={config.roundLimit}
                      onChange={(e) => onChange({ ...config, roundLimit: Number(e.target.value) })}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-400">G'alaba uchun ball</span>
                      <span className="font-mono-num text-orange-400 font-semibold">
                        {config.targetScore} ball
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={5}
                      value={config.targetScore}
                      onChange={(e) => onChange({ ...config, targetScore: Number(e.target.value) })}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Map Picker */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-zinc-400">Tanlangan xarita</span>
                  <span className="text-xs text-orange-400 font-semibold">{activeMap.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {MAPS.map((m) => {
                    const selected = config.mapId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          audioEngine.playUiClick();
                          onChange({ ...config, mapId: m.id });
                        }}
                        className={`group rounded-lg overflow-hidden border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-orange-500 ring-1 ring-orange-500'
                            : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img
                          src={getMapThumbnailUrl(m)}
                          alt={m.name}
                          className="w-full h-14 object-cover"
                        />
                        <div className="p-1.5 bg-[#0C0F14] text-[11px] font-medium text-zinc-200 truncate">
                          {m.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
