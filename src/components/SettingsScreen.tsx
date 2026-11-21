import { useEffect, useState } from 'react';
import { ArrowLeft, Maximize, RotateCcw } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../data/storage';
import { audioEngine } from '../engine/AudioEngine';
import { GameSettings, GraphicsQuality, KeyBindings } from '../types/game';

interface SettingsScreenProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onBack: () => void;
}

const GRAPHICS_LEVELS: Array<{ id: GraphicsQuality; label: string }> = [
  { id: 'low', label: 'Past' },
  { id: 'medium', label: "O'rta" },
  { id: 'high', label: 'Yuqori' },
  { id: 'ultra', label: 'Ultra' },
];

const KEY_LABELS: Array<{ key: keyof KeyBindings; label: string }> = [
  { key: 'forward', label: 'Oldinga yurish' },
  { key: 'backward', label: 'Orqaga yurish' },
  { key: 'left', label: 'Chapga siljish' },
  { key: 'right', label: "O'ngga siljish" },
  { key: 'jump', label: 'Sakrash' },
  { key: 'sprint', label: 'Yugurish' },
  { key: 'crouch', label: "Cho'kkalash" },
  { key: 'reload', label: "Qayta o'qlash" },
  { key: 'interact', label: "O'zaro ta'sir" },
  { key: 'inspect', label: 'Qurolni ko\'zdan kechirish' },
];

