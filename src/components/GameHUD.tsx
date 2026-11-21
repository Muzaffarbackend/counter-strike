import { useEffect, useRef, useState } from 'react';
import { TEAM_NAMES } from '../data/characters';
import { getMapMeta } from '../data/maps';
import { audioEngine } from '../engine/AudioEngine';
import { GameSettings, HUDState, MatchResult } from '../types/game';

interface GameHUDProps {
  hud: HUDState | null;
  settings: GameSettings;
  isPaused: boolean;
  matchResult: MatchResult | null;
  onResume: () => void;
  onRestart: () => void;
  onChangeMap: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
  onExitGame: () => void;
  onLockPointer: () => void;
}

export function GameHUD({
  hud,
  settings,
  isPaused,
  matchResult,
  onResume,
  onRestart,
  onChangeMap,
  onOpenSettings,
  onMainMenu,
  onExitGame,
  onLockPointer,
}: GameHUDProps) {
  const miniMapRef = useRef<HTMLCanvasElement | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(false);
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Draw Mini-map Canvas
  useEffect(() => {
    const canvas = miniMapRef.current;
    if (!canvas || !hud) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 148;
    const scale = size / hud.mapSize;
    const half = size / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(11, 14, 19, 0.85)';
    ctx.fillRect(0, 0, size, size);

    // Map obstacles
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    for (const b of hud.mapBounds) {
      const rx = half + (b.x - b.w / 2) * scale;
      const rz = half + (b.z - b.d / 2) * scale;
      ctx.fillRect(rx, rz, b.w * scale, b.d * scale);
    }

    // Entities
    for (const ent of hud.miniMapEntities) {
      if (!ent.alive) continue;
      const ex = half + ent.x * scale;
      const ez = half + ent.z * scale;
      ctx.fillStyle = ent.isPlayer ? '#FACC15' : ent.team === 'A' ? '#F97316' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(ex, ez, ent.isPlayer ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();

      if (ent.isPlayer) {
        // Direction chevron
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex, ez);
        ctx.lineTo(
          ex - Math.sin(hud.playerYaw) * 10,
          ez - Math.cos(hud.playerYaw) * 10
        );
        ctx.stroke();
      }
    }
  }, [hud]);

  if (!hud) return null;

  const mins = Math.floor(hud.timeRemaining / 60);
  const secs = String(hud.timeRemaining % 60).padStart(2, '0');
  const ch = settings.crosshair;
  const spread = Math.max(0, hud.crosshairSpread);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Damage Vignette Flash */}
      {hud.damageFlashTimer > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 110px rgba(239, 68, 68, 0.65)',
          }}
        />
      )}

      {/* Sniper Scope Overlay */}
      {hud.isAds && hud.weaponCategory === 'sniper' && !isPaused && !matchResult && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full border-[140px] md:border-[220px] border-black/95 rounded-full scale-125" />
          <div className="absolute inset-x-0 h-[1px] bg-black/80" />
          <div className="absolute inset-y-0 w-[1px] bg-black/80" />
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Top Center: Score & Round Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#0D1016]/90 border border-zinc-800 px-5 py-2 rounded-lg">
        <div className="text-right">
          <div className="text-[10px] text-orange-400 font-semibold">JAMOA A</div>
          <div className="font-mono-num text-xl font-bold text-zinc-100">{hud.scoreA}</div>
        </div>
        <div className="px-4 border-x border-zinc-800 text-center">
          <div className="font-mono-num text-xl font-bold text-zinc-100">
            {mins}:{secs}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono-num">
            {hud.maxRounds > 1 ? `RAUND ${hud.roundNumber}/${hud.maxRounds}` : 'JANG'}
          </div>
        </div>
        <div className="text-left">
          <div className="text-[10px] text-sky-400 font-semibold">JAMOA B</div>
          <div className="font-mono-num text-xl font-bold text-zinc-100">{hud.scoreB}</div>
        </div>
      </div>

      {/* Top Left: Mini-map + FPS */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="border border-zinc-700/80 rounded-lg overflow-hidden shadow-lg">
          <canvas ref={miniMapRef} width={148} height={148} className="block" />
        </div>
        {settings.showFps && (
          <div className="px-2.5 py-1 bg-[#0D1016]/85 border border-zinc-800 rounded text-[11px] font-mono-num text-emerald-400 w-fit">
            FPS: {hud.fps}
          </div>
        )}
      </div>

      {/* Top Right: Killfeed */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 max-w-xs">
        {hud.killFeed.map((kf) => (
          <div
            key={kf.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0D1016]/90 border border-zinc-800 rounded text-xs"
          >
            <span className={kf.killerTeam === 'A' ? 'text-orange-400 font-semibold' : 'text-sky-400 font-semibold'}>
              {kf.killer}
            </span>
            <span className="text-zinc-500">[{kf.weaponName}]</span>
            <span className={kf.victimTeam === 'A' ? 'text-orange-400 font-semibold' : 'text-sky-400 font-semibold'}>
              {kf.victim}
            </span>
          </div>
        ))}
      </div>

      {/* Center Dynamic Crosshair & Hit Marker */}
      {!isPaused && !matchResult && !(hud.isAds && hud.weaponCategory === 'sniper') && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {ch.centerDot && (
              <div
                style={{
                  width: ch.thickness,
                  height: ch.thickness,
                  backgroundColor: ch.color,
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                bottom: ch.gap + spread,
                width: ch.thickness,
                height: ch.size,
                backgroundColor: ch.color,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: ch.gap + spread,
                width: ch.thickness,
                height: ch.size,
                backgroundColor: ch.color,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: ch.gap + spread,
                width: ch.size,
                height: ch.thickness,
                backgroundColor: ch.color,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: ch.gap + spread,
                width: ch.size,
                height: ch.thickness,
                backgroundColor: ch.color,
              }}
            />

            {hud.hitMarkerTimer > 0 && (
              <div className="absolute w-6 h-6 pointer-events-none">
                <div className="absolute inset-0 border-t-2 border-l-2 border-orange-400 rotate-45 scale-75" />
                <div className="absolute inset-0 border-b-2 border-r-2 border-orange-400 rotate-45 scale-75" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Center Banners & Interact Prompt */}
      {hud.roundBanner && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-orange-600/95 text-white font-display text-lg font-bold tracking-wider rounded-lg shadow-xl">
          {hud.roundBanner}
        </div>
      )}
      {hud.notification && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#12161D]/95 border border-orange-500/60 text-zinc-100 text-xs font-medium rounded-lg">
          {hud.notification}
        </div>
      )}
      {hud.interactPrompt && !isPaused && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#0D1016]/95 border border-orange-500 text-orange-300 text-xs font-semibold rounded-lg">
          {hud.interactPrompt}
        </div>
      )}

      {/* Bottom Left: Health, Armor, Stamina */}
      <div className="absolute bottom-5 left-5 flex items-end gap-4 bg-[#0D1016]/90 border border-zinc-800 px-5 py-3.5 rounded-xl">
        <div>
          <div className="text-[11px] text-zinc-400">SOG'LIQ</div>
          <div
            className={`font-mono-num text-3xl font-bold ${
              hud.health <= 25 ? 'text-red-400' : 'text-zinc-100'
            }`}
          >
            {hud.health}
          </div>
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full ${hud.health <= 25 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
            />
          </div>
        </div>

        <div className="pl-4 border-l border-zinc-800">
          <div className="text-[11px] text-zinc-400">ZIRH</div>
          <div className="font-mono-num text-2xl font-bold text-sky-400">{hud.armor}</div>
          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${(hud.armor / hud.maxArmor) * 100}%` }}
            />
          </div>
        </div>

        <div className="pl-4 border-l border-zinc-800 text-[11px] text-zinc-400 space-y-0.5">
          <div>{hud.isCrouching ? "Cho'kkalagan" : hud.isSprinting ? 'Yugurish' : 'Tik'}</div>
          <div className="font-mono-num text-zinc-300">Chidamlilik: {hud.stamina}%</div>
        </div>
      </div>

      {/* Bottom Right: Equipment Slots & Ammo */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 text-[11px]">
          {[
            { slot: 1, label: '1 · Asosiy' },
            { slot: 2, label: '2 · Zaxira' },
            { slot: 3, label: '3 · Yaqin/Qalqon' },
          ].map((s) => (
            <span
              key={s.slot}
              className={`px-2.5 py-1 rounded border font-semibold ${
                hud.activeSlot === s.slot
                  ? 'bg-orange-600/90 border-orange-400 text-white'
                  : 'bg-[#0D1016]/85 border-zinc-800 text-zinc-400'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>

        <div className="bg-[#0D1016]/90 border border-zinc-800 px-5 py-3 rounded-xl text-right min-w-[210px]">
          <div className="text-xs font-semibold text-orange-400">{hud.weaponName}</div>
          {hud.isReloading ? (
            <div className="font-display text-lg font-bold text-amber-300 mt-0.5">
              QAYTA O'QLANMOQDA...
            </div>
          ) : hud.weaponCategory === 'melee' || hud.weaponCategory === 'shield' ? (
            <div className="font-display text-lg font-bold text-zinc-200 mt-0.5">
              {hud.isShieldBlocking ? 'HIMOYA FAOL' : 'TAYYOR'}
            </div>
          ) : (
            <div className="font-mono-num text-3xl font-bold text-zinc-100 mt-0.5">
              {hud.ammoInMag}{' '}
              <span className="text-base text-zinc-500 font-normal">/ {hud.ammoReserve}</span>
            </div>
          )}
        </div>
      </div>

      {/* Click-to-Lock Hint when unlocked & not paused */}
      {!hud.isPointerLocked && !isPaused && !matchResult && (
        <div
          onClick={onLockPointer}
          className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-auto cursor-pointer"
        >
          <div className="bg-[#12161D] border border-orange-500 rounded-xl px-8 py-5 text-center shadow-2xl">
            <p className="font-display text-xl font-bold text-zinc-100">
              BOSHQARUVNI FAOLASHTIRISH UCHUN BOSING
            </p>
            <p className="text-xs text-zinc-400 mt-1.5">
              WASD: Yurish · Sichqoncha: Nishon · Chap tugma: Otish · R: O'qlash · F: Ko'rish · E: Ta'sir · ESC: Pauza
            </p>
          </div>
        </div>
      )}

      {/* Tab Scoreboard */}
      {showScoreboard && !isPaused && !matchResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
          <div className="w-full max-w-2xl bg-[#12161D] border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#0D1016] border-b border-zinc-800 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-zinc-100">
                NATIJALAR JADVALI
              </span>
              <span className="font-mono-num text-xs text-zinc-400">
                Jamoa A {hud.scoreA} : {hud.scoreB} Jamoa B
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0E13] text-zinc-400">
                <tr>
                  <th className="py-2.5 px-5">O'yinchi</th>
                  <th className="py-2.5 px-4">Jamoa</th>
                  <th className="py-2.5 px-4">Holat</th>
                  <th className="py-2.5 px-4 text-right">Zarbalar</th>
                  <th className="py-2.5 px-5 text-right">O'limlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {hud.scoreboard.map((row) => (
                  <tr key={row.id} className={row.isPlayer ? 'bg-orange-500/10' : ''}>
                    <td className="py-2.5 px-5 font-semibold text-zinc-100">
                      {row.name} {row.isPlayer ? '(Siz)' : ''}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={row.team === 'A' ? 'text-orange-400' : 'text-sky-400'}>
                        {TEAM_NAMES[row.team].short}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400">
                      {row.alive ? 'Tirik' : 'Kutilmoqda'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num font-bold text-zinc-100">
                      {row.kills}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono-num text-zinc-400">
                      {row.deaths}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ESC Pause Menu (All 6 required options) */}
      {isPaused && !matchResult && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center pointer-events-auto p-6">
          <div className="w-full max-w-sm bg-[#12161D] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-zinc-100">PAUZA MENYUSI</h2>
              <p className="text-xs text-zinc-400 mt-1">O'yin vaqtincha to'xtatildi</p>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { label: "O'yinni davom ettirish", action: onResume, primary: true },
                { label: "O'yinni qayta boshlash", action: onRestart },
                { label: "Xaritani o'zgartirish", action: onChangeMap },
                { label: 'Sozlamalar', action: onOpenSettings },
                { label: 'Bosh menyu', action: onMainMenu },
                { label: "O'yindan chiqish", action: onExitGame, danger: true },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => {
                    audioEngine.playUiClick();
                    btn.action();
                  }}
                  className={`w-full py-3 px-4 rounded-lg font-display font-bold text-sm tracking-wide transition-colors cursor-pointer ${
                    btn.primary
                      ? 'bg-orange-600 hover:bg-orange-500 text-white'
                      : btn.danger
                      ? 'bg-red-950/60 hover:bg-red-900/70 border border-red-900 text-red-200'
                      : 'bg-[#0B0E13] hover:bg-[#191F29] border border-zinc-800 text-zinc-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat Match End Screen */}
      {matchResult && (
        <div className="absolute inset-0 bg-black/82 flex items-center justify-center pointer-events-auto p-6">
          <div className="w-full max-w-xl bg-[#12161D] border border-zinc-700 rounded-xl p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-400 mb-1">
                {getMapMeta(matchResult.mapId).name}
              </p>
              <h2
                className={`font-display text-4xl font-bold tracking-wider ${
                  matchResult.won ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {matchResult.won ? "G'ALABA!" : "MAG'LUBIYAT"}
              </h2>
              <p className="font-mono-num text-xl text-zinc-200 mt-2">
                Jamoa A {matchResult.scoreA} : {matchResult.scoreB} Jamoa B
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0B0E13] border border-zinc-800 rounded-lg p-3.5 text-center">
                <div className="text-[11px] text-zinc-400">Zarbalar / O'lim</div>
                <div className="font-mono-num text-xl font-bold text-zinc-100 mt-1">
                  {matchResult.kills} / {matchResult.deaths}
                </div>
              </div>
              <div className="bg-[#0B0E13] border border-zinc-800 rounded-lg p-3.5 text-center">
                <div className="text-[11px] text-zinc-400">Aniqlik</div>
                <div className="font-mono-num text-xl font-bold text-zinc-100 mt-1">
                  {matchResult.accuracy}%
                </div>
              </div>
              <div className="bg-[#0B0E13] border border-zinc-800 rounded-lg p-3.5 text-center">
                <div className="text-[11px] text-zinc-400">Olingan tajriba</div>
                <div className="font-mono-num text-xl font-bold text-orange-400 mt-1">
                  +{matchResult.xpEarned} XP
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  audioEngine.playUiClick();
                  onRestart();
                }}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-display font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                QAYTA O'YNASH
              </button>
              <button
                onClick={() => {
                  audioEngine.playUiClick();
                  onMainMenu();
                }}
                className="flex-1 py-3 bg-[#0B0E13] hover:bg-[#191F29] border border-zinc-700 text-zinc-200 font-display font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                BOSH MENYU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
