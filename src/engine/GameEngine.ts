import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHARACTERS, TEAM_NAMES } from '../data/characters';
import { getWeaponById } from '../data/weapons';
import {
  EquippedLoadout,
  GameSettings,
  HUDState,
  KillFeedItem,
  MatchConfig,
  MatchResult,
  ScoreboardEntry,
  TeamId,
  WeaponSpec,
} from '../types/game';
import { audioEngine } from './AudioEngine';
import { buildMap, BuiltMap } from './MapBuilder';
import {
  animateCharacterRig,
  buildCharacterModel,
  buildWeaponModel,
  CharacterAnimState,
  RiggedCharacter,
} from './ModelFactory';

// Pre-allocated math helpers (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

interface WeaponRuntimeState {
  spec: WeaponSpec;
  ammoInMag: number;
  ammoReserve: number;
  mesh: THREE.Group;
}

interface BotActor {
  id: string;
  name: string;
  team: TeamId;
  rig: RiggedCharacter;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  health: number;
  maxHealth: number;
  armor: number;
  alive: boolean;
  respawnTimer: number;
  fireCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  patrolTarget: THREE.Vector3;
  kills: number;
  deaths: number;
  assists: number;
  animState: CharacterAnimState;
  seedOffset: number;
  weaponSpec: WeaponSpec;
}

interface TracerEffect {
  line: THREE.Line;
  life: number;
}

