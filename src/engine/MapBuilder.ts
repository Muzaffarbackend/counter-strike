import * as THREE from 'three';
import { getMapMeta } from '../data/maps';
import { GraphicsQuality, MapId } from '../types/game';
import { buildPalmTree, buildPineTree, buildStreetLamp } from './ModelFactory';
import { createNeonSignTexture, getProceduralTexture, SurfacePattern } from './ProceduralTextures';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isWalkableTop?: boolean;
}

export interface InteractableObject {
  id: string;
  type: 'supply' | 'terminal';
  label: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  cooldown: number;
  capturedBy: 'A' | 'B' | null;
}

export interface BuiltMap {
  mapGroup: THREE.Group;
  colliders: BoxCollider[];
  bulletMeshes: THREE.Object3D[];
  spawnsA: THREE.Vector3[];
  spawnsB: THREE.Vector3[];
  interactables: InteractableObject[];
  mapBoundsForMiniMap: Array<{ x: number; z: number; w: number; d: number }>;
  halfSize: number;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

export function buildMap(
  mapId: MapId,
  scene: THREE.Scene,
  maxAnisotropy: number,
  quality: GraphicsQuality,
  isSoftwareGl: boolean
): BuiltMap {
  const meta = getMapMeta(mapId);
  const mapGroup = new THREE.Group();
  const colliders: BoxCollider[] = [];
  const bulletMeshes: THREE.Object3D[] = [];
  const interactables: InteractableObject[] = [];
  const mapBoundsForMiniMap: Array<{ x: number; z: number; w: number; d: number }> = [];
  const animatedCallbacks: Array<(elapsed: number, delta: number) => void> = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const halfSize = 46;
  const castShadows = !isSoftwareGl && quality !== 'low';

  // Background & Horizon Fog
  scene.background = new THREE.Color(meta.skyColor);
  scene.fog = new THREE.FogExp2(meta.fogColor, meta.isIndoor ? 0.022 : meta.isNight ? 0.017 : 0.012);

  // Lighting Rig (Warm/Cool contrast)
  const hemiSky = meta.isNight ? '#38BDF8' : meta.isIndoor ? '#64748B' : meta.skyColor;
  const hemiGround = meta.isNight ? '#0F172A' : '#332C24';
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, meta.isNight ? 0.45 : meta.isIndoor ? 0.55 : 0.72);
  mapGroup.add(hemi);

