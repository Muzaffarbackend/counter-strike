export type TeamId = 'A' | 'B';

export type WeaponCategory =
  | 'assault'
  | 'sniper'
  | 'pistol'
  | 'shotgun'
  | 'smg'
  | 'melee'
  | 'shield';

export type WeaponRarity = 'Oddiy' | 'Noyob' | 'Epik' | 'Afsonaviy';

export type SkinId =
  | 'classic'
  | 'gold'
  | 'carbon'
  | 'neon'
  | 'desert'
  | 'arctic'
  | 'digital';

export interface WeaponSkin {
  id: SkinId;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  metalness: number;
  roughness: number;
}

export interface WeaponSpec {
  id: string;
  name: string;
  category: WeaponCategory;
  slot: 1 | 2 | 3;
  rarity: WeaponRarity;
  damage: number;
  fireRate: number; // shots per second
  reloadTime: number; // seconds
  magSize: number;
  reserveAmmo: number;
  range: number;
  spread: number;
  adsZoom: number; // FOV when aiming
  automatic: boolean;
  pellets?: number;
  isMelee?: boolean;
  isShield?: boolean;
  description: string;
}

export interface CharacterSpec {
  id: string;
  team: TeamId;
  name: string;
  role: string;
  bio: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gearType: 'visor' | 'hood' | 'beret' | 'helmet' | 'mask';
  armorStyle: 'heavy' | 'light' | 'tactical' | 'stealth' | 'recon';
}

export type MapId =
  | 'desert_town'
  | 'industrial_zone'
  | 'snow_base'
  | 'city_center'
  | 'abandoned_factory'
  | 'tropical_island'
  | 'underground_facility'
  | 'harbor'
  | 'mountain_village'
  | 'night_city';

export interface MapMeta {
  id: MapId;
  index: number;
  name: string;
  region: string;
  description: string;
  atmosphere: string;
  skyColor: string;
  fogColor: string;
  accentColor: string;
  isIndoor?: boolean;
  isNight?: boolean;
}

export type GameModeId =
  | 'classic'
  | 'tdm'
  | 'practice'
  | 'bot_match'
  | 'custom';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface MatchConfig {
  mode: GameModeId;
  mapId: MapId;
  team: TeamId;
  characterId: string;
  durationSeconds: number;
  roundLimit: number;
  targetScore: number;
  botCountPerTeam: number;
  difficulty: DifficultyLevel;
}

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
  sprint: string;
  crouch: string;
  reload: string;
  interact: string;
  inspect: string;
}

export interface CrosshairSettings {
  color: string;
  size: number;
  thickness: number;
  gap: number;
  centerDot: boolean;
}

export interface GameSettings {
  graphics: GraphicsQuality;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  invertMouse: boolean;
  fov: number;
  resolutionScale: number;
  showFps: boolean;
  crosshair: CrosshairSettings;
  keyBindings: KeyBindings;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  mapName: string;
  modeName: string;
  team: TeamId;
  won: boolean;
  kills: number;
  deaths: number;
  scoreA: number;
  scoreB: number;
}

export interface PlayerProfile {
  username: string;
  avatarId: string;
  level: number;
  xp: number;
  matchesPlayed: number;
  wins: number;
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  matchHistory: MatchHistoryItem[];
}

export interface EquippedLoadout {
  primaryWeaponId: string;
  secondaryWeaponId: string;
  meleeWeaponId: string;
  weaponSkins: Record<string, SkinId>;
}

export type ScreenRoute =
  | 'menu'
  | 'create_match'
  | 'maps'
  | 'characters'
  | 'inventory'
  | 'settings'
  | 'profile'
  | 'playing'
  | 'exit';

export interface KillFeedItem {
  id: number;
  killer: string;
  killerTeam: TeamId;
  victim: string;
  victimTeam: TeamId;
  weaponName: string;
  headshot?: boolean;
  timestamp: number;
}

export interface ScoreboardEntry {
  id: string;
  name: string;
  team: TeamId;
  kills: number;
  deaths: number;
  assists: number;
  isPlayer: boolean;
  alive: boolean;
}

export interface MiniMapEntity {
  x: number;
  z: number;
  team: TeamId;
  isPlayer?: boolean;
  isObjective?: boolean;
  alive: boolean;
}

export interface HUDState {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  activeSlot: 1 | 2 | 3;
  weaponName: string;
  weaponCategory: WeaponCategory;
  ammoInMag: number;
  ammoReserve: number;
  isReloading: boolean;
  isAds: boolean;
  isShieldBlocking: boolean;
  scoreA: number;
  scoreB: number;
  roundNumber: number;
  maxRounds: number;
  timeRemaining: number;
  fps: number;
  stamina: number;
  isCrouching: boolean;
  isSprinting: boolean;
  isPointerLocked: boolean;
  interactPrompt: string | null;
  notification: string | null;
  killFeed: KillFeedItem[];
  scoreboard: ScoreboardEntry[];
  miniMapEntities: MiniMapEntity[];
  playerYaw: number;
  playerPos: { x: number; z: number };
  mapSize: number;
  mapBounds: Array<{ x: number; z: number; w: number; d: number }>;
  hitMarkerTimer: number;
  damageFlashTimer: number;
  crosshairSpread: number;
  roundBanner: string | null;
}

export interface MatchResult {
  won: boolean;
  playerTeam: TeamId;
  scoreA: number;
  scoreB: number;
  kills: number;
  deaths: number;
  accuracy: number;
  xpEarned: number;
  mapId: MapId;
  mode: GameModeId;
  scoreboard: ScoreboardEntry[];
}
