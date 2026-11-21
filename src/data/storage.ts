import {
  EquippedLoadout,
  GameSettings,
  MatchConfig,
  PlayerProfile,
} from '../types/game';

const KEYS = {
  PROFILE: 'temir_front_profile_v1',
  SETTINGS: 'temir_front_settings_v1',
  LOADOUT: 'temir_front_loadout_v1',
  MATCH_CFG: 'temir_front_match_cfg_v1',
};

export const AVATAR_OPTIONS = [
  { id: 'wolf', label: 'Bo\'ri', color: '#F97316' },
  { id: 'eagle', label: 'Burgut', color: '#38BDF8' },
  { id: 'shield', label: 'Qalqon', color: '#10B981' },
  { id: 'tiger', label: 'Yo\'lbars', color: '#EAB308' },
  { id: 'cobra', label: 'Kobra', color: '#EF4444' },
  { id: 'falcon', label: 'Lochin', color: '#8B5CF6' },
];

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: 'high',
  masterVolume: 0.75,
  musicVolume: 0.45,
  sfxVolume: 0.85,
  mouseSensitivity: 1.0,
  invertMouse: false,
  fov: 75,
  resolutionScale: 1.0,
  showFps: true,
  crosshair: {
    color: '#22C55E',
    size: 8,
    thickness: 2,
    gap: 5,
    centerDot: true,
  },
  keyBindings: {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    sprint: 'ShiftLeft',
    crouch: 'ControlLeft',
    reload: 'KeyR',
    interact: 'KeyE',
    inspect: 'KeyF',
  },
};

export const DEFAULT_LOADOUT: EquippedLoadout = {
  primaryWeaponId: 'tf_vx47',
  secondaryWeaponId: 'tf_glint_pistol',
  meleeWeaponId: 'tf_blade_melee',
  weaponSkins: {
    tf_vx47: 'classic',
    tf_kestrel_m4: 'carbon',
    tf_titan_sniper: 'arctic',
    tf_viper_smg: 'neon',
    tf_hammer_sg: 'desert',
    tf_glint_pistol: 'classic',
    tf_magnum_pistol: 'gold',
    tf_blade_melee: 'neon',
    tf_aegis_shield: 'digital',
  },
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: 'classic',
  mapId: 'desert_town',
  team: 'B',
  characterId: 'b_jasur',
  durationSeconds: 120,
  roundLimit: 5,
  targetScore: 25,
  botCountPerTeam: 4,
  difficulty: 'medium',
};

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function createInitialProfile(username: string, avatarId: string): PlayerProfile {
  const profile: PlayerProfile = {
    username: username.trim() || 'Askar',
    avatarId,
    level: 1,
    xp: 0,
    matchesPlayed: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0,
    matchHistory: [],
  };
  saveProfile(profile);
  return profile;
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      crosshair: { ...DEFAULT_SETTINGS.crosshair, ...(parsed.crosshair || {}) },
      keyBindings: { ...DEFAULT_SETTINGS.keyBindings, ...(parsed.keyBindings || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadLoadout(): EquippedLoadout {
  try {
    const raw = localStorage.getItem(KEYS.LOADOUT);
    if (!raw) return DEFAULT_LOADOUT;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LOADOUT,
      ...parsed,
      weaponSkins: { ...DEFAULT_LOADOUT.weaponSkins, ...(parsed.weaponSkins || {}) },
    };
  } catch {
    return DEFAULT_LOADOUT;
  }
}

export function saveLoadout(loadout: EquippedLoadout): void {
  try {
    localStorage.setItem(KEYS.LOADOUT, JSON.stringify(loadout));
  } catch {
    // ignore
  }
}

export function loadMatchConfig(): MatchConfig {
  try {
    const raw = localStorage.getItem(KEYS.MATCH_CFG);
    if (!raw) return DEFAULT_MATCH_CONFIG;
    return { ...DEFAULT_MATCH_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MATCH_CONFIG;
  }
}

export function saveMatchConfig(cfg: MatchConfig): void {
  try {
    localStorage.setItem(KEYS.MATCH_CFG, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}
