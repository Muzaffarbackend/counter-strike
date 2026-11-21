import {
  Crosshair,
  LogOut,
  Map as MapIcon,
  Play,
  PlusSquare,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { getCharacterById, TEAM_NAMES } from '../data/characters';
import { getMapMeta } from '../data/maps';
import { AVATAR_OPTIONS } from '../data/storage';
import { getWeaponById } from '../data/weapons';
import { audioEngine } from '../engine/AudioEngine';
import { EquippedLoadout, MatchConfig, PlayerProfile, ScreenRoute } from '../types/game';
import { ShowcaseViewport } from './ShowcaseViewport';

interface MainMenuProps {
  profile: PlayerProfile;
  matchConfig: MatchConfig;
  loadout: EquippedLoadout;
  onNavigate: (route: ScreenRoute) => void;
  onQuickPlay: () => void;
}

export function MainMenu({
  profile,
  matchConfig,
  loadout,
  onNavigate,
  onQuickPlay,
}: MainMenuProps) {
  const charSpec = getCharacterById(matchConfig.characterId);
  const mapMeta = getMapMeta(matchConfig.mapId);
  const primaryWeapon = getWeaponById(loadout.primaryWeaponId);
  const avatar = AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) || AVATAR_OPTIONS[0];

  const menuItems: Array<{
    id: string;
    label: string;
    icon: typeof Play;
    primary?: boolean;
    action: () => void;
  }> = [
    {
      id: 'play',
      label: "O'YINNI BOSHLASH",
      icon: Play,
      primary: true,
      action: onQuickPlay,
    },
    {
      id: 'create_match',
      label: "O'YIN YARATISH",
      icon: PlusSquare,
      action: () => onNavigate('create_match'),
    },
    {
      id: 'maps',
      label: 'XARITA TANLASH',
      icon: MapIcon,
      action: () => onNavigate('maps'),
    },
    {
      id: 'characters',
      label: 'QAHRAMON TANLASH',
      icon: Users,
      action: () => onNavigate('characters'),
    },
    {
      id: 'inventory',
      label: 'QUROLLAR OMBORI',
      icon: Crosshair,
      action: () => onNavigate('inventory'),
    },
    {
      id: 'settings',
      label: 'SOZLAMALAR',
      icon: Settings,
      action: () => onNavigate('settings'),
    },
    {
      id: 'profile',
      label: 'PROFIL',
      icon: User,
      action: () => onNavigate('profile'),
    },
    {
      id: 'exit',
      label: 'CHIQISH',
      icon: LogOut,
      action: () => onNavigate('exit'),
    },
  ];

  return (
    <div className="relative w-full h-full bg-[#090B0E] overflow-hidden select-none">
      {/* Live 3D Character Background Showcase */}
      <div className="absolute inset-0 z-0">
        <ShowcaseViewport
          mode="menu_bg"
          characterId={matchConfig.characterId}
          weaponId={loadout.primaryWeaponId}
          skinId={loadout.weaponSkins[loadout.primaryWeaponId] || 'classic'}
          interactiveRotate={false}
        />
      </div>

      {/* Subtle directional readability gradient scrim */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#090B0E] via-[#090B0E]/82 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 z-0 bg-gradient-to-t from-[#090B0E] to-transparent pointer-events-none" />

      {/* Top Header Strip */}
      <header className="relative z-10 flex items-center justify-between px-8 lg:px-14 pt-7 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold tracking-wider text-zinc-100 whitespace-nowrap">
            TEMIR FRONT
          </span>
        </div>

        <button
          onClick={() => {
            audioEngine.playUiClick();
            onNavigate('profile');
          }}
          className="flex items-center gap-3 px-4 py-2 bg-[#12161D]/90 border border-zinc-800 hover:border-orange-500/60 rounded-lg transition-colors cursor-pointer"
        >
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: avatar.color }}
          />
          <span className="text-sm font-semibold text-zinc-100">{profile.username}</span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono-num text-xs text-orange-400 font-semibold">
            {profile.level}-daraja
          </span>
        </button>
      </header>

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col justify-between h-[calc(100%-88px)] px-8 lg:px-14 pb-10 pt-4">
        <div className="max-w-md my-auto">
          <p className="text-xs font-semibold text-orange-500 tracking-widest mb-2">
            TAKTIK OPERATSIYA MARKAZI
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-zinc-100 leading-tight mb-6 text-balance">
            Jangovar tayyorgarlik holati
          </h1>

          <nav className="flex flex-col gap-2" aria-label="Bosh menyu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => audioEngine.playUiHover()}
                  onClick={() => {
                    audioEngine.playUiClick();
                    item.action();
                  }}
                  className={`group flex items-center justify-between px-5 py-3 rounded-lg border transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    item.primary
                      ? 'bg-orange-600 hover:bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-950/30'
                      : 'bg-[#12161D]/90 hover:bg-[#191F29] border-zinc-800/90 hover:border-orange-500/60 text-zinc-200 hover:translate-x-1.5'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        item.primary ? 'text-white' : 'text-zinc-400 group-hover:text-orange-400'
                      }`}
                    />
                    <span className="font-display text-sm font-bold tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={`text-xs transition-transform group-hover:translate-x-1 ${
                      item.primary ? 'text-orange-100' : 'text-zinc-600 group-hover:text-orange-400'
                    }`}
                  >
                    →
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Active Loadout Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Jamoa: <strong className="text-zinc-200">{TEAM_NAMES[matchConfig.team].short}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Qahramon: <strong className="text-zinc-200">{charSpec.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Xarita: <strong className="text-zinc-200">{mapMeta.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Qurol: <strong className="text-orange-400">{primaryWeapon.name}</strong>
            </span>
          </div>
          <div className="font-mono-num text-zinc-500">
            G'alabalar: {profile.wins} / {profile.matchesPlayed}
          </div>
        </div>
      </div>
    </div>
  );
}
