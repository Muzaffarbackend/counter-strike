import * as THREE from 'three';
import { SkinId } from '../types/game';

const textureCache = new Map<string, THREE.CanvasTexture>();

export type SurfacePattern =
  | 'sand'
  | 'adobe'
  | 'concrete'
  | 'asphalt'
  | 'wet_asphalt'
  | 'snow'
  | 'cobble'
  | 'crate'
  | 'container'
  | 'metal_floor'
  | 'wood'
  | 'grass'
  | 'brick'
  | 'tech_wall'
  | 'skyscraper'
  | 'water';

export function getProceduralTexture(
  pattern: SurfacePattern,
  baseHex: string,
  accentHex: string,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const key = `${pattern}_${baseHex}_${accentHex}_${repeatX}_${repeatY}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Add rich micro-grain
  const addNoise = (alpha: number, step = 4) => {
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const v = Math.random() > 0.5 ? 255 : 0;
        ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
        ctx.fillRect(x, y, step, step);
      }
    }
  };

  if (pattern === 'sand' || pattern === 'snow') {
    addNoise(0.08, 4);
    ctx.strokeStyle = accentHex;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 3;
    for (let y = 16; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y - 8, size * 0.7, y + 8, size, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'adobe' || pattern === 'concrete') {
    addNoise(0.1, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(0, size - 18, size, 18);
    ctx.globalAlpha = 1;
  } else if (pattern === 'brick') {
    addNoise(0.07, 4);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    const h = 32;
    for (let row = 0; row < size / h; row++) {
      const y = row * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      const offset = (row % 2) * 32;
      for (let x = offset; x < size; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();
      }
    }
  } else if (pattern === 'cobble') {
    addNoise(0.08, 4);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 32) {
      for (let x = 0; x < size; x += 32) {
        const ox = ((y / 32) % 2) * 14;
        ctx.strokeRect((x + ox) % size, y + 2, 26, 26);
      }
    }
  } else if (pattern === 'asphalt' || pattern === 'wet_asphalt') {
    addNoise(0.14, 3);
    if (pattern === 'wet_asphalt') {
      ctx.fillStyle = accentHex;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(28, 30, 88, 40);
      ctx.fillRect(140, 145, 92, 54);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#EAB308';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(size / 2 - 4, 16, 8, 84);
    ctx.fillRect(size / 2 - 4, 140, 8, 84);
    ctx.globalAlpha = 1;
  } else if (pattern === 'crate') {
    addNoise(0.08, 4);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, size - 20, size - 20);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(size - 14, size - 14);
    ctx.moveTo(size - 14, 14);
    ctx.lineTo(14, size - 14);
    ctx.stroke();
  } else if (pattern === 'container') {
    for (let x = 0; x < size; x += 24) {
      ctx.fillStyle = x % 48 === 0 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, 0, 12, size);
    }
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, size - 12, size - 12);
  } else if (pattern === 'metal_floor' || pattern === 'tech_wall') {
    addNoise(0.05, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, size - 8, size - 8);
    ctx.strokeRect(64, 64, size - 128, size - 128);
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = pattern === 'tech_wall' ? 0.75 : 0.35;
    ctx.fillRect(20, 14, size - 40, 6);
    ctx.fillRect(20, size - 20, size - 40, 6);
    ctx.globalAlpha = 1;
  } else if (pattern === 'wood') {
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, y, size, 30);
      ctx.fillStyle = accentHex;
      ctx.fillRect(0, y + 30, size, 2);
    }
  } else if (pattern === 'grass') {
    addNoise(0.11, 3);
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.28;
    for (let i = 0; i < 90; i++) {
      const gx = (i * 53) % size;
      const gy = (i * 89) % size;
      ctx.fillRect(gx, gy, 3, 8);
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'skyscraper') {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);
    for (let y = 16; y < size - 16; y += 36) {
      for (let x = 16; x < size - 16; x += 36) {
        const lit = ((x + y) % 72 === 0) || ((x * y) % 5 === 0);
        ctx.fillStyle = lit ? accentHex : '#1E293B';
        ctx.fillRect(x, y, 22, 24);
      }
    }
  } else if (pattern === 'water') {
    addNoise(0.06, 4);
    ctx.strokeStyle = accentHex;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    for (let y = 12; y < size; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(size * 0.5, y + 10, size, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;

  textureCache.set(key, tex);
  return tex;
}

export function getSkinTexture(skinId: SkinId, primary: string, secondary: string, accent: string): THREE.CanvasTexture {
  const key = `skin_${skinId}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, size, size);

  if (skinId === 'carbon') {
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        ctx.fillStyle = (x + y) % 32 === 0 ? secondary : '#2B313B';
        ctx.fillRect(x, y, 14, 14);
      }
    }
  } else if (skinId === 'digital') {
    const colors = [primary, secondary, accent, '#1E271A'];
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        ctx.fillStyle = colors[((x * 7 + y * 13) / 16) % colors.length | 0];
        ctx.fillRect(x, y, 16, 16);
      }
    }
  } else if (skinId === 'neon') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    for (let i = 0; i < size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(i, 0);
      ctx.stroke();
    }
    ctx.fillStyle = secondary;
    ctx.fillRect(48, 48, size - 96, size - 96);
    ctx.strokeRect(48, 48, size - 96, size - 96);
  } else if (skinId === 'gold') {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#B8860B');
    grad.addColorStop(0.5, '#FDE047');
    grad.addColorStop(1, '#92400E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  } else if (skinId === 'desert' || skinId === 'arctic') {
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 47) % size, (i * 67) % size, 38, 18, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = secondary;
    ctx.fillRect(0, size * 0.6, size, size * 0.4);
    ctx.fillStyle = accent;
    ctx.fillRect(0, size * 0.56, size, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function createNeonSignTexture(text: string, color: string): THREE.CanvasTexture {
  const key = `sign_${text}_${color}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#070B14';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.font = 'bold 48px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}
