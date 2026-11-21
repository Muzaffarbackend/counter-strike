import * as THREE from 'three';
import { WEAPON_SKINS } from '../data/weapons';
import { CharacterSpec, SkinId, WeaponSpec } from '../types/game';
import { getSkinTexture } from './ProceduralTextures';

export interface RiggedCharacter {
  group: THREE.Group;
  headGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponMount: THREE.Group;
  hitMeshes: THREE.Object3D[];
}

export type CharacterAnimState = 'idle' | 'walk' | 'run' | 'crouch' | 'jump';

export function buildCharacterModel(spec: CharacterSpec, castShadow = true): RiggedCharacter {
  const root = new THREE.Group();
  const hitMeshes: THREE.Object3D[] = [];

  const suitMat = new THREE.MeshStandardMaterial({
    color: spec.primaryColor,
    roughness: 0.72,
    metalness: 0.12,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryColor,
    roughness: 0.45,
    metalness: 0.28,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: spec.team === 'A' ? '#3B2F28' : '#1E293B',
    roughness: 0.36,
    metalness: 0.55,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accentColor,
    roughness: 0.28,
    metalness: 0.7,
    emissive: spec.accentColor,
    emissiveIntensity: 0.25,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#D4A373',
    roughness: 0.68,
    metalness: 0.05,
  });

  // 1. Torso group (pivot at hips y=0.88)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.88, 0);
  root.add(torsoGroup);

  const chestGeo = new THREE.BoxGeometry(0.46, 0.54, 0.26);
  const chest = new THREE.Mesh(chestGeo, suitMat);
  chest.position.y = 0.27;
  chest.castShadow = castShadow;
  chest.receiveShadow = true;
  chest.userData.hitZone = 'body';
  torsoGroup.add(chest);
  hitMeshes.push(chest);

  // Tactical Vest / Armor plate
  const vestScale = spec.armorStyle === 'heavy' ? 1.08 : spec.armorStyle === 'light' ? 0.88 : 0.98;
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(0.49 * vestScale, 0.4 * vestScale, 0.3 * vestScale),
    armorMat
  );
  vest.position.y = 0.29;
  vest.castShadow = castShadow;
  vest.userData.hitZone = 'body';
  torsoGroup.add(vest);

  // Utility pouches + team stripe accent
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.29), trimMat);
  belt.position.y = 0.05;
  torsoGroup.add(belt);

  const insignia = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.31), accentMat);
  insignia.position.set(0.12, 0.38, 0);
  torsoGroup.add(insignia);

  // Backpack / comms unit for tactical/recon
  if (spec.armorStyle === 'heavy' || spec.armorStyle === 'recon' || spec.armorStyle === 'tactical') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.14), trimMat);
    pack.position.set(0, 0.28, 0.19);
    pack.castShadow = castShadow;
    torsoGroup.add(pack);
  }

  // 2. Head group (attached to top of torso)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.57, 0);
  torsoGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
  head.position.y = 0.2;
  head.castShadow = castShadow;
  head.userData.hitZone = 'head';
  headGroup.add(head);
  hitMeshes.push(head);

  // Individual Character Headgear
  if (spec.gearType === 'helmet') {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), armorMat);
    helmet.position.y = 0.24;
    helmet.castShadow = castShadow;
    helmet.userData.hitZone = 'head';
    headGroup.add(helmet);
    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.14), accentMat);
    visorBand.position.set(0, 0.22, -0.09);
    headGroup.add(visorBand);
  } else if (spec.gearType === 'visor') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.27), armorMat);
    cap.position.y = 0.29;
    headGroup.add(cap);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.06), accentMat);
    visor.position.set(0, 0.21, -0.12);
    headGroup.add(visor);
  } else if (spec.gearType === 'mask') {
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.15, 0.255), trimMat);
    mask.position.y = 0.16;
    headGroup.add(mask);
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.07), accentMat);
    goggles.position.set(0, 0.24, -0.11);
    headGroup.add(goggles);
  } else if (spec.gearType === 'beret') {
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.08, 14), accentMat);
    beret.position.set(0.02, 0.34, 0);
    beret.rotation.z = -0.18;
    headGroup.add(beret);
  } else {
    // Hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.3, 0.29), suitMat);
    hood.position.set(0, 0.21, 0.02);
    headGroup.add(hood);
    const faceShadow = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.04), trimMat);
    faceShadow.position.set(0, 0.18, -0.12);
    headGroup.add(faceShadow);
  }

  // 3. Arms (pivoted at shoulders)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.31, 0.47, 0);
  torsoGroup.add(leftArm);

  const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.16), armorMat);
  lShoulder.position.y = -0.04;
  leftArm.add(lShoulder);
  const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), suitMat);
  lSleeve.position.y = -0.26;
  lSleeve.castShadow = castShadow;
  lSleeve.userData.hitZone = 'body';
  leftArm.add(lSleeve);
  hitMeshes.push(lSleeve);
  const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), trimMat);
  lGlove.position.y = -0.52;
  leftArm.add(lGlove);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.31, 0.47, 0);
  torsoGroup.add(rightArm);

  const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.16), armorMat);
  rShoulder.position.y = -0.04;
  rightArm.add(rShoulder);
  const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), suitMat);
  rSleeve.position.y = -0.26;
  rSleeve.castShadow = castShadow;
  rSleeve.userData.hitZone = 'body';
  rightArm.add(rSleeve);
  hitMeshes.push(rSleeve);
  const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), trimMat);
  rGlove.position.y = -0.52;
  rightArm.add(rGlove);

  // Weapon mount on right forearm
  const weaponMount = new THREE.Group();
  weaponMount.position.set(-0.04, -0.45, -0.18);
  rightArm.add(weaponMount);

  // 4. Legs (pivoted at hips y=0.88)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.13, 0.88, 0);
  root.add(leftLeg);

  const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.46, 0.18), trimMat);
  lThigh.position.y = -0.24;
  lThigh.castShadow = castShadow;
  lThigh.userData.hitZone = 'legs';
  leftLeg.add(lThigh);
  hitMeshes.push(lThigh);

  const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.16), suitMat);
  lShin.position.y = -0.62;
  lShin.castShadow = castShadow;
  leftLeg.add(lShin);

  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.24), armorMat);
  lBoot.position.set(0, -0.82, -0.03);
  leftLeg.add(lBoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.13, 0.88, 0);
  root.add(rightLeg);

  const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.46, 0.18), trimMat);
  rThigh.position.y = -0.24;
  rThigh.castShadow = castShadow;
  rThigh.userData.hitZone = 'legs';
  rightLeg.add(rThigh);
  hitMeshes.push(rThigh);

  const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.16), suitMat);
  rShin.position.y = -0.62;
  rShin.castShadow = castShadow;
  rightLeg.add(rShin);

  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.24), armorMat);
  rBoot.position.set(0, -0.82, -0.03);
  rightLeg.add(rBoot);

  // Subtle knee pads
  const lKnee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), accentMat);
  lKnee.position.set(0, -0.45, -0.09);
  leftLeg.add(lKnee);
  const rKnee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), accentMat);
  rKnee.position.set(0, -0.45, -0.09);
  rightLeg.add(rKnee);

  return {
    group: root,
    headGroup,
    torsoGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponMount,
    hitMeshes,
  };
}

