import { useEffect, useRef, useState } from 'react';
import { getMapMeta } from '../data/maps';
import { GameEngine } from '../engine/GameEngine';
import {
  EquippedLoadout,
  GameSettings,
  HUDState,
  MatchConfig,
  MatchResult,
} from '../types/game';
import { GameHUD } from './GameHUD';
import { SettingsScreen } from './SettingsScreen';

interface GameMatchViewProps {
  playerName: string;
  config: MatchConfig;
  settings: GameSettings;
  loadout: EquippedLoadout;
  onUpdateSettings: (next: GameSettings) => void;
  onMatchEndRecord: (result: MatchResult) => void;
  onChangeMap: () => void;
  onMainMenu: () => void;
  onExitGame: () => void;
}

export function GameMatchView({
  playerName,
  config,
  settings,
  loadout,
  onUpdateSettings,
  onMatchEndRecord,
  onChangeMap,
  onMainMenu,
  onExitGame,
}: GameMatchViewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HUDState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showInGameSettings, setShowInGameSettings] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loadPct, setLoadPct] = useState(10);
  const [loadLabel, setLoadLabel] = useState('Tayyorlanmoqda...');
  const [loadingDone, setLoadingDone] = useState(false);

  const onMatchEndRecordRef = useRef(onMatchEndRecord);
  onMatchEndRecordRef.current = onMatchEndRecord;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    setLoadingDone(false);
    setMatchResult(null);
    setIsPaused(false);

    const engine = new GameEngine(container, playerName, config, settings, loadout, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onPauseRequest: () => setIsPaused(true),
      onMatchEnd: (res) => {
        setMatchResult(res);
        onMatchEndRecordRef.current(res);
      },
      onLoadProgress: (pct, label) => {
        setLoadPct(pct);
        setLoadLabel(label);
        if (pct >= 100) {
          window.setTimeout(() => setLoadingDone(true), 220);
        }
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Intentionally initialize once per match config/mapId mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mapId, config.mode, config.team, config.characterId]);

  useEffect(() => {
    engineRef.current?.updateSettings(settings);
  }, [settings]);

  const mapMeta = getMapMeta(config.mapId);

  return (
    <div className="relative w-full h-full bg-[#090B0E] overflow-hidden">
      {/* Isolated WebGL Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Loading Screen with Progress Indicator */}
      {!loadingDone && (
        <div className="fixed inset-0 z-40 bg-[#090B0E] flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md space-y-4 text-center">
            <p className="text-xs font-semibold text-orange-500 tracking-widest">
              XARITA YUKLANMOQDA
            </p>
            <h2 className="font-display text-3xl font-bold text-zinc-100">{mapMeta.name}</h2>
            <p className="text-xs text-zinc-400">{mapMeta.description}</p>
            <div className="w-full h-2.5 bg-[#12161D] border border-zinc-800 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-orange-500 transition-all duration-200"
                style={{ width: `${loadPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400 font-mono-num">
              <span>{loadLabel}</span>
              <span>{loadPct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tactical FPS HUD + Pause + Match End */}
      {loadingDone && !showInGameSettings && (
        <GameHUD
          hud={hud}
          settings={settings}
          isPaused={isPaused}
          matchResult={matchResult}
          onResume={() => {
            setIsPaused(false);
            engineRef.current?.resume();
          }}
          onRestart={() => {
            setMatchResult(null);
            setIsPaused(false);
            engineRef.current?.restartMatch();
          }}
          onChangeMap={onChangeMap}
          onOpenSettings={() => setShowInGameSettings(true)}
          onMainMenu={onMainMenu}
          onExitGame={onExitGame}
          onLockPointer={() => engineRef.current?.requestPointerLock()}
        />
      )}

      {/* In-Match Settings Drawer */}
      {showInGameSettings && (
        <div className="fixed inset-0 z-50">
          <SettingsScreen
            settings={settings}
            onChange={onUpdateSettings}
            onBack={() => setShowInGameSettings(false)}
          />
        </div>
      )}
    </div>
  );
}