const CROSSHAIR_COLORS = ['#22C55E', '#F97316', '#38BDF8', '#FACC15', '#EF4444', '#FFFFFF'];

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  const [tab, setTab] = useState<'graphics' | 'audio' | 'controls' | 'display'>('graphics');
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);

  useEffect(() => {
    if (!listeningKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code !== 'Escape') {
        onChange({
          ...settings,
          keyBindings: {
            ...settings.keyBindings,
            [listeningKey]: e.code,
          },
        });
      }
      setListeningKey(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [listeningKey, settings, onChange]);

  const toggleFullscreen = async () => {
    audioEngine.playUiClick();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore iframe fullscreen restriction
    }
  };

  return (
    <div className="w-full h-full bg-[#090B0E] text-zinc-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 border-b border-zinc-800/80 bg-[#0D1016]">
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
          <h1 className="font-display text-2xl font-bold tracking-wider">SOZLAMALAR</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#12161D] border border-zinc-800 rounded-lg">
            {[
              { id: 'graphics', label: 'Grafika' },
              { id: 'audio', label: 'Ovoz' },
              { id: 'controls', label: 'Boshqaruv' },
              { id: 'display', label: 'Ekran va Nishon' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  audioEngine.playUiClick();
                  setTab(t.id as typeof tab);
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  tab === t.id ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              audioEngine.playUiClick();
              onChange(DEFAULT_SETTINGS);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#151922] hover:bg-[#1E2430] border border-zinc-800 rounded-lg text-xs text-zinc-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Asl holat</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto bg-[#12161D] border border-zinc-800 rounded-xl p-6 space-y-6">
          {tab === 'graphics' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-100 mb-1">Grafika sifati</h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Soyalar aniqligi, antialiasing va muhit zarrachalari sonini belgilaydi.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {GRAPHICS_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => {
                        audioEngine.playUiClick();
                        onChange({ ...settings, graphics: lvl.id });
                      }}
                      className={`py-3 px-4 rounded-lg border text-sm font-bold transition-colors cursor-pointer ${
                        settings.graphics === lvl.id
                          ? 'bg-orange-600 border-orange-500 text-white'
                          : 'bg-[#0B0E13] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-300 font-semibold">Ko'rish burchagi (FOV)</span>
                  <span className="font-mono-num text-orange-400 font-bold">{settings.fov}°</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={105}
                  step={1}
                  value={settings.fov}
                  onChange={(e) => onChange({ ...settings, fov: Number(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-zinc-100">Ovoz balandligi</h2>
              {[
                { key: 'masterVolume' as const, label: 'Umumiy ovoz' },
                { key: 'musicVolume' as const, label: 'Menyu musiqasi' },
                { key: 'sfxVolume' as const, label: 'Jang va muhit effektlari' },
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-300 font-semibold">{item.label}</span>
                    <span className="font-mono-num text-orange-400 font-bold">
                      {Math.round(settings[item.key] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings[item.key]}
                    onChange={(e) => onChange({ ...settings, [item.key]: Number(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-300 font-semibold">Sichqoncha sezgirligi</span>
                    <span className="font-mono-num text-orange-400 font-bold">
                      {settings.mouseSensitivity.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.05}
                    value={settings.mouseSensitivity}
                    onChange={(e) =>
                      onChange({ ...settings, mouseSensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <label className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-zinc-800 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium text-zinc-200">
                    Sichqoncha Y o'qini teskari qilish
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.invertMouse}
                    onChange={(e) => onChange({ ...settings, invertMouse: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                </label>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-3">
                  Tugmalarni sozlash (o'zgartirish uchun bosing)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {KEY_LABELS.map((item) => {
                    const isWaiting = listeningKey === item.key;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between px-4 py-2.5 bg-[#0B0E13] border border-zinc-800 rounded-lg"
                      >
                        <span className="text-xs text-zinc-300">{item.label}</span>
                        <button
                          onClick={() => {
                            audioEngine.playUiClick();
                            setListeningKey(item.key);
                          }}
                          className={`px-3 py-1 rounded text-xs font-mono-num font-bold cursor-pointer ${
                            isWaiting
                              ? 'bg-orange-600 text-white'
                              : 'bg-[#191F29] text-orange-400 border border-zinc-700 hover:border-orange-500'
                          }`}
                        >
                          {isWaiting ? 'Tugma bosing...' : settings.keyBindings[item.key]}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'display' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center gap-2 p-3.5 bg-[#0B0E13] hover:bg-[#171D27] border border-zinc-800 rounded-lg text-sm font-semibold text-zinc-200 transition-colors cursor-pointer"
                >
                  <Maximize className="w-4 h-4 text-orange-400" />
                  <span>To'liq ekran rejimini almashtirish</span>
                </button>

                <label className="flex items-center justify-between p-3.5 bg-[#0B0E13] border border-zinc-800 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium text-zinc-200">FPS ko'rsatkichini ko'rsatish</span>
                  <input
                    type="checkbox"
                    checked={settings.showFps}
                    onChange={(e) => onChange({ ...settings, showFps: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                </label>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-300 font-semibold">Tasvir aniqligi (Ruxsat masshtabi)</span>
                  <span className="font-mono-num text-orange-400 font-bold">
                    {Math.round(settings.resolutionScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.1}
                  value={settings.resolutionScale}
                  onChange={(e) =>
                    onChange({ ...settings, resolutionScale: Number(e.target.value) })
                  }
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Crosshair Customizer + Live Preview */}
              <div className="pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-7 space-y-4">
                  <h3 className="font-display text-base font-bold text-zinc-100">
                    Nishon (Crosshair) sozlamalari
                  </h3>

                  <div className="flex items-center gap-2">
                    {CROSSHAIR_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() =>
                          onChange({
                            ...settings,
                            crosshair: { ...settings.crosshair, color: col },
                          })
                        }
                        className={`w-7 h-7 rounded-md border cursor-pointer ${
                          settings.crosshair.color === col
                            ? 'border-white scale-110'
                            : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">
                        Uzunlik: {settings.crosshair.size}px
                      </span>
                      <input
                        type="range"
                        min={4}
                        max={18}
                        value={settings.crosshair.size}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            crosshair: { ...settings.crosshair, size: Number(e.target.value) },
                          })
                        }
                        className="w-full accent-orange-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">
                        Qalinlik: {settings.crosshair.thickness}px
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={settings.crosshair.thickness}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            crosshair: {
                              ...settings.crosshair,
                              thickness: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-orange-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">
                        Bo'shliq: {settings.crosshair.gap}px
                      </span>
                      <input
                        type="range"
                        min={2}
                        max={14}
                        value={settings.crosshair.gap}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            crosshair: { ...settings.crosshair, gap: Number(e.target.value) },
                          })
                        }
                        className="w-full accent-orange-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.crosshair.centerDot}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          crosshair: { ...settings.crosshair, centerDot: e.target.checked },
                        })
                      }
                      className="accent-orange-500"
                    />
                    <span>Markaziy nuqtani ko'rsatish</span>
                  </label>
                </div>

                {/* Live Crosshair Preview Box */}
                <div className="sm:col-span-5 h-36 bg-[#080A0D] border border-zinc-800 rounded-xl flex items-center justify-center relative">
                  <div className="relative flex items-center justify-center">
                    {settings.crosshair.centerDot && (
                      <div
                        style={{
                          width: settings.crosshair.thickness,
                          height: settings.crosshair.thickness,
                          backgroundColor: settings.crosshair.color,
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: settings.crosshair.gap,
                        width: settings.crosshair.thickness,
                        height: settings.crosshair.size,
                        backgroundColor: settings.crosshair.color,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: settings.crosshair.gap,
                        width: settings.crosshair.thickness,
                        height: settings.crosshair.size,
                        backgroundColor: settings.crosshair.color,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: settings.crosshair.gap,
                        width: settings.crosshair.size,
                        height: settings.crosshair.thickness,
                        backgroundColor: settings.crosshair.color,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: settings.crosshair.gap,
                        width: settings.crosshair.size,
                        height: settings.crosshair.thickness,
                        backgroundColor: settings.crosshair.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