export function animateCharacterRig(
  rig: RiggedCharacter,
  state: CharacterAnimState,
  time: number,
  seedOffset = 0,
  aimMode = false
): void {
  const t = time + seedOffset;
  if (state === 'idle') {
    const breath = Math.sin(t * 2.2) * 0.025;
    rig.torsoGroup.position.y = 0.88 + breath;
    rig.torsoGroup.rotation.x = 0;
    rig.torsoGroup.rotation.y = Math.sin(t * 0.9) * 0.04;
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftArm.rotation.x = aimMode ? 1.15 : 0.25 + breath;
    rig.rightArm.rotation.x = aimMode ? 1.35 : 0.45 - breath;
    rig.headGroup.rotation.y = Math.sin(t * 1.1) * 0.08;
  } else if (state === 'walk' || state === 'run') {
    const freq = state === 'run' ? 11.5 : 7.2;
    const amp = state === 'run' ? 0.65 : 0.42;
    const bob = Math.abs(Math.sin(t * freq)) * (state === 'run' ? 0.06 : 0.03);
    rig.torsoGroup.position.y = 0.88 + bob;
    rig.torsoGroup.rotation.x = state === 'run' ? 0.14 : 0.05;
    rig.leftLeg.rotation.x = Math.sin(t * freq) * amp;
    rig.rightLeg.rotation.x = -Math.sin(t * freq) * amp;
    rig.leftArm.rotation.x = aimMode ? 1.15 : -Math.sin(t * freq) * amp * 0.7 + 0.35;
    rig.rightArm.rotation.x = aimMode ? 1.35 : Math.sin(t * freq) * amp * 0.3 + 0.6;
    rig.headGroup.rotation.y = 0;
  } else if (state === 'crouch') {
    rig.torsoGroup.position.y = 0.58;
    rig.torsoGroup.rotation.x = 0.18;
    rig.leftLeg.rotation.x = -0.65;
    rig.rightLeg.rotation.x = -0.45;
    rig.leftArm.rotation.x = aimMode ? 1.2 : 0.5;
    rig.rightArm.rotation.x = aimMode ? 1.35 : 0.7;
  } else if (state === 'jump') {
    rig.torsoGroup.position.y = 0.95;
    rig.torsoGroup.rotation.x = -0.05;
    rig.leftLeg.rotation.x = 0.45;
    rig.rightLeg.rotation.x = -0.35;
    rig.leftArm.rotation.x = 0.8;
    rig.rightArm.rotation.x = 1.1;
  }
}

