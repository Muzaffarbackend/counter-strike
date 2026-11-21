import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getCharacterById } from '../data/characters';
import { getWeaponById } from '../data/weapons';
import {
  animateCharacterRig,
  buildCharacterModel,
  buildWeaponModel,
  RiggedCharacter,
} from '../engine/ModelFactory';
import { SkinId } from '../types/game';

interface ShowcaseViewportProps {
  mode: 'character' | 'weapon' | 'menu_bg';
  characterId?: string;
  weaponId?: string;
  skinId?: SkinId;
  interactiveRotate?: boolean;
}

export function ShowcaseViewport({
  mode,
  characterId = 'b_jasur',
  weaponId = 'tf_vx47',
  skinId = 'classic',
  interactiveRotate = true,
}: ShowcaseViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef({ mode, characterId, weaponId, skinId });
  const dragRotRef = useRef({ active: false, lastX: 0, yawOffset: 0 });

  targetRef.current = { mode, characterId, weaponId, skinId };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
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
    })();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    if (mode === 'weapon') {
      camera.position.set(0, 0.15, 1.05);
    } else if (mode === 'menu_bg') {
      camera.position.set(-0.65, 1.35, 3.65);
    } else {
      camera.position.set(0, 1.3, 3.4);
    }

    // 3-Point Studio Lighting
    const hemi = new THREE.HemisphereLight('#94A3B8', '#0F172A', 0.65);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight('#FFF7ED', 1.65);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight('#F97316', 1.1);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    // Tactical Pedestal Floor (for character & menu_bg)
    const stageGroup = new THREE.Group();
    if (mode !== 'weapon') {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.25, 0.1, 32),
        new THREE.MeshStandardMaterial({ color: '#141820', metalness: 0.7, roughness: 0.3 })
      );
      disc.position.y = -0.05;
      disc.receiveShadow = true;
      stageGroup.add(disc);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.16, 0.02, 8, 48),
        new THREE.MeshStandardMaterial({
          color: '#F97316',
          emissive: '#F97316',
          emissiveIntensity: 0.9,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.01;
      stageGroup.add(ring);
    }
    scene.add(stageGroup);

    const subjectHolder = new THREE.Group();
    if (mode === 'menu_bg') {
      subjectHolder.position.set(0.65, 0, 0);
      stageGroup.position.set(0.65, 0, 0);
    }
    scene.add(subjectHolder);

    let currentKey = '';
    let activeRig: RiggedCharacter | null = null;
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const rebuildSubject = () => {
      const t = targetRef.current;
      const key = `${t.mode}_${t.characterId}_${t.weaponId}_${t.skinId}`;
      if (key === currentKey) return;
      currentKey = key;

      while (subjectHolder.children.length > 0) {
        subjectHolder.remove(subjectHolder.children[0]);
      }
      activeRig = null;

      if (t.mode === 'weapon') {
        const spec = getWeaponById(t.weaponId || 'tf_vx47');
        const wGroup = buildWeaponModel(spec, t.skinId || 'classic');
        wGroup.rotation.y = Math.PI / 2;
        if (spec.category === 'shield') {
          wGroup.scale.setScalar(0.55);
          wGroup.rotation.y = 0.35;
        } else if (spec.category === 'pistol' || spec.category === 'melee') {
          wGroup.scale.setScalar(1.55);
        } else {
          wGroup.scale.setScalar(1.05);
        }
        subjectHolder.add(wGroup);
      } else {
        const charSpec = getCharacterById(t.characterId || 'b_jasur');
        const rig = buildCharacterModel(charSpec, !isSoftwareGl);
        const wSpec = getWeaponById(t.weaponId || 'tf_vx47');
        const wModel = buildWeaponModel(wSpec, t.skinId || 'classic');
        wModel.scale.setScalar(1.2);
        wModel.rotation.x = Math.PI / 2;
        rig.weaponMount.add(wModel);
        subjectHolder.add(rig.group);
        activeRig = rig;
      }
    };

    const onResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!interactiveRotate) return;
      dragRotRef.current.active = true;
      dragRotRef.current.lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRotRef.current.active) return;
      const dx = e.clientX - dragRotRef.current.lastX;
      dragRotRef.current.lastX = e.clientX;
      dragRotRef.current.yawOffset += dx * 0.01;
    };
    const onPointerUp = () => {
      dragRotRef.current.active = false;
    };

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      rebuildSubject();

      const elapsed = clock.getElapsedTime();
      if (activeRig) {
        animateCharacterRig(activeRig, 'idle', elapsed, 0, true);
      }

      if (!dragRotRef.current.active) {
        const autoSpeed = mode === 'menu_bg' ? 0.28 : 0.45;
        subjectHolder.rotation.y = Math.sin(elapsed * autoSpeed) * (mode === 'menu_bg' ? 0.45 : Math.PI) + dragRotRef.current.yawOffset;
      } else {
        subjectHolder.rotation.y = dragRotRef.current.yawOffset;
      }

      if (mode === 'weapon') {
        subjectHolder.position.y = Math.sin(elapsed * 1.6) * 0.025;
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    rebuildSubject();
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode, interactiveRotate]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative ${interactiveRotate ? 'cursor-grab active:cursor-grabbing' : ''}`}
    />
  );
}
