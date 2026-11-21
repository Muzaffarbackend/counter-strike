import { useEffect, useState } from 'react';
import { CharacterSelectionScreen } from './components/CharacterSelectionScreen';
import { CreateMatchScreen } from './components/CreateMatchScreen';
import { ExitScreen } from './components/ExitScreen';
import { GameMatchView } from './components/GameMatchView';
import { MainMenu } from './components/MainMenu';
import { MapSelectionScreen } from './components/MapSelectionScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { RegistrationModal } from './components/RegistrationModal';
import { SettingsScreen } from './components/SettingsScreen';
import { WeaponInventoryScreen } from './components/WeaponInventoryScreen';
import { getMapMeta } from './data/maps';
import {
  createInitialProfile,
  loadLoadout,
  loadMatchConfig,
  loadProfile,
  loadSettings,
  saveLoadout,
  saveMatchConfig,
  saveProfile,
  saveSettings,
} from './data/storage';
import { audioEngine } from './engine/AudioEngine';
import {
  EquippedLoadout,
  GameModeId,
  GameSettings,
  MatchConfig,
  MatchResult,
  PlayerProfile,
  ScreenRoute,
} from './types/game';

const MODE_NAMES: Record<GameModeId, string> = {
  classic: "Klassik o'yin",
  tdm: "Jamoaviy o'lim janggi",
  practice: 'Mashq rejimi',
  bot_match: "Botlar bilan o'yin",
  custom: "Maxsus o'yin",
};

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => loadProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [loadout, setLoadout] = useState<EquippedLoadout>(() => loadLoadout());
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(() => loadMatchConfig());
  const [route, setRoute] = useState<ScreenRoute>('menu');

  useEffect(() => {
    audioEngine.syncSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (profile && route !== 'playing') {
      const unlockAudio = () => {
        audioEngine.startMenuMusic();
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      return () => window.removeEventListener('pointerdown', unlockAudio);
    }
  }, [profile, route]);

  const handleRegister = (username: string, avatarId: string) => {
    const created = createInitialProfile(username, avatarId);
    setProfile(created);
    setRoute('menu');
  };

  const updateProfile = (next: PlayerProfile) => {
    setProfile(next);
    saveProfile(next);
  };

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    audioEngine.syncSettings(next);
  };

  const updateLoadout = (next: EquippedLoadout) => {
    setLoadout(next);
    saveLoadout(next);
  };

  const updateMatchConfig = (next: MatchConfig) => {
    setMatchConfig(next);
    saveMatchConfig(next);
  };

  const handleMatchEndRecord = (result: MatchResult) => {
    if (!profile) return;
    const totalXp = profile.xp + result.xpEarned;
    const nextLevel = Math.floor(totalXp / 500) + 1;
    const mapName = getMapMeta(result.mapId).name;
    const modeName = MODE_NAMES[result.mode];
    const nowStr = new Date().toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const updated: PlayerProfile = {
      ...profile,
      xp: totalXp,
      level: nextLevel,
      matchesPlayed: profile.matchesPlayed + 1,
      wins: profile.wins + (result.won ? 1 : 0),
      kills: profile.kills + result.kills,
      deaths: profile.deaths + result.deaths,
      shotsFired: profile.shotsFired + (result.accuracy > 0 ? 25 : 5),
      shotsHit: profile.shotsHit + Math.round((result.accuracy / 100) * 25),
      matchHistory: [
        {
          id: `${Date.now()}`,
          date: nowStr,
          mapName,
          modeName,
          team: result.playerTeam,
          won: result.won,
          kills: result.kills,
          deaths: result.deaths,
          scoreA: result.scoreA,
          scoreB: result.scoreB,
        },
        ...profile.matchHistory,
      ].slice(0, 20),
    };
    updateProfile(updated);
  };

  if (!profile) {
    return <RegistrationModal onRegister={handleRegister} />;
  }

  if (route === 'playing') {
    return (
      <GameMatchView
        playerName={profile.username}
        config={matchConfig}
        settings={settings}
        loadout={loadout}
        onUpdateSettings={updateSettings}
        onMatchEndRecord={handleMatchEndRecord}
        onChangeMap={() => {
          audioEngine.startMenuMusic();
          setRoute('maps');
        }}
        onMainMenu={() => {
          audioEngine.startMenuMusic();
          setRoute('menu');
        }}
        onExitGame={() => {
          audioEngine.stopMenuMusic();
          setRoute('exit');
        }}
      />
    );
  }

  if (route === 'create_match') {
    return (
      <CreateMatchScreen
        config={matchConfig}
        onChange={updateMatchConfig}
        onStartMatch={() => setRoute('playing')}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'maps') {
    return (
      <MapSelectionScreen
        selectedMapId={matchConfig.mapId}
        onSelectMap={(mapId) => updateMatchConfig({ ...matchConfig, mapId })}
        onStartMatch={() => setRoute('playing')}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'characters') {
    return (
      <CharacterSelectionScreen
        selectedTeam={matchConfig.team}
        selectedCharacterId={matchConfig.characterId}
        equippedWeaponId={loadout.primaryWeaponId}
        onSelect={(team, characterId) =>
          updateMatchConfig({ ...matchConfig, team, characterId })
        }
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'inventory') {
    return (
      <WeaponInventoryScreen
        loadout={loadout}
        onUpdateLoadout={updateLoadout}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onChange={updateSettings}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'profile') {
    return (
      <ProfileScreen
        profile={profile}
        onUpdateProfile={updateProfile}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'exit') {
    return (
      <ExitScreen
        profile={profile}
        onReturnToMenu={() => {
          audioEngine.startMenuMusic();
          setRoute('menu');
        }}
      />
    );
  }

  return (
    <MainMenu
      profile={profile}
      matchConfig={matchConfig}
      loadout={loadout}
      onNavigate={(r) => {
        if (r === 'exit') audioEngine.stopMenuMusic();
        setRoute(r);
      }}
      onQuickPlay={() => setRoute('playing')}
    />
  );
}