export function buildWeaponModel(weapon: WeaponSpec, skinId: SkinId): THREE.Group {
  const skin = WEAPON_SKINS[skinId] || WEAPON_SKINS.classic;
  const skinTex = getSkinTexture(skinId, skin.primaryColor, skin.secondaryColor, skin.accentColor);

  const bodyMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    metalness: skin.metalness,
    roughness: skin.roughness,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#16191F',
    metalness: 0.82,
    roughness: 0.28,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    metalness: 0.15,
    roughness: 0.82,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.accentColor,
    metalness: 0.7,
    roughness: 0.25,
    emissive: skinId === 'neon' ? skin.accentColor : '#000000',
    emissiveIntensity: skinId === 'neon' ? 0.85 : 0,
  });

  const group = new THREE.Group();

  if (weapon.category === 'shield') {
    // Ballistic tactical shield (5 parts)
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.05, 0.06), bodyMat);
    plate.castShadow = true;
    group.add(plate);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.09, 0.03), darkMetalMat);
    frame.position.z = 0.025;
    group.add(frame);

    const viewport = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.08),
      new THREE.MeshPhysicalMaterial({
        color: '#93C5FD',
        metalness: 0.1,
        roughness: 0.08,
        transparent: true,
        opacity: 0.6,
      })
    );
    viewport.position.set(0, 0.25, 0);
    group.add(viewport);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.12), gripMat);
    handle.position.set(0, -0.05, 0.08);
    group.add(handle);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.07), accentMat);
    stripe.position.set(0, -0.25, -0.005);
    group.add(stripe);
    return group;
  }

  if (weapon.category === 'melee') {
    // Tactical blade (4 parts)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.16, 10), gripMat);
    handle.rotation.x = Math.PI / 2;
    group.add(handle);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.02), accentMat);
    guard.position.set(0, 0, -0.085);
    group.add(guard);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.055, 0.28), bodyMat);
    blade.position.set(0, 0.01, -0.23);
    group.add(blade);

    const edge = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 4), darkMetalMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(0, 0.01, -0.41);
    group.add(edge);
    return group;
  }

  if (weapon.category === 'pistol') {
    // Pistol (5 parts)
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.26), bodyMat);
    slide.position.set(0, 0.04, -0.06);
    group.add(slide);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.22), darkMetalMat);
    frame.position.set(0, 0.005, -0.04);
    group.add(frame);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.065), gripMat);
    grip.position.set(0, -0.065, 0.04);
    grip.rotation.x = 0.22;
    group.add(grip);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), darkMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.2);
    group.add(barrel);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.02), accentMat);
    sight.position.set(0, 0.075, -0.17);
    group.add(sight);
    return group;
  }

  // Long guns: Assault, Sniper, SMG, Shotgun (7-9 parts)
  const isSniper = weapon.category === 'sniper';
  const isSmg = weapon.category === 'smg';
  const isShotgun = weapon.category === 'shotgun';

  const bodyLen = isSniper ? 0.56 : isSmg ? 0.34 : 0.44;
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.095, bodyLen), bodyMat);
  receiver.position.set(0, 0.02, -0.05);
  group.add(receiver);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.022, bodyLen * 0.9), darkMetalMat);
  rail.position.set(0, 0.075, -0.06);
  group.add(rail);

  const barrelLen = isSniper ? 0.52 : isShotgun ? 0.42 : isSmg ? 0.18 : 0.32;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(isShotgun ? 0.02 : 0.014, isShotgun ? 0.02 : 0.014, barrelLen, 12),
    darkMetalMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -bodyLen / 2 - barrelLen / 2 - 0.03);
  group.add(barrel);

  // Handguard / pump
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.065, isShotgun ? 0.22 : 0.24),
    isShotgun ? gripMat : bodyMat
  );
  guard.position.set(0, 0.015, -bodyLen / 2 - 0.1);
  group.add(guard);

  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.1, 0.24), gripMat);
  stock.position.set(0, -0.01, bodyLen / 2 + 0.06);
  group.add(stock);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.13, 0.06), gripMat);
  grip.position.set(0, -0.07, 0.07);
  grip.rotation.x = 0.24;
  group.add(grip);

  // Magazine
  if (!isShotgun) {
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, isSniper ? 0.1 : 0.18, isSmg ? 0.09 : 0.065),
      darkMetalMat
    );
    mag.position.set(0, -0.1, -0.07);
    mag.rotation.x = -0.18;
    group.add(mag);
  }

  // Optic / Scope
  if (isSniper) {
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.28, 14), darkMetalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.115, -0.06);
    group.add(scopeTube);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), accentMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.115, -0.2);
    group.add(lens);
  } else {
    const holoFrame = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.042, 0.065), darkMetalMat);
    holoFrame.position.set(0, 0.102, -0.03);
    group.add(holoFrame);
    const holoDot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.01), accentMat);
    holoDot.position.set(0, 0.105, -0.03);
    group.add(holoDot);
  }

  // Muzzle accent ring
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.035, 12), accentMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.035, -bodyLen / 2 - barrelLen - 0.03);
  group.add(muzzle);

  return group;
}