  const keyColor =
    mapId === 'desert_town'
      ? '#FFF0D1'
      : mapId === 'snow_base'
      ? '#F0F9FF'
      : mapId === 'night_city'
      ? '#93C5FD'
      : mapId === 'underground_facility'
      ? '#BAE6FD'
      : '#FFF7ED';
  const keyLight = new THREE.DirectionalLight(keyColor, meta.isNight ? 0.65 : meta.isIndoor ? 0.8 : 1.45);
  keyLight.position.set(34, 48, 28);
  if (castShadows) {
    keyLight.castShadow = true;
    const shadowRes = quality === 'ultra' ? 2048 : quality === 'high' ? 1024 : 512;
    keyLight.shadow.mapSize.set(shadowRes, shadowRes);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 140;
    const d = 52;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  mapGroup.add(keyLight);

  const rimLight = new THREE.DirectionalLight(meta.accentColor, meta.isNight ? 0.45 : 0.3);
  rimLight.position.set(-32, 22, -30);
  mapGroup.add(rimLight);

  // Helper to add solid box obstacle with collision + minimap footprint
  const addBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    options?: { walkable?: boolean; noMinimap?: boolean; noShadow?: boolean }
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = castShadows && !options?.noShadow;
    mesh.receiveShadow = true;
    mapGroup.add(mesh);
    bulletMeshes.push(mesh);

    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y,
      maxY: y + h,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      isWalkableTop: options?.walkable,
    });

    if (!options?.noMinimap && h >= 1.0) {
      mapBoundsForMiniMap.push({ x, z, w, d });
    }
    return mesh;
  };

  // Floor Surface
  const createFloor = (pattern: SurfacePattern, base: string, accent: string, repeat = 18, roughness = 0.85, metalness = 0.08) => {
    const tex = getProceduralTexture(pattern, base, accent, repeat, repeat, maxAnisotropy);
    const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness, metalness });
    disposables.push(floorMat);
    const extent = meta.isIndoor ? halfSize * 2 + 4 : 260; // Extend far beyond perimeter for outdoor horizons!
    const geo = new THREE.PlaneGeometry(extent, extent);
    disposables.push(geo);
    const floor = new THREE.Mesh(geo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    mapGroup.add(floor);
    bulletMeshes.push(floor);
  };

  // Perimeter Boundary (Natural barriers for outdoor maps, structural walls for indoor maps)
  const addPerimeter = (mat: THREE.Material, naturalMode: 'rock' | 'water' | 'wall' | 'city') => {
    const bound = halfSize + 1.5;
    // Invisible boundary colliders so player stays in combat zone
    const invisMat = new THREE.MeshBasicMaterial({ visible: false });
    disposables.push(invisMat);
    addBox(0, 0, -bound, halfSize * 2 + 4, 8, 2, naturalMode === 'wall' ? mat : invisMat, { noMinimap: true, noShadow: true });
    addBox(0, 0, bound, halfSize * 2 + 4, 8, 2, naturalMode === 'wall' ? mat : invisMat, { noMinimap: true, noShadow: true });
    addBox(-bound, 0, 0, 2, 8, halfSize * 2 + 4, naturalMode === 'wall' ? mat : invisMat, { noMinimap: true, noShadow: true });
    addBox(bound, 0, 0, 2, 8, halfSize * 2 + 4, naturalMode === 'wall' ? mat : invisMat, { noMinimap: true, noShadow: true });

    if (naturalMode === 'rock') {
      // Surrounding dunes / mountains / cliffs outside playable area
      const rockMat = new THREE.MeshStandardMaterial({
        color: mapId === 'snow_base' ? '#94A3B8' : mapId === 'desert_town' ? '#B99363' : '#4B5563',
        roughness: 0.9,
      });
      disposables.push(rockMat);
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const r = halfSize + 10 + (i % 3) * 6;
        const rx = Math.cos(angle) * r;
        const rz = Math.sin(angle) * r;
        const h = 10 + (i % 5) * 4.5;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(10 + (i % 3) * 3, h, 7), rockMat);
        cone.position.set(rx, h / 2 - 0.5, rz);
        cone.rotation.y = i;
        mapGroup.add(cone);
      }
    } else if (naturalMode === 'water') {
      const waterTex = getProceduralTexture('water', '#0284C7', '#BAE6FD', 24, 24, maxAnisotropy);
      const waterMat = new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.22, metalness: 0.45 });
      disposables.push(waterMat);
      const waterGeo = new THREE.RingGeometry(halfSize + 1, 180, 32);
      disposables.push(waterGeo);
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.y = -0.15;
      mapGroup.add(water);
      animatedCallbacks.push((elapsed) => {
        waterTex.offset.x = elapsed * 0.02;
        waterTex.offset.y = Math.sin(elapsed * 0.5) * 0.02;
      });
    } else if (naturalMode === 'city') {
      // Distant skyline towers outside perimeter
      const skyTex = getProceduralTexture('skyscraper', '#111827', meta.accentColor, 2, 4, maxAnisotropy);
      const towerMat = new THREE.MeshStandardMaterial({ map: skyTex, roughness: 0.5, metalness: 0.4 });
      disposables.push(towerMat);
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const r = halfSize + 12 + (i % 2) * 8;
        const h = 18 + (i % 5) * 8;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(10, h, 10), towerMat);
        tower.position.set(Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
        mapGroup.add(tower);
      }
    }
  };

  // Interactive Crates & Terminals
  const addSupplyCrate = (id: string, x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.75, 0.9),
      new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.5, roughness: 0.4 })
    );
    base.position.y = 0.375;
    base.castShadow = castShadows;
    g.add(base);
    const glowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.14, 0.94),
      new THREE.MeshStandardMaterial({ color: '#22C55E', emissive: '#22C55E', emissiveIntensity: 0.9 })
    );
    glowStrip.position.y = 0.62;
    g.add(glowStrip);
    mapGroup.add(g);
    interactables.push({
      id,
      type: 'supply',
      label: '[E] Ta\'minot qutisi (Sog\'liq + Zirh + O\'q)',
      position: new THREE.Vector3(x, 0.5, z),
      mesh: g,
      cooldown: 0,
      capturedBy: null,
    });
  };

  const addTacticalTerminal = (id: string, label: string, x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 1.1, 10),
      new THREE.MeshStandardMaterial({ color: '#1F2937', metalness: 0.7, roughness: 0.3 })
    );
    ped.position.y = 0.55;
    ped.castShadow = castShadows;
    g.add(ped);
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.12),
      new THREE.MeshStandardMaterial({ color: '#F97316', emissive: '#F97316', emissiveIntensity: 0.9 })
    );
    screen.position.y = 1.3;
    screen.rotation.x = -0.3;
    g.add(screen);
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#38BDF8', emissiveIntensity: 1.1 })
    );
    beacon.position.y = 1.85;
    g.add(beacon);
    mapGroup.add(g);

    animatedCallbacks.push((elapsed) => {
      beacon.rotation.y = elapsed * 2.1;
      beacon.position.y = 1.85 + Math.sin(elapsed * 3) * 0.08;
    });

    interactables.push({
      id,
      type: 'terminal',
      label,
      position: new THREE.Vector3(x, 1.0, z),
      mesh: g,
      cooldown: 0,
      capturedBy: null,
    });
  };

  // Shared crate material helper
  const crateTex = getProceduralTexture('crate', '#855E42', '#4B3221', 1, 1, maxAnisotropy);
  const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.78, metalness: 0.08 });
  disposables.push(crateMat);

  // =========================================================================
  // BUILD EACH OF THE 10 UNIQUE MAPS
  // =========================================================================
  if (mapId === 'desert_town') {
    createFloor('sand', '#D4B07E', '#B38953', 22, 0.92, 0.02);
    const adobeMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('adobe', '#C9A270', '#8F6A42', 2, 2, maxAnisotropy),
      roughness: 0.88,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#785735', roughness: 0.82 });
    disposables.push(adobeMat, trimMat);
    addPerimeter(adobeMat, 'rock');

    // Central market plaza & adobe houses with lanes
    addBox(-14, 0, -10, 10, 6.5, 10, adobeMat);
    addBox(14, 0, -10, 10, 7.5, 10, adobeMat);
    addBox(-14, 0, 14, 11, 6, 9, adobeMat);
    addBox(14, 0, 14, 11, 6.5, 9, adobeMat);
    // Central archway & market cover
    addBox(0, 0, 0, 6, 3.2, 6, adobeMat, { walkable: true });
    addBox(-5, 0, 0, 2.2, 1.5, 2.2, crateMat, { walkable: true });
    addBox(5, 0, 2, 2.2, 1.5, 2.2, crateMat, { walkable: true });
    addBox(-26, 0, 0, 5, 5, 16, adobeMat);
    addBox(26, 0, 0, 5, 5, 16, adobeMat);
    addBox(0, 0, -24, 14, 3.8, 4, trimMat);
    addBox(0, 0, 24, 14, 3.8, 4, trimMat);

    // Market canopies & palms
    [[-22, -22], [22, -22], [-22, 22], [22, 22]].forEach(([px, pz]) => {
      const palm = buildPalmTree(1.1);
      palm.position.set(px, 0, pz);
      mapGroup.add(palm);
    });
  } else if (mapId === 'industrial_zone') {
    createFloor('concrete', '#525A63', '#363C42', 20, 0.82, 0.14);
    const wallMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('metal_floor', '#3E4752', '#F97316', 2, 2, maxAnisotropy),
      roughness: 0.45,
      metalness: 0.6,
    });
    const orangeCont = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('container', '#C2410C', '#7C2D12', 2, 1, maxAnisotropy),
      roughness: 0.55,
      metalness: 0.45,
    });
    const blueCont = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('container', '#1D4ED8', '#1E3A8A', 2, 1, maxAnisotropy),
      roughness: 0.55,
      metalness: 0.45,
    });
    disposables.push(wallMat, orangeCont, blueCont);
    addPerimeter(wallMat, 'wall');

    // Warehouses & shipping containers
    addBox(-18, 0, -14, 14, 8, 10, wallMat);
    addBox(18, 0, 14, 14, 8, 10, wallMat);
    addBox(-10, 0, 4, 8, 3.2, 3.2, orangeCont, { walkable: true });
    addBox(10, 0, -4, 8, 3.2, 3.2, blueCont, { walkable: true });
    addBox(0, 0, 0, 3.5, 6.2, 3.5, orangeCont);
    addBox(0, 0, -18, 10, 3.2, 3.2, blueCont, { walkable: true });
    addBox(0, 0, 18, 10, 3.2, 3.2, orangeCont, { walkable: true });
    addBox(-28, 0, 10, 4, 4, 10, crateMat);
    addBox(28, 0, -10, 4, 4, 10, crateMat);

    // Smokestacks with pulsing warning beacons
    [[-34, -34], [34, 34]].forEach(([sx, sz]) => {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 18, 12), wallMat);
      stack.position.set(sx, 9, sz);
      mapGroup.add(stack);
    });
  } else if (mapId === 'snow_base') {
    createFloor('snow', '#E2E8F0', '#94A3B8', 22, 0.85, 0.05);
    const bunkerMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('metal_floor', '#64748B', '#38BDF8', 2, 2, maxAnisotropy),
      roughness: 0.42,
      metalness: 0.5,
    });
    const iceMat = new THREE.MeshStandardMaterial({ color: '#BAE6FD', roughness: 0.25, metalness: 0.15 });
    disposables.push(bunkerMat, iceMat);
    addPerimeter(bunkerMat, 'rock');

    addBox(0, 0, 0, 10, 4.5, 10, bunkerMat, { walkable: true });
    addBox(-18, 0, -12, 10, 6.5, 12, bunkerMat);
    addBox(18, 0, 12, 10, 6.5, 12, bunkerMat);
    addBox(-16, 0, 16, 8, 3.5, 8, iceMat, { walkable: true });
    addBox(16, 0, -16, 8, 3.5, 8, iceMat, { walkable: true });
    addBox(-28, 0, 0, 3.5, 2.2, 10, crateMat);
    addBox(28, 0, 0, 3.5, 2.2, 10, crateMat);

    // Rotating Radar Dish on central bunker
    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 4.6, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 8), bunkerMat);
    mast.position.y = 1.5;
    radarGroup.add(mast);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 14, 1, true), iceMat);
    dish.position.y = 3.2;
    dish.rotation.x = Math.PI / 3;
    radarGroup.add(dish);
    mapGroup.add(radarGroup);
    animatedCallbacks.push((elapsed) => {
      radarGroup.rotation.y = elapsed * 0.8;
    });

    // Snowy Pines
    [[-32, -32], [32, -32], [-32, 32], [32, 32], [-8, -28], [8, 28]].forEach(([px, pz]) => {
      const pine = buildPineTree(true, 1.25);
      pine.position.set(px, 0, pz);
      mapGroup.add(pine);
    });
  } else if (mapId === 'city_center') {
    createFloor('cobble', '#94A3B8', '#475569', 26, 0.78, 0.08);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('brick', '#CBD5E1', '#64748B', 3, 3, maxAnisotropy),
      roughness: 0.72,
    });
    const darkTrim = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5, metalness: 0.35 });
    disposables.push(stoneMat, darkTrim);
    addPerimeter(stoneMat, 'city');

    // European plaza buildings & central fountain
    addBox(-20, 0, -16, 12, 11, 12, stoneMat);
    addBox(20, 0, -16, 12, 11, 12, stoneMat);
    addBox(-20, 0, 16, 12, 11, 12, stoneMat);
    addBox(20, 0, 16, 12, 11, 12, stoneMat);
    addBox(0, 0, 0, 5.5, 1.4, 5.5, stoneMat, { walkable: true });
    addBox(-10, 0, 0, 3, 1.8, 7, darkTrim);
    addBox(10, 0, 0, 3, 1.8, 7, darkTrim);
    addBox(0, 0, -18, 8, 2.2, 3, crateMat);
    addBox(0, 0, 18, 8, 2.2, 3, crateMat);

    // Fountain spire & lamps
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 3.2, 10), stoneMat);
    spire.position.set(0, 2.8, 0);
    mapGroup.add(spire);
    [[-10, -10], [10, -10], [-10, 10], [10, 10]].forEach(([lx, lz]) => {
      const lamp = buildStreetLamp('#FEF08A');
      lamp.position.set(lx, 0, lz);
      mapGroup.add(lamp);
    });
  } else if (mapId === 'abandoned_factory') {
    createFloor('concrete', '#2B3038', '#171A1F', 18, 0.88, 0.15);
    const rustMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('container', '#5C3A28', '#291D16', 2, 2, maxAnisotropy),
      roughness: 0.78,
      metalness: 0.45,
    });
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.85, metalness: 0.2 });
    disposables.push(rustMat, pillarMat);
    addPerimeter(pillarMat, 'wall');

    // Factory roof beams (with skylight gaps)
    for (let z = -30; z <= 30; z += 20) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(92, 1.4, 3), pillarMat);
      beam.position.set(0, 12, z);
      mapGroup.add(beam);
    }

    // Machinery, catwalks, pillars
    addBox(-16, 0, -12, 4, 12, 4, pillarMat);
    addBox(16, 0, -12, 4, 12, 4, pillarMat);
    addBox(-16, 0, 12, 4, 12, 4, pillarMat);
    addBox(16, 0, 12, 4, 12, 4, pillarMat);
    addBox(0, 0, 0, 10, 3.5, 6, rustMat, { walkable: true });
    addBox(-26, 0, 0, 6, 4.2, 14, rustMat);
    addBox(26, 0, 0, 6, 4.2, 14, rustMat);
    addBox(-6, 0, -22, 4, 2.2, 4, crateMat);
    addBox(6, 0, 22, 4, 2.2, 4, crateMat);

    // Dramatic warm point lights
    [[-16, 8, 0], [16, 8, 0], [0, 9, 0]].forEach(([x, y, z]) => {
      const pl = new THREE.PointLight('#FB923C', 28, 34, 1.5);
      pl.position.set(x, y, z);
      mapGroup.add(pl);
    });
  } else if (mapId === 'tropical_island') {
    createFloor('sand', '#EAD098', '#C9A86A', 20, 0.9, 0.02);
    const villaMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('concrete', '#F8FAFC', '#0D9488', 2, 2, maxAnisotropy),
      roughness: 0.55,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('wood', '#9A6B42', '#5C3D22', 2, 2, maxAnisotropy),
      roughness: 0.78,
    });
    disposables.push(villaMat, woodMat);
    addPerimeter(woodMat, 'water');

    addBox(-16, 0, -12, 10, 5.5, 9, villaMat);
    addBox(16, 0, 12, 10, 5.5, 9, villaMat);
    addBox(-14, 0, 14, 9, 4.5, 8, woodMat);
    addBox(14, 0, -14, 9, 4.5, 8, woodMat);
    addBox(0, 0, 0, 8, 1.6, 8, woodMat, { walkable: true });
    addBox(-24, 0, 0, 3.5, 2, 6, crateMat);
    addBox(24, 0, 0, 3.5, 2, 6, crateMat);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const palm = buildPalmTree(0.95 + (i % 3) * 0.18);
      palm.position.set(Math.cos(angle) * 34, 0, Math.sin(angle) * 34);
      mapGroup.add(palm);
    }
  } else if (mapId === 'underground_facility') {
    createFloor('metal_floor', '#16202E', '#06B6D4', 20, 0.35, 0.65);
    const labMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('tech_wall', '#1E293B', '#06B6D4', 2, 2, maxAnisotropy),
      roughness: 0.32,
      metalness: 0.68,
    });
    const serverMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('tech_wall', '#0F172A', '#F97316', 1, 2, maxAnisotropy),
      roughness: 0.25,
      metalness: 0.8,
    });
    disposables.push(labMat, serverMat);
    addPerimeter(labMat, 'wall');

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(halfSize * 2 + 4, halfSize * 2 + 4), labMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 11;
    mapGroup.add(ceil);

    // Central Glowing Reactor Core
    addBox(0, 0, 0, 4.2, 10, 4.2, labMat);
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.28, 12, 32),
      new THREE.MeshStandardMaterial({ color: '#06B6D4', emissive: '#06B6D4', emissiveIntensity: 1.4 })
    );
    coreRing.position.set(0, 3.8, 0);
    coreRing.rotation.x = Math.PI / 2;
    mapGroup.add(coreRing);
    animatedCallbacks.push((elapsed) => {
      coreRing.position.y = 3.8 + Math.sin(elapsed * 2) * 0.8;
      coreRing.rotation.z = elapsed;
    });

    addBox(-16, 0, -14, 8, 5, 10, serverMat);
    addBox(16, 0, 14, 8, 5, 10, serverMat);
    addBox(-16, 0, 14, 8, 5, 10, labMat);
    addBox(16, 0, -14, 8, 5, 10, labMat);
    addBox(-8, 0, 0, 2.5, 2.2, 6, serverMat);
    addBox(8, 0, 0, 2.5, 2.2, 6, serverMat);

    const cyanLight = new THREE.PointLight('#06B6D4', 36, 44, 1.4);
    cyanLight.position.set(0, 6, 0);
    mapGroup.add(cyanLight);
  } else if (mapId === 'harbor') {
    createFloor('asphalt', '#333C45', '#475569', 18, 0.78, 0.12);
    const redCont = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('container', '#B91C1C', '#7F1D1D', 2, 1, maxAnisotropy),
      roughness: 0.5,
      metalness: 0.45,
    });
    const tealCont = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('container', '#0F766E', '#134E4A', 2, 1, maxAnisotropy),
      roughness: 0.5,
      metalness: 0.45,
    });
    const yellowCont = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('container', '#CA8A04', '#713F12', 2, 1, maxAnisotropy),
      roughness: 0.5,
      metalness: 0.45,
    });
    const craneMat = new THREE.MeshStandardMaterial({ color: '#EA580C', roughness: 0.45, metalness: 0.6 });
    disposables.push(redCont, tealCont, yellowCont, craneMat);
    addPerimeter(craneMat, 'water');

    // Stacked shipping containers
    addBox(-14, 0, -10, 9, 3.2, 3.5, redCont, { walkable: true });
    addBox(-14, 3.2, -10, 9, 3.2, 3.5, tealCont);
    addBox(14, 0, 10, 9, 3.2, 3.5, yellowCont, { walkable: true });
    addBox(14, 3.2, 10, 9, 3.2, 3.5, redCont);
    addBox(-14, 0, 12, 9, 3.2, 3.5, tealCont, { walkable: true });
    addBox(14, 0, -12, 9, 3.2, 3.5, redCont, { walkable: true });
    addBox(0, 0, 0, 3.5, 3.2, 10, yellowCont, { walkable: true });
    addBox(0, 0, -22, 12, 6, 6, tealCont);
    addBox(0, 0, 22, 12, 6, 6, redCont);

    // Giant Port Crane
    const craneLeg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 16, 2.2), craneMat);
    craneLeg.position.set(28, 8, -24);
    mapGroup.add(craneLeg);
    const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(24, 1.5, 2.2), craneMat);
    craneBoom.position.set(18, 16, -24);
    mapGroup.add(craneBoom);
  } else if (mapId === 'mountain_village') {
    createFloor('grass', '#4D6B3C', '#3B522D', 24, 0.92, 0.03);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('cobble', '#78716C', '#44403C', 3, 3, maxAnisotropy),
      roughness: 0.85,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#7C2D12', roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('wood', '#855E42', '#451A03', 2, 2, maxAnisotropy),
      roughness: 0.82,
    });
    disposables.push(stoneMat, roofMat, woodMat);
    addPerimeter(stoneMat, 'rock');

    // Stone cottages with pitched roofs
    [[-16, -14], [16, -14], [-16, 14], [16, 14]].forEach(([cx, cz]) => {
      addBox(cx, 0, cz, 9, 5, 9, stoneMat);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.2, 4), roofMat);
      roof.position.set(cx, 6.6, cz);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = castShadows;
      mapGroup.add(roof);
    });

    // Cobblestone center & wooden bridge cover
    addBox(0, 0, 0, 8, 1.5, 4, woodMat, { walkable: true });
    addBox(-24, 0, 0, 4, 2.5, 10, stoneMat);
    addBox(24, 0, 0, 4, 2.5, 10, stoneMat);
    addBox(0, 0, -20, 6, 2, 3, crateMat);
    addBox(0, 0, 20, 6, 2, 3, crateMat);

    [[-30, -28], [30, -28], [-30, 28], [30, 28], [-6, -32], [6, 32]].forEach(([px, pz]) => {
      const pine = buildPineTree(false, 1.2);
      pine.position.set(px, 0, pz);
      mapGroup.add(pine);
    });
  } else if (mapId === 'night_city') {
    createFloor('wet_asphalt', '#111827', '#EC4899', 22, 0.28, 0.35);
    const towerMat = new THREE.MeshStandardMaterial({
      map: getProceduralTexture('skyscraper', '#0F172A', '#38BDF8', 2, 4, maxAnisotropy),
      roughness: 0.38,
      metalness: 0.55,
    });
    const darkBlockMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5, metalness: 0.4 });
    disposables.push(towerMat, darkBlockMat);
    addPerimeter(towerMat, 'city');

    addBox(-18, 0, -14, 11, 18, 11, towerMat);
    addBox(18, 0, -14, 11, 16, 11, towerMat);
    addBox(-18, 0, 14, 11, 16, 11, towerMat);
    addBox(18, 0, 14, 11, 20, 11, towerMat);
    addBox(0, 0, 0, 6, 2.4, 6, darkBlockMat, { walkable: true });
    addBox(-9, 0, 0, 3, 1.6, 8, darkBlockMat);
    addBox(9, 0, 0, 3, 1.6, 8, darkBlockMat);
    addBox(0, 0, -22, 8, 2.2, 3, crateMat);
    addBox(0, 0, 22, 8, 2.2, 3, crateMat);

    // Neon billboards in Uzbek
    const signA = createNeonSignTexture('NEON SEKTOR', '#EC4899');
    const signB = createNeonSignTexture('MARKAZ 01', '#22D3EE');
    const sMeshA = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.8),
      new THREE.MeshBasicMaterial({ map: signA })
    );
    sMeshA.position.set(-18, 8.5, -8.4);
    mapGroup.add(sMeshA);
    const sMeshB = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.8),
      new THREE.MeshBasicMaterial({ map: signB })
    );
    sMeshB.position.set(18, 8.5, 8.4);
    sMeshB.rotation.y = Math.PI;
    mapGroup.add(sMeshB);

    [[-10, -10], [10, 10]].forEach(([lx, lz], idx) => {
      const col = idx === 0 ? '#EC4899' : '#22D3EE';
      const lamp = buildStreetLamp(col);
      lamp.position.set(lx, 0, lz);
      mapGroup.add(lamp);
      const pl = new THREE.PointLight(col, 24, 28, 1.5);
      pl.position.set(lx, 5.2, lz);
      mapGroup.add(pl);
    });
  }

  // Add common interactive stations across all maps
  addSupplyCrate('supply_a', -20, -28);
  addSupplyCrate('supply_b', 20, 28);
  addTacticalTerminal('term_center', '[E] Taktik signal nuqtasini faollashtirish', 0, -8);

  // Ambient Atmospheric Particles (Snow / Sand dust / Neon embers)
  if (!isSoftwareGl || quality !== 'low') {
    const pCount = quality === 'ultra' ? 220 : 120;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 80;
      pPos[i * 3 + 1] = Math.random() * 14 + 0.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pColor =
      mapId === 'snow_base'
        ? '#FFFFFF'
        : mapId === 'night_city'
        ? '#22D3EE'
        : mapId === 'desert_town'
        ? '#FDE68A'
        : '#CBD5E1';
    const pMat = new THREE.PointsMaterial({
      color: pColor,
      size: mapId === 'snow_base' ? 0.24 : 0.14,
      transparent: true,
      opacity: 0.65,
    });
    disposables.push(pGeo, pMat);
    const points = new THREE.Points(pGeo, pMat);
    mapGroup.add(points);

    animatedCallbacks.push((_elapsed, delta) => {
      const attr = pGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pCount; i++) {
        let y = attr.getY(i);
        let x = attr.getX(i);
        if (mapId === 'snow_base') {
          y -= delta * 2.2;
          x += Math.sin(y + i) * delta * 0.4;
          if (y < 0) y = 14;
        } else {
          y += Math.sin(i + _elapsed) * delta * 0.3;
          x += delta * 0.6;
          if (x > 40) x = -40;
        }
        attr.setXY(i, x, y);
      }
      attr.needsUpdate = true;
    });
  }

  scene.add(mapGroup);

  const spawnsA = [
    new THREE.Vector3(-8, 0, -36),
    new THREE.Vector3(0, 0, -38),
    new THREE.Vector3(8, 0, -36),
    new THREE.Vector3(-16, 0, -35),
    new THREE.Vector3(16, 0, -35),
  ];

  const spawnsB = [
    new THREE.Vector3(-8, 0, 36),
    new THREE.Vector3(0, 0, 38),
    new THREE.Vector3(8, 0, 36),
    new THREE.Vector3(-16, 0, 35),
    new THREE.Vector3(16, 0, 35),
  ];

  return {
    mapGroup,
    colliders,
    bulletMeshes,
    spawnsA,
    spawnsB,
    interactables,
    mapBoundsForMiniMap,
    halfSize,
    update: (elapsed, delta) => {
      for (let i = 0; i < animatedCallbacks.length; i++) {
        animatedCallbacks[i](elapsed, delta);
      }
    },
    dispose: () => {
      scene.remove(mapGroup);
      disposables.forEach((d) => d.dispose());
    },
  };
}