interface SparkBurst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HUDState) => void;
  onPauseRequest: () => void;
  onMatchEnd: (result: MatchResult) => void;
  onLoadProgress: (pct: number, label: string) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private config: MatchConfig;
  private settings: GameSettings;
  private loadout: EquippedLoadout;
  private playerName: string;
  private callbacks: EngineCallbacks;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private builtMap!: BuiltMap;
  private isSoftwareGl = false;
  private envMapTexture: THREE.Texture | null = null;

  private frameId = 0;
  private disposed = false;
  private paused = false;
  private matchEnded = false;
  private clock = new THREE.Clock();
  private elapsedTotal = 0;

  // Player Physics & Camera
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private yaw = 0;
  private pitch = 0;
  private onGround = true;
  private isCrouching = false;
  private isSprinting = false;
  private eyeHeight = 1.72;
  private stamina = 100;
  private footstepTimer = 0;

  // Player Combat State
  private playerHealth = 100;
  private playerMaxHealth = 100;
  private playerArmor = 50;
  private playerMaxArmor = 100;
  private playerKills = 0;
  private playerDeaths = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private isPointerLocked = false;
  private keysDown = new Set<string>();
  private mouseLeftDown = false;
  private mouseRightDown = false;

  // Weapons Viewmodel
  private weaponMount = new THREE.Group();
  private muzzleLight!: THREE.PointLight;
  private slots: Record<1 | 2 | 3, WeaponRuntimeState> = {} as Record<1 | 2 | 3, WeaponRuntimeState>;
  private activeSlot: 1 | 2 | 3 = 1;
  private fireTimer = 0;
  private reloadTimer = 0;
  private inspectTimer = 0;
  private equipTimer = 0;
  private recoilKick = 0;
  private muzzleFlashTimer = 0;
  private hitMarkerTimer = 0;
  private damageFlashTimer = 0;
  private dynamicSpread = 0;

  // AI & Match State
  private bots: BotActor[] = [];
  private tracers: TracerEffect[] = [];
  private sparks: SparkBurst[] = [];
  private scoreA = 0;
  private scoreB = 0;
  private roundNumber = 1;
  private roundTimer = 120;
  private roundResetTimer = 0;
  private roundBanner: string | null = null;
  private notification: string | null = null;
  private notificationTimer = 0;
  private killFeed: KillFeedItem[] = [];
  private nextKillId = 1;

  // FPS & HUD Throttling
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private hudAccum = 0;

  // Bound event listeners
  private onResizeBound = () => this.handleResize();
  private onKeyDownBound = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onKeyUpBound = (e: KeyboardEvent) => this.handleKeyUp(e);
  private onMouseMoveBound = (e: MouseEvent) => this.handleMouseMove(e);
  private onMouseDownBound = (e: MouseEvent) => this.handleMouseDown(e);
  private onMouseUpBound = (e: MouseEvent) => this.handleMouseUp(e);
  private onContextMenuBound = (e: MouseEvent) => e.preventDefault();
  private onPointerLockChangeBound = () => this.handlePointerLockChange();

  constructor(
    container: HTMLElement,
    playerName: string,
    config: MatchConfig,
    settings: GameSettings,
    loadout: EquippedLoadout,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.playerName = playerName;
    this.config = { ...config };
    this.settings = { ...settings };
    this.loadout = { ...loadout };
    this.callbacks = callbacks;
    this.roundTimer = config.durationSeconds;

    this.initEngine();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initEngine(): void {
    this.callbacks.onLoadProgress(15, 'WebGL grafik dvigateli ishga tushirilmoqda...');
    this.isSoftwareGl = this.detectSoftwareGl();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.graphics !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.applyRendererSettings();
    this.renderer.setSize(width, height);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, width / height, 0.08, 320);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // Studio Environment Reflections for PBR metallic weapons/armor
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envMapTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMapTexture;
    pmremGenerator.dispose();

    this.callbacks.onLoadProgress(45, '3D xarita va to\'qnashuv tizimi qurilmoqda...');
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.builtMap = buildMap(
      this.config.mapId,
      this.scene,
      maxAniso,
      this.settings.graphics,
      this.isSoftwareGl
    );

    this.callbacks.onLoadProgress(72, 'Qurollar va jamoa qahramonlari tayyorlanmoqda...');
    this.setupPlayerWeapons();
    this.spawnEntities();

    this.callbacks.onLoadProgress(92, 'Shaderlar va tovush tizimi optimallashtirilmoqda...');
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    audioEngine.startMapAmbient(this.config.mapId);
    audioEngine.playMatchStart();

    this.showBanner(`RAUND ${this.roundNumber} BOSHLANDI`);
    this.callbacks.onLoadProgress(100, 'Tayyor!');

    this.clock.start();
    this.loop();
  }

  private applyRendererSettings(): void {
    if (!this.renderer) return;
    const dpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio, 2) * this.settings.resolutionScale;
    this.renderer.setPixelRatio(Math.max(0.5, dpr));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.graphics !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private setupPlayerWeapons(): void {
    this.camera.add(this.weaponMount);
    this.muzzleLight = new THREE.PointLight('#FDBA74', 0, 7);
    this.muzzleLight.position.set(0.2, -0.1, -0.8);
    this.camera.add(this.muzzleLight);

    const slotSpecs: Array<[1 | 2 | 3, string]> = [
      [1, this.loadout.primaryWeaponId],
      [2, this.loadout.secondaryWeaponId],
      [3, this.loadout.meleeWeaponId],
    ];

    slotSpecs.forEach(([slot, wId]) => {
      const spec = getWeaponById(wId);
      const skinId = this.loadout.weaponSkins[spec.id] || 'classic';
      const mesh = buildWeaponModel(spec, skinId);
      mesh.visible = slot === this.activeSlot;
      this.weaponMount.add(mesh);

      this.slots[slot] = {
        spec,
        ammoInMag: spec.magSize,
        ammoReserve: this.config.mode === 'practice' ? 999 : spec.reserveAmmo,
        mesh,
      };
    });

    this.positionWeaponMount();
  }

  private positionWeaponMount(): void {
    const spec = this.slots[this.activeSlot].spec;
    if (spec.isShield) {
      this.weaponMount.position.set(-0.22, -0.18, -0.45);
    } else if (spec.isMelee) {
      this.weaponMount.position.set(0.24, -0.22, -0.42);
    } else {
      this.weaponMount.position.set(0.24, -0.21, -0.46);
    }
  }

  private spawnEntities(): void {
    // Clear existing bots if restarting
    this.bots.forEach((b) => this.scene.remove(b.rig.group));
    this.bots = [];

    // Spawn player at Team spawn
    const playerSpawns = this.config.team === 'A' ? this.builtMap.spawnsA : this.builtMap.spawnsB;
    this.playerPos.copy(playerSpawns[0]);
    this.playerVel.set(0, 0, 0);
    this.yaw = this.config.team === 'A' ? Math.PI : 0;
    this.pitch = 0;
    this.playerHealth = 100;
    this.playerArmor = 50;

    // Spawn Teammates & Opponents
    const teamAChars = CHARACTERS.filter((c) => c.team === 'A');
    const teamBChars = CHARACTERS.filter((c) => c.team === 'B');
    const botCount = this.config.mode === 'practice' ? 4 : this.config.botCountPerTeam;

    const createTeamBots = (team: TeamId, count: number) => {
      const pool = team === 'A' ? teamAChars : teamBChars;
      const spawns = team === 'A' ? this.builtMap.spawnsA : this.builtMap.spawnsB;
      const isPlayerTeam = team === this.config.team;
      const startIndex = isPlayerTeam ? 1 : 0;

      for (let i = startIndex; i < count; i++) {
        const charSpec = pool[i % pool.length];
        const rig = buildCharacterModel(charSpec, !this.isSoftwareGl && this.settings.graphics !== 'low');
        const spawnPos = spawns[i % spawns.length].clone();
        rig.group.position.copy(spawnPos);

        const botWeapon = getWeaponById(i % 3 === 0 ? 'tf_viper_smg' : i % 4 === 0 ? 'tf_kestrel_m4' : 'tf_vx47');
        const wModel = buildWeaponModel(botWeapon, team === 'A' ? 'desert' : 'carbon');
        wModel.scale.setScalar(1.25);
        wModel.rotation.x = Math.PI / 2;
        rig.weaponMount.add(wModel);

        const botId = `bot_${team}_${i}`;
        rig.hitMeshes.forEach((m) => {
          m.userData.botId = botId;
        });

        this.scene.add(rig.group);
        this.bots.push({
          id: botId,
          name: `${charSpec.name.split(' ')[0]} (${team})`,
          team,
          rig,
          position: spawnPos,
          velocity: new THREE.Vector3(),
          yaw: team === 'A' ? Math.PI : 0,
          health: 100,
          maxHealth: 100,
          armor: 40,
          alive: true,
          respawnTimer: 0,
          fireCooldown: 0.6 + Math.random() * 0.8,
          strafeDir: Math.random() > 0.5 ? 1 : -1,
          strafeTimer: 1.5,
          patrolTarget: new THREE.Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40),
          kills: 0,
          deaths: 0,
          assists: 0,
          animState: 'idle',
          seedOffset: Math.random() * 10,
          weaponSpec: botWeapon,
        });
      }
    };

    if (this.config.mode === 'practice') {
      // Practice mode: only opposing targets
      const oppTeam: TeamId = this.config.team === 'A' ? 'B' : 'A';
      createTeamBots(oppTeam, botCount);
    } else {
      createTeamBots('A', botCount);
      createTeamBots('B', botCount);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    window.addEventListener('contextmenu', this.onContextMenuBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    window.removeEventListener('contextmenu', this.onContextMenuBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }

  public requestPointerLock(): void {
    if (this.paused || this.matchEnded) return;
    try {
      this.renderer.domElement.requestPointerLock();
    } catch {
      // ignore
    }
  }

  public pause(): void {
    this.paused = true;
    this.keysDown.clear();
    this.mouseLeftDown = false;
    this.mouseRightDown = false;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public resume(): void {
    this.paused = false;
    this.clock.getDelta(); // flush accumulated delta
    this.requestPointerLock();
  }

  public updateSettings(newSettings: GameSettings): void {
    this.settings = { ...newSettings };
    this.applyRendererSettings();
    audioEngine.syncSettings(newSettings);
  }

  public restartMatch(): void {
    this.scoreA = 0;
    this.scoreB = 0;
    this.roundNumber = 1;
    this.roundTimer = this.config.durationSeconds;
    this.roundResetTimer = 0;
    this.matchEnded = false;
    this.playerKills = 0;
    this.playerDeaths = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.killFeed = [];
    this.resetRoundEntities();
    this.paused = false;
    this.showBanner('O\'YIN QAYTA BOSHLANDI');
    audioEngine.playMatchStart();
    this.requestPointerLock();
  }

  private resetRoundEntities(): void {
    const pSpawns = this.config.team === 'A' ? this.builtMap.spawnsA : this.builtMap.spawnsB;
    this.playerPos.copy(pSpawns[0]);
    this.playerVel.set(0, 0, 0);
    this.playerHealth = 100;
    this.playerArmor = 50;
    this.reloadTimer = 0;
    ([1, 2, 3] as const).forEach((s) => {
      const slot = this.slots[s];
      slot.ammoInMag = slot.spec.magSize;
      slot.ammoReserve = this.config.mode === 'practice' ? 999 : slot.spec.reserveAmmo;
    });

    let idxA = 0;
    let idxB = 0;
    this.bots.forEach((b) => {
      const sp = b.team === 'A' ? this.builtMap.spawnsA[idxA++ % 5] : this.builtMap.spawnsB[idxB++ % 5];
      b.position.copy(sp);
      b.velocity.set(0, 0, 0);
      b.health = b.maxHealth;
      b.armor = 40;
      b.alive = true;
      b.rig.group.visible = true;
      b.rig.group.position.copy(sp);
    });
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    if (!this.isPointerLocked && !this.paused && !this.matchEnded) {
      this.paused = true;
      this.callbacks.onPauseRequest();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      if (!this.paused && !this.matchEnded) {
        this.pause();
        this.callbacks.onPauseRequest();
      }
      return;
    }
    if (this.paused || this.matchEnded) return;
    this.keysDown.add(e.code);

    const kb = this.settings.keyBindings;
    if (e.code === 'Digit1') this.switchSlot(1);
    else if (e.code === 'Digit2') this.switchSlot(2);
    else if (e.code === 'Digit3') this.switchSlot(3);
    else if (e.code === kb.reload) this.startReload();
    else if (e.code === kb.inspect) this.startInspect();
    else if (e.code === kb.interact) this.tryInteract();
    else if (e.code === kb.jump && this.onGround) {
      this.playerVel.y = 7.4;
      this.onGround = false;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isPointerLocked || this.paused || this.matchEnded) return;
    const sens = 0.0021 * this.settings.mouseSensitivity;
    const inv = this.settings.invertMouse ? -1 : 1;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens * inv;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.47, Math.PI * 0.47);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.paused || this.matchEnded) return;
    if (!this.isPointerLocked) {
      this.requestPointerLock();
      return;
    }
    if (e.button === 0) {
      this.mouseLeftDown = true;
      this.tryFire();
    } else if (e.button === 2) {
      this.mouseRightDown = true;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouseLeftDown = false;
    if (e.button === 2) this.mouseRightDown = false;
  }

  private switchSlot(slot: 1 | 2 | 3): void {
    if (this.activeSlot === slot) return;
    this.slots[this.activeSlot].mesh.visible = false;
    this.activeSlot = slot;
    this.slots[slot].mesh.visible = true;
    this.reloadTimer = 0;
    this.inspectTimer = 0;
    this.equipTimer = 0.25;
    this.positionWeaponMount();
    audioEngine.playEquip();
  }

  private startReload(): void {
    const slot = this.slots[this.activeSlot];
    if (slot.spec.isMelee || slot.spec.isShield) return;
    if (this.reloadTimer > 0) return;
    if (slot.ammoInMag >= slot.spec.magSize || slot.ammoReserve <= 0) return;
    this.reloadTimer = slot.spec.reloadTime;
    this.inspectTimer = 0;
    audioEngine.playReload();
  }

  private startInspect(): void {
    if (this.reloadTimer > 0 || this.inspectTimer > 0) return;
    this.inspectTimer = 1.6;
    audioEngine.playEquip();
  }

  private tryInteract(): void {
    let closest = null;
    let bestDist = 3.2;
    for (const obj of this.builtMap.interactables) {
      if (obj.cooldown > 0) continue;
      const d = obj.position.distanceTo(this.playerPos);
      if (d < bestDist) {
        bestDist = d;
        closest = obj;
      }
    }
    if (!closest) return;

    audioEngine.playEquip();
    if (closest.type === 'supply') {
      closest.cooldown = 18;
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 45);
      this.playerArmor = Math.min(this.playerMaxArmor, this.playerArmor + 40);
      ([1, 2] as const).forEach((s) => {
        const sl = this.slots[s];
        sl.ammoReserve = Math.min(sl.spec.reserveAmmo * 2, sl.ammoReserve + sl.spec.magSize * 2);
      });
      this.showNotification('Ta\'minot qutisi olindi: +45 Sog\'liq, +40 Zirh, +O\'qlar');
    } else if (closest.type === 'terminal') {
      if (closest.capturedBy === this.config.team) {
        this.showNotification('Bu signal nuqtasi allaqachon sizning jamoangiz nazoratida!');
        return;
      }
      closest.capturedBy = this.config.team;
      closest.cooldown = 25;
      if (this.config.team === 'A') this.scoreA += 2;
      else this.scoreB += 2;
      this.showNotification('Taktik signal nuqtasi faollashtirildi (+2 ball)!');
      this.checkMatchWinCondition();
    }
  }

  private tryFire(): void {
    if (this.reloadTimer > 0 || this.equipTimer > 0 || this.fireTimer > 0 || this.playerHealth <= 0) return;
    const slot = this.slots[this.activeSlot];
    const spec = slot.spec;

    if (!spec.isMelee && !spec.isShield) {
      if (slot.ammoInMag <= 0) {
        this.startReload();
        return;
      }
      slot.ammoInMag--;
      if (this.config.mode === 'practice' && slot.ammoInMag === 0) {
        slot.ammoInMag = spec.magSize;
      }
    }

    this.fireTimer = 1 / spec.fireRate;
    this.inspectTimer = 0;
    this.recoilKick = spec.isMelee ? 0.25 : spec.category === 'sniper' ? 0.16 : 0.08;
    this.dynamicSpread = Math.min(0.08, this.dynamicSpread + (spec.isMelee ? 0 : 0.015));
    this.pitch = Math.min(Math.PI * 0.47, this.pitch + (spec.isMelee ? 0 : spec.category === 'sniper' ? 0.032 : 0.012));

    audioEngine.playWeaponFire(spec.category, 1);

    if (!spec.isMelee && !spec.isShield) {
      this.muzzleFlashTimer = 0.055;
      this.muzzleLight.intensity = 6;
      this.shotsFired++;
    }

    const pellets = spec.pellets || 1;
    const spreadTotal = spec.spread + (this.mouseRightDown ? 0.002 : this.dynamicSpread) + (this.isCrouching ? 0 : 0.004);

    // Collect live bot hit meshes
    const targetMeshes: THREE.Object3D[] = [...this.builtMap.bulletMeshes];
    this.bots.forEach((b) => {
      if (b.alive && b.team !== this.config.team) {
        targetMeshes.push(...b.rig.hitMeshes);
      }
    });

    for (let p = 0; p < pellets; p++) {
      _dir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      _dir.x += (Math.random() - 0.5) * spreadTotal;
      _dir.y += (Math.random() - 0.5) * spreadTotal;
      _dir.z += (Math.random() - 0.5) * spreadTotal;
      _dir.normalize();

      _ray.set(this.camera.position, _dir);
      _ray.far = spec.range;

      const hits = _ray.intersectObjects(targetMeshes, false);
      let endPoint = _v1.copy(this.camera.position).addScaledVector(_dir, Math.min(spec.range, 60));

      if (hits.length > 0) {
        const hit = hits[0];
        endPoint.copy(hit.point);
        const botId = hit.object.userData.botId as string | undefined;

        if (botId) {
          const bot = this.bots.find((b) => b.id === botId);
          if (bot && bot.alive) {
            const zone = hit.object.userData.hitZone as string;
            const mult = zone === 'head' ? 2.1 : zone === 'legs' ? 0.75 : 1.0;
            const dmg = Math.round(spec.damage * mult);
            this.shotsHit++;
            this.damageBot(bot, dmg, this.playerName, this.config.team, spec.name, zone === 'head', true);
            this.spawnSparkBurst(hit.point, '#F97316');
          }
        } else {
          this.spawnSparkBurst(hit.point, '#CBD5E1');
        }
      }

      if (!spec.isMelee && !spec.isShield) {
        _v2.set(0.18, -0.14, -0.7).applyMatrix4(this.camera.matrixWorld);
        this.spawnTracer(_v2, endPoint, '#FDE047');
      }
    }
  }

  private damageBot(
    bot: BotActor,
    dmg: number,
    attackerName: string,
    attackerTeam: TeamId,
    weaponName: string,
    headshot: boolean,
    byPlayer: boolean
  ): void {
    let remaining = dmg;
    if (bot.armor > 0) {
      const absorbed = Math.min(bot.armor, Math.round(dmg * 0.38));
      bot.armor -= absorbed;
      remaining -= absorbed;
    }
    bot.health -= remaining;

    if (byPlayer) {
      this.hitMarkerTimer = 0.16;
      audioEngine.playHitMarker(bot.health <= 0);
    }

    if (bot.health <= 0) {
      bot.health = 0;
      bot.alive = false;
      bot.deaths++;
      bot.rig.group.visible = false;
      bot.respawnTimer = this.config.mode === 'classic' ? 999 : 4.2;

      this.spawnSparkBurst(_v1.copy(bot.position).add(new THREE.Vector3(0, 1.1, 0)), bot.team === 'A' ? '#F97316' : '#38BDF8');

      if (byPlayer) {
        this.playerKills++;
      } else {
        const killerBot = this.bots.find((b) => b.name === attackerName);
        if (killerBot) killerBot.kills++;
      }

      if (attackerTeam === 'A') this.scoreA++;
      else this.scoreB++;

      this.pushKillFeed(attackerName, attackerTeam, bot.name, bot.team, weaponName, headshot);
      this.checkRoundOrMatchProgression();
    }
  }

  private damagePlayer(dmg: number, attackerName: string, attackerTeam: TeamId, weaponName: string): void {
    if (this.playerHealth <= 0 || this.matchEnded) return;
    // Shield blocking reduces front damage
    const activeSpec = this.slots[this.activeSlot].spec;
    const blocking = activeSpec.isShield && this.mouseRightDown;
    const effective = blocking ? Math.round(dmg * 0.25) : dmg;

    let rem = effective;
    if (this.playerArmor > 0) {
      const abs = Math.min(this.playerArmor, Math.round(effective * 0.42));
      this.playerArmor -= abs;
      rem -= abs;
    }
    this.playerHealth -= rem;
    this.damageFlashTimer = 0.25;

    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.playerDeaths++;
      if (attackerTeam === 'A') this.scoreA++;
      else this.scoreB++;
      this.pushKillFeed(attackerName, attackerTeam, this.playerName, this.config.team, weaponName, false);
      this.showNotification(`${attackerName} sizni zararsizlantirdi!`);

      if (this.config.mode === 'classic') {
        this.checkRoundOrMatchProgression();
      } else {
        // Respawn player after brief reset
        const pSpawns = this.config.team === 'A' ? this.builtMap.spawnsA : this.builtMap.spawnsB;
        const sp = pSpawns[Math.floor(Math.random() * pSpawns.length)];
        this.playerPos.copy(sp);
        this.playerHealth = 100;
        this.playerArmor = 50;
      }
    }
  }

  private checkRoundOrMatchProgression(): void {
    if (this.config.mode === 'classic') {
      const aliveA = (this.config.team === 'A' && this.playerHealth > 0 ? 1 : 0) +
        this.bots.filter((b) => b.team === 'A' && b.alive).length;
      const aliveB = (this.config.team === 'B' && this.playerHealth > 0 ? 1 : 0) +
        this.bots.filter((b) => b.team === 'B' && b.alive).length;

      if (aliveA === 0 || aliveB === 0) {
        const roundWinner: TeamId = aliveA > 0 ? 'A' : 'B';
        if (roundWinner === 'A') this.scoreA += 3;
        else this.scoreB += 3;

        if (this.roundNumber >= this.config.roundLimit) {
          this.finishMatch();
        } else {
          this.roundResetTimer = 2.6;
          this.showBanner(`${TEAM_NAMES[roundWinner].short.toUpperCase()} RAUNDDA G'OLIB!`);
        }
      }
    } else {
      this.checkMatchWinCondition();
    }
  }

  private checkMatchWinCondition(): void {
    if (this.config.mode === 'practice') return;
    if (this.scoreA >= this.config.targetScore || this.scoreB >= this.config.targetScore) {
      this.finishMatch();
    }
  }

  private finishMatch(): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const won = this.config.team === 'A' ? this.scoreA >= this.scoreB : this.scoreB >= this.scoreA;
    if (won) audioEngine.playVictory();
    else audioEngine.playDefeat();

    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    const xpEarned = Math.max(40, this.playerKills * 35 + (won ? 150 : 60));

    this.callbacks.onMatchEnd({
      won,
      playerTeam: this.config.team,
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      kills: this.playerKills,
      deaths: this.playerDeaths,
      accuracy,
      xpEarned,
      mapId: this.config.mapId,
      mode: this.config.mode,
      scoreboard: this.buildScoreboard(),
    });
  }

  private pushKillFeed(
    killer: string,
    killerTeam: TeamId,
    victim: string,
    victimTeam: TeamId,
    weaponName: string,
    headshot: boolean
  ): void {
    this.killFeed.unshift({
      id: this.nextKillId++,
      killer,
      killerTeam,
      victim,
      victimTeam,
      weaponName,
      headshot,
      timestamp: this.elapsedTotal,
    });
    if (this.killFeed.length > 5) this.killFeed.pop();
  }

  private showNotification(text: string): void {
    this.notification = text;
    this.notificationTimer = 3.2;
  }

  private showBanner(text: string): void {
    this.roundBanner = text;
    window.setTimeout(() => {
      if (this.roundBanner === text) this.roundBanner = null;
    }, 2600);
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, color: string): void {
    const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
  }

  private spawnSparkBurst(origin: THREE.Vector3, color: string): void {
    const count = 10;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      vel[i * 3] = (Math.random() - 0.5) * 6;
      vel[i * 3 + 1] = Math.random() * 4 + 1;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.16, transparent: true, opacity: 0.95 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.sparks.push({ points, velocities: vel, life: 0.32 });
  }

  // Sliding AABB collision resolver for player and bots
  private moveWithCollision(pos: THREE.Vector3, deltaX: number, deltaZ: number, radius: number, height: number): void {
    const halfBound = this.builtMap.halfSize - 0.5;
    pos.x = THREE.MathUtils.clamp(pos.x + deltaX, -halfBound, halfBound);

    for (const c of this.builtMap.colliders) {
      if (pos.y >= c.maxY - 0.05 || pos.y + height <= c.minY) continue;
      if (pos.x + radius > c.minX && pos.x - radius < c.maxX && pos.z + radius > c.minZ && pos.z - radius < c.maxZ) {
        if (deltaX > 0) pos.x = c.minX - radius;
        else if (deltaX < 0) pos.x = c.maxX + radius;
      }
    }

    pos.z = THREE.MathUtils.clamp(pos.z + deltaZ, -halfBound, halfBound);
    for (const c of this.builtMap.colliders) {
      if (pos.y >= c.maxY - 0.05 || pos.y + height <= c.minY) continue;
      if (pos.x + radius > c.minX && pos.x - radius < c.maxX && pos.z + radius > c.minZ && pos.z - radius < c.maxZ) {
        if (deltaZ > 0) pos.z = c.minZ - radius;
        else if (deltaZ < 0) pos.z = c.maxZ + radius;
      }
    }
  }

  private getGroundY(x: number, z: number, currentY: number, radius: number): number {
    let ground = 0;
    for (const c of this.builtMap.colliders) {
      if (!c.isWalkableTop) continue;
      if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
        if (currentY >= c.maxY - 0.45 && c.maxY > ground) {
          ground = c.maxY;
        }
      }
    }
    return ground;
  }

  private loop = (): void => {
    if (this.disposed) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.fpsAccum += delta;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    if (!this.paused && !this.matchEnded) {
      this.elapsedTotal += delta;
      this.updatePlayer(delta);
      this.updateWeapons(delta);
      this.updateBots(delta);
      this.updateEffects(delta);
      this.builtMap.update(this.elapsedTotal, delta);
      this.updateMatchTimers(delta);
    }

    this.renderer.render(this.scene, this.camera);

    this.hudAccum += delta;
    if (this.hudAccum >= 0.04) {
      this.hudAccum = 0;
      this.emitHud();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updatePlayer(delta: number): void {
    const kb = this.settings.keyBindings;
    const forward = (this.keysDown.has(kb.forward) ? 1 : 0) - (this.keysDown.has(kb.backward) ? 1 : 0);
    const strafe = (this.keysDown.has(kb.right) ? 1 : 0) - (this.keysDown.has(kb.left) ? 1 : 0);

    this.isCrouching = this.keysDown.has(kb.crouch) || this.keysDown.has('KeyC');
    const wantsSprint = this.keysDown.has(kb.sprint) && forward > 0 && !this.isCrouching && !this.mouseRightDown;
    this.isSprinting = wantsSprint && this.stamina > 5;

    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - delta * 24);
    } else {
      this.stamina = Math.min(100, this.stamina + delta * 18);
    }

    const activeSpec = this.slots[this.activeSlot].spec;
    const baseSpeed = activeSpec.isMelee ? 7.6 : 6.2;
    const speed = this.isCrouching ? baseSpeed * 0.55 : this.isSprinting ? baseSpeed * 1.42 : baseSpeed;

    // Horizontal direction from yaw
    _v1.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); // forward
    _v2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); // right
    _v3.set(0, 0, 0).addScaledVector(_v1, forward).addScaledVector(_v2, strafe);

    const moving = _v3.lengthSq() > 0.001;
    if (moving) _v3.normalize();

    this.moveWithCollision(this.playerPos, _v3.x * speed * delta, _v3.z * speed * delta, 0.42, this.isCrouching ? 1.15 : 1.78);

    // Gravity & Grounding
    this.playerVel.y -= 19.5 * delta;
    this.playerPos.y += this.playerVel.y * delta;
    const groundY = this.getGroundY(this.playerPos.x, this.playerPos.z, this.playerPos.y, 0.42);
    if (this.playerPos.y <= groundY) {
      this.playerPos.y = groundY;
      this.playerVel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Smooth crouch eye height
    const targetEye = this.isCrouching ? 1.08 : 1.72;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 14, delta);

    // Footstep SFX
    if (moving && this.onGround) {
      this.footstepTimer -= delta * (this.isSprinting ? 1.45 : this.isCrouching ? 0.65 : 1);
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.42;
        audioEngine.playFootstep(this.isSprinting);
      }
    }

    // Camera Transform & ADS FOV damping
    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.eyeHeight, this.playerPos.z);
    _euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(_euler);

    const targetFov = this.mouseRightDown && !activeSpec.isMelee && !activeSpec.isShield
      ? activeSpec.adsZoom
      : this.isSprinting
      ? Math.min(105, this.settings.fov + 5)
      : this.settings.fov;

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, delta);
      this.camera.updateProjectionMatrix();
    }

    // Interactable cooldowns
    for (const obj of this.builtMap.interactables) {
      if (obj.cooldown > 0) obj.cooldown = Math.max(0, obj.cooldown - delta);
    }
  }

  private updateWeapons(delta: number): void {
    const slot = this.slots[this.activeSlot];
    const spec = slot.spec;

    if (this.fireTimer > 0) this.fireTimer -= delta;
    if (this.equipTimer > 0) this.equipTimer = Math.max(0, this.equipTimer - delta);
    if (this.inspectTimer > 0) this.inspectTimer = Math.max(0, this.inspectTimer - delta);
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - delta);
    if (this.damageFlashTimer > 0) this.damageFlashTimer = Math.max(0, this.damageFlashTimer - delta);
    if (this.notificationTimer > 0) {
      this.notificationTimer = Math.max(0, this.notificationTimer - delta);
      if (this.notificationTimer === 0) this.notification = null;
    }

    this.dynamicSpread = THREE.MathUtils.damp(this.dynamicSpread, 0, 8, delta);
    this.recoilKick = THREE.MathUtils.damp(this.recoilKick, 0, 16, delta);

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) this.muzzleLight.intensity = 0;
    }

    // Automatic firing
    if (this.mouseLeftDown && spec.automatic && this.fireTimer <= 0) {
      this.tryFire();
    }

    // Reload completion
    if (this.reloadTimer > 0) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        const needed = spec.magSize - slot.ammoInMag;
        const load = Math.min(needed, slot.ammoReserve);
        slot.ammoInMag += load;
        if (this.config.mode !== 'practice') {
          slot.ammoReserve -= load;
        }
      }
    }

    // Procedural Viewmodel Animations
    const kb = this.settings.keyBindings;
    const isMoving =
      this.keysDown.has(kb.forward) ||
      this.keysDown.has(kb.backward) ||
      this.keysDown.has(kb.left) ||
      this.keysDown.has(kb.right);
    const bobSpeed = this.isSprinting ? 11 : 7;
    const bobAmp = isMoving && this.onGround ? (this.isSprinting ? 0.018 : 0.009) : 0.002;

    let baseX = spec.isShield ? -0.22 : 0.24;
    let baseY = spec.isShield ? -0.18 : -0.21;
    let baseZ = -0.46;
    let rotX = 0;
    let rotY = 0;

    if (spec.isShield && this.mouseRightDown) {
      baseX = 0.0;
      baseY = -0.08;
      baseZ = -0.36;
    } else if (this.mouseRightDown && !spec.isMelee) {
      baseX = 0.0;
      baseY = -0.15;
      baseZ = -0.38;
    }

    if (this.reloadTimer > 0) {
      const p = Math.sin((this.reloadTimer / spec.reloadTime) * Math.PI);
      baseY -= p * 0.14;
      rotX -= p * 0.55;
      rotY += p * 0.4;
    } else if (this.equipTimer > 0) {
      baseY -= (this.equipTimer / 0.25) * 0.22;
    } else if (this.inspectTimer > 0) {
      const p = Math.sin((this.inspectTimer / 1.6) * Math.PI);
      rotY = p * 0.95;
      rotX = p * 0.25;
      baseX -= p * 0.1;
    }

    if (this.isSprinting && !this.mouseRightDown) {
      rotY += 0.35;
      rotX -= 0.15;
    }

    // Sniper scope hides viewmodel during deep zoom
    this.weaponMount.visible = !(spec.category === 'sniper' && this.mouseRightDown);

    this.weaponMount.position.x = THREE.MathUtils.damp(
      this.weaponMount.position.x,
      baseX + Math.cos(this.elapsedTotal * bobSpeed * 0.5) * bobAmp,
      14,
      delta
    );
    this.weaponMount.position.y = THREE.MathUtils.damp(
      this.weaponMount.position.y,
      baseY + Math.sin(this.elapsedTotal * bobSpeed) * bobAmp,
      14,
      delta
    );
    this.weaponMount.position.z = THREE.MathUtils.damp(
      this.weaponMount.position.z,
      baseZ + this.recoilKick,
      18,
      delta
    );
    this.weaponMount.rotation.x = THREE.MathUtils.damp(
      this.weaponMount.rotation.x,
      rotX + this.recoilKick * 1.4,
      16,
      delta
    );
    this.weaponMount.rotation.y = THREE.MathUtils.damp(this.weaponMount.rotation.y, rotY, 12, delta);
  }

  private updateBots(delta: number): void {
    const diffMult =
      this.config.difficulty === 'expert'
        ? 1.45
        : this.config.difficulty === 'hard'
        ? 1.15
        : this.config.difficulty === 'medium'
        ? 0.85
        : 0.55;

    for (const bot of this.bots) {
      if (!bot.alive) {
        if (this.config.mode !== 'classic') {
          bot.respawnTimer -= delta;
          if (bot.respawnTimer <= 0) {
            const spawns = bot.team === 'A' ? this.builtMap.spawnsA : this.builtMap.spawnsB;
            const sp = spawns[Math.floor(Math.random() * spawns.length)];
            bot.position.copy(sp);
            bot.health = bot.maxHealth;
            bot.armor = 40;
            bot.alive = true;
            bot.rig.group.visible = true;
          }
        }
        continue;
      }

      // Find nearest alive opponent (player or opposing bots)
      let targetPos: THREE.Vector3 | null = null;
      let targetIsPlayer = false;
      let targetBot: BotActor | null = null;
      let bestDist = 65;

      if (bot.team !== this.config.team && this.playerHealth > 0) {
        const d = bot.position.distanceTo(this.playerPos);
        if (d < bestDist) {
          bestDist = d;
          targetPos = this.playerPos;
          targetIsPlayer = true;
        }
      }

      for (const other of this.bots) {
        if (!other.alive || other.team === bot.team) continue;
        const d = bot.position.distanceTo(other.position);
        if (d < bestDist) {
          bestDist = d;
          targetPos = other.position;
          targetIsPlayer = false;
          targetBot = other;
        }
      }

      // Line of Sight check
      let hasLos = false;
      if (targetPos) {
        _v1.set(bot.position.x, bot.position.y + 1.45, bot.position.z);
        _v2.set(targetPos.x, targetPos.y + 1.35, targetPos.z);
        _dir.copy(_v2).sub(_v1).normalize();
        _ray.set(_v1, _dir);
        _ray.far = bestDist - 0.5;
        const wallHits = _ray.intersectObjects(this.builtMap.bulletMeshes, false);
        hasLos = wallHits.length === 0;
      }

      bot.strafeTimer -= delta;
      if (bot.strafeTimer <= 0) {
        bot.strafeTimer = 1.2 + Math.random() * 1.4;
        bot.strafeDir *= -1;
      }

      const moveSpeed = 3.6 + diffMult * 0.8;
      let moveX = 0;
      let moveZ = 0;

      if (targetPos && hasLos) {
        // Aim at target
        const desiredYaw = Math.atan2(bot.position.x - targetPos.x, bot.position.z - targetPos.z);
        bot.yaw = desiredYaw;

        // Maintain tactical engagement distance + strafe
        const rightX = Math.cos(bot.yaw) * bot.strafeDir;
        const rightZ = -Math.sin(bot.yaw) * bot.strafeDir;
        if (bestDist > 14) {
          moveX = -Math.sin(bot.yaw) * 0.7 + rightX * 0.5;
          moveZ = -Math.cos(bot.yaw) * 0.7 + rightZ * 0.5;
        } else {
          moveX = rightX * 0.8;
          moveZ = rightZ * 0.8;
        }

        // Fire at target
        bot.fireCooldown -= delta;
        if (bot.fireCooldown <= 0 && this.config.mode !== 'practice') {
          bot.fireCooldown = (0.55 + Math.random() * 0.55) / diffMult;
          const distScale = Math.max(0.15, 1 - bestDist / 65);
          audioEngine.playWeaponFire(bot.weaponSpec.category, distScale * 0.55);

          _v1.set(bot.position.x, bot.position.y + 1.45, bot.position.z);
          _v2.set(targetPos.x, targetPos.y + 1.3, targetPos.z);
          this.spawnTracer(_v1, _v2, bot.team === 'A' ? '#FB923C' : '#38BDF8');

          const hitChance = THREE.MathUtils.clamp((0.42 * diffMult) * (1 - bestDist / 80), 0.08, 0.72);
          if (Math.random() < hitChance) {
            const dmg = Math.round((8 + Math.random() * 7) * diffMult);
            if (targetIsPlayer) {
              this.damagePlayer(dmg, bot.name, bot.team, bot.weaponSpec.name);
            } else if (targetBot) {
              this.damageBot(targetBot, dmg, bot.name, bot.team, bot.weaponSpec.name, false, false);
            }
          }
        }
        bot.animState = 'walk';
      } else {
        // Patrol toward center or waypoint
        const distToPatrol = bot.position.distanceTo(bot.patrolTarget);
        if (distToPatrol < 2.5) {
          bot.patrolTarget.set((Math.random() - 0.5) * 44, 0, (Math.random() - 0.5) * 44);
        }
        _dir.copy(bot.patrolTarget).sub(bot.position);
        _dir.y = 0;
        if (_dir.lengthSq() > 0.01) {
          _dir.normalize();
          bot.yaw = Math.atan2(-_dir.x, -_dir.z);
          moveX = _dir.x;
          moveZ = _dir.z;
          bot.animState = 'run';
        } else {
          bot.animState = 'idle';
        }
      }

      const prevX = bot.position.x;
      const prevZ = bot.position.z;
      this.moveWithCollision(bot.position, moveX * moveSpeed * delta, moveZ * moveSpeed * delta, 0.45, 1.8);

      // Unstick patrol target if blocked
      if (Math.hypot(bot.position.x - prevX, bot.position.z - prevZ) < 0.004 && !hasLos) {
        bot.patrolTarget.set((Math.random() - 0.5) * 44, 0, (Math.random() - 0.5) * 44);
      }

      bot.rig.group.position.copy(bot.position);
      bot.rig.group.rotation.y = bot.yaw;
      animateCharacterRig(bot.rig, bot.animState, this.elapsedTotal, bot.seedOffset, hasLos);
    }
  }

  private updateEffects(delta: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= delta;
      if (tr.life <= 0) {
        this.scene.remove(tr.line);
        tr.line.geometry.dispose();
        (tr.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= delta;
      const attr = sp.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j < attr.count; j++) {
        sp.velocities[j * 3 + 1] -= 12 * delta;
        attr.setXYZ(
          j,
          attr.getX(j) + sp.velocities[j * 3] * delta,
          attr.getY(j) + sp.velocities[j * 3 + 1] * delta,
          attr.getZ(j) + sp.velocities[j * 3 + 2] * delta
        );
      }
      attr.needsUpdate = true;
      (sp.points.material as THREE.PointsMaterial).opacity = Math.max(0, sp.life / 0.32);

      if (sp.life <= 0) {
        this.scene.remove(sp.points);
        sp.points.geometry.dispose();
        (sp.points.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      }
    }
  }

  private updateMatchTimers(delta: number): void {
    if (this.roundResetTimer > 0) {
      this.roundResetTimer -= delta;
      if (this.roundResetTimer <= 0) {
        this.roundNumber++;
        this.roundTimer = this.config.durationSeconds;
        this.resetRoundEntities();
        this.showBanner(`RAUND ${this.roundNumber} BOSHLANDI`);
        audioEngine.playMatchStart();
      }
      return;
    }

    if (this.config.mode === 'practice') return;

    this.roundTimer -= delta;
    if (this.roundTimer <= 0) {
      if (this.config.mode === 'classic') {
        if (this.roundNumber >= this.config.roundLimit) {
          this.finishMatch();
        } else {
          this.roundResetTimer = 2.0;
          this.showBanner('VAQT TUGADI — KEYINGI RAUND');
        }
      } else {
        this.finishMatch();
      }
    }
  }

  private buildScoreboard(): ScoreboardEntry[] {
    const entries: ScoreboardEntry[] = [
      {
        id: 'player',
        name: this.playerName,
        team: this.config.team,
        kills: this.playerKills,
        deaths: this.playerDeaths,
        assists: 0,
        isPlayer: true,
        alive: this.playerHealth > 0,
      },
      ...this.bots.map((b) => ({
        id: b.id,
        name: b.name,
        team: b.team,
        kills: b.kills,
        deaths: b.deaths,
        assists: b.assists,
        isPlayer: false,
        alive: b.alive,
      })),
    ];
    return entries.sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  }

  private emitHud(): void {
    const slot = this.slots[this.activeSlot];
    let interactPrompt: string | null = null;
    for (const obj of this.builtMap.interactables) {
      if (obj.cooldown <= 0 && obj.position.distanceTo(this.playerPos) < 3.2) {
        interactPrompt = obj.label;
        break;
      }
    }

    const miniMapEntities = [
      {
        x: this.playerPos.x,
        z: this.playerPos.z,
        team: this.config.team,
        isPlayer: true,
        alive: this.playerHealth > 0,
      },
      ...this.bots.map((b) => ({
        x: b.position.x,
        z: b.position.z,
        team: b.team,
        alive: b.alive,
      })),
    ];

    this.callbacks.onHudUpdate({
      health: Math.max(0, Math.round(this.playerHealth)),
      maxHealth: this.playerMaxHealth,
      armor: Math.max(0, Math.round(this.playerArmor)),
      maxArmor: this.playerMaxArmor,
      activeSlot: this.activeSlot,
      weaponName: slot.spec.name,
      weaponCategory: slot.spec.category,
      ammoInMag: slot.ammoInMag,
      ammoReserve: slot.ammoReserve,
      isReloading: this.reloadTimer > 0,
      isAds: this.mouseRightDown && !slot.spec.isMelee && !slot.spec.isShield,
      isShieldBlocking: this.mouseRightDown && Boolean(slot.spec.isShield),
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      roundNumber: this.roundNumber,
      maxRounds: this.config.mode === 'classic' ? this.config.roundLimit : 1,
      timeRemaining: Math.max(0, Math.ceil(this.roundTimer)),
      fps: this.currentFps,
      stamina: Math.round(this.stamina),
      isCrouching: this.isCrouching,
      isSprinting: this.isSprinting,
      isPointerLocked: this.isPointerLocked,
      interactPrompt,
      notification: this.notification,
      killFeed: [...this.killFeed],
      scoreboard: this.buildScoreboard(),
      miniMapEntities,
      playerYaw: this.yaw,
      playerPos: { x: this.playerPos.x, z: this.playerPos.z },
      mapSize: this.builtMap.halfSize * 2,
      mapBounds: this.builtMap.mapBoundsForMiniMap,
      hitMarkerTimer: this.hitMarkerTimer,
      damageFlashTimer: this.damageFlashTimer,
      crosshairSpread: Math.round(this.dynamicSpread * 320 + (this.isSprinting ? 10 : this.isCrouching ? -2 : 0)),
      roundBanner: this.roundBanner,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    if (document.pointerLockElement === this.renderer?.domElement) {
      document.exitPointerLock();
    }
    audioEngine.stopAmbient();
    this.builtMap?.dispose();
    this.envMapTexture?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