// Composite props (3-6 parts each)
export function buildPalmTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7C5A3C', roughness: 0.9, metalness: 0.05 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.65, metalness: 0.05 });

  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.03, 0.26 - i * 0.03, 1.35, 8), trunkMat);
    seg.position.set(i * 0.14, 0.65 + i * 1.25, 0);
    seg.rotation.z = -0.08 * i;
    seg.castShadow = true;
    g.add(seg);
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.3), leafMat);
    frond.position.set(0.42 + Math.cos(angle) * 0.95, 5.1, Math.sin(angle) * 0.95);
    frond.rotation.y = -angle + Math.PI / 2;
    frond.rotation.x = 0.35;
    frond.castShadow = true;
    g.add(frond);
  }
  g.scale.setScalar(scale);
  return g;
}

export function buildPineTree(snowy = false, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4A3222', roughness: 0.9, metalness: 0.05 });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: snowy ? '#CBD5E1' : '#166534',
    roughness: 0.72,
    metalness: 0.05,
  });
  const baseFoliageMat = new THREE.MeshStandardMaterial({ color: '#14532D', roughness: 0.75 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 8), trunkMat);
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  g.add(trunk);

  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.75 - i * 0.38, 2.1 - i * 0.2, 8),
      i === 2 && snowy ? foliageMat : snowy ? foliageMat : baseFoliageMat
    );
    cone.position.y = 2.1 + i * 1.3;
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);
  }
  g.scale.setScalar(scale);
  return g;
}

export function buildStreetLamp(lightColor = '#FDE68A'): THREE.Group {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1F2937', metalness: 0.75, roughness: 0.32 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: lightColor,
    emissive: lightColor,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.45, 8), poleMat);
  base.position.y = 0.225;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8), poleMat);
  pole.position.y = 2.8;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.09), poleMat);
  arm.position.set(0.5, 5.35, 0);
  g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.28), bulbMat);
  head.position.set(0.95, 5.25, 0);
  g.add(head);
  return g;
}
