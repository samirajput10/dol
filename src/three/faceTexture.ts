import * as THREE from 'three';
import type { FacialIdentityParams, MakeupConfig } from '../types/studio';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (Number.isNaN(num)) return { r: 235, g: 195, b: 175 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbaStr(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates an anatomical UV-mapped feature-film facial skin + subsurface warmth + makeup CanvasTexture.
 * UV convention on our sculpted head SphereGeometry (rotated -PI/2):
 *   u = 0.50 is dead center of face
 *   v = 0.00 is crown, v = 1.00 is chin base
 *   Eyes sit around y = 0.485 * H, x = 0.50 +- 0.086 * W
 *   Brows sit around y = 0.398 * H
 *   Lips sit around y = 0.678 * H
 */
export function buildFaceCanvasTexture(
  identity: FacialIdentityParams,
  makeup: MakeupConfig,
  existingCanvas?: HTMLCanvasElement,
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const size = 512;
  const canvas = existingCanvas ?? document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Base Skin Tone + Warm Animated-Film Subsurface Undertone
  const skinRgb = hexToRgb(identity.skinToneHex);
  const undertoneShift =
    identity.skinUndertone === 'warm'
      ? { r: 6, g: 0, b: -8 }
      : identity.skinUndertone === 'cool'
        ? { r: 2, g: -4, b: 5 }
        : { r: 0, g: -2, b: -3 };

  const baseR = Math.min(255, Math.max(0, skinRgb.r + undertoneShift.r));
  const baseG = Math.min(255, Math.max(0, skinRgb.g + undertoneShift.g));
  const baseB = Math.min(255, Math.max(0, skinRgb.b + undertoneShift.b));

  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, size, size);

  // Subtle vertical skin warmth gradient (slightly warmer lower face, softer forehead highlight)
  const faceGrad = ctx.createRadialGradient(size * 0.5, size * 0.48, size * 0.04, size * 0.5, size * 0.52, size * 0.36);
  faceGrad.addColorStop(0, `rgba(${Math.min(255, baseR + 12)}, ${Math.min(255, baseG + 7)}, ${Math.min(255, baseB + 4)}, ${0.25 + makeup.foundationCoverage * 0.25})`);
  faceGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
  faceGrad.addColorStop(1, `rgba(${Math.max(0, baseR - 22)}, ${Math.max(0, baseG - 28)}, ${Math.max(0, baseB - 28)}, 0.18)`);
  ctx.fillStyle = faceGrad;
  ctx.fillRect(0, 0, size, size);

  // Subsurface peach-coral warmth on apple cheeks, nose tip, and chin (key Pixar appeal)
  const subPeach = `rgba(${Math.min(255, baseR + 18)}, ${Math.max(0, baseG - 34)}, ${Math.max(0, baseB - 38)},`;
  for (const side of [-1, 1]) {
    const cx = size * (0.5 + side * 0.128);
    const cy = size * 0.568;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.095);
    g.addColorStop(0, `${subPeach} 0.44)`);
    g.addColorStop(1, `${subPeach} 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.095, 0, Math.PI * 2);
    ctx.fill();
  }
  // Nose tip subsurface peach glow
  const noseGlow = ctx.createRadialGradient(size * 0.5, size * 0.578, 2, size * 0.5, size * 0.578, size * 0.052);
  noseGlow.addColorStop(0, `${subPeach} 0.48)`);
  noseGlow.addColorStop(1, `${subPeach} 0)`);
  ctx.fillStyle = noseGlow;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.578, size * 0.052, 0, Math.PI * 2);
  ctx.fill();

  // Soft orbital eye socket shadow for depth behind large eyes
  const eyeOffsetX = 0.086 + identity.eyeSpacing * 0.011;
  const eyeY = size * 0.485;
  const eyeTilt = identity.eyeTilt * 0.14;

  for (const side of [-1, 1]) {
    const ex = size * (0.5 + side * eyeOffsetX);
    const orb = ctx.createRadialGradient(ex, eyeY, size * 0.015, ex, eyeY, size * 0.068);
    orb.addColorStop(0, `rgba(${Math.max(0, baseR - 46)}, ${Math.max(0, baseG - 54)}, ${Math.max(0, baseB - 54)}, 0.34)`);
    orb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, size * 0.068, size * 0.052, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Contour & Bronzer
  const contourAmt = Math.max(makeup.contourIntensity, makeup.bronzerIntensity * 0.8);
  if (contourAmt > 0.02) {
    const contourColor = `rgba(${Math.max(0, baseR - 58)}, ${Math.max(0, baseG - 58)}, ${Math.max(0, baseB - 54)}, ${contourAmt * 0.34})`;
    for (const side of [-1, 1]) {
      const cx = size * (0.5 + side * 0.155);
      const cy = size * 0.615;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.09);
      g.addColorStop(0, contourColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.09, size * 0.052, side * -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Blush
  if (makeup.blushIntensity > 0.02) {
    for (const side of [-1, 1]) {
      const cx = size * (0.5 + side * 0.125);
      const cy = size * 0.568;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.082);
      g.addColorStop(0, rgbaStr(makeup.blushColor, makeup.blushIntensity * 0.45));
      g.addColorStop(1, rgbaStr(makeup.blushColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.082, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Highlighter glow (cheekbones + nose bridge)
  if (makeup.highlighterIntensity > 0.05) {
    const hiAlpha = makeup.highlighterIntensity * 0.28;
    for (const side of [-1, 1]) {
      const cx = size * (0.5 + side * 0.115);
      const cy = size * 0.535;
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 0.048);
      g.addColorStop(0, `rgba(255, 246, 238, ${hiAlpha})`);
      g.addColorStop(1, 'rgba(255, 246, 238, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.048, 0, Math.PI * 2);
      ctx.fill();
    }
    const noseHi = ctx.createLinearGradient(size * 0.5, size * 0.47, size * 0.5, size * 0.58);
    noseHi.addColorStop(0, `rgba(255, 246, 238, ${hiAlpha * 0.65})`);
    noseHi.addColorStop(1, 'rgba(255, 246, 238, 0)');
    ctx.fillStyle = noseHi;
    ctx.fillRect(size * 0.493, size * 0.47, size * 0.014, size * 0.105);
  }

  // 5. Freckles
  const freckleLevel = Math.max(identity.frecklesIntensity, makeup.frecklesIntensity);
  if (freckleLevel > 0.05) {
    ctx.fillStyle = `rgba(${Math.max(0, baseR - 68)}, ${Math.max(0, baseG - 78)}, ${Math.max(0, baseB - 80)}, ${freckleLevel * 0.55})`;
    for (let i = 0; i < 42; i++) {
      const sx = Math.sin(i * 12.9898) * 43758.5453;
      const sy = Math.sin(i * 78.233) * 19341.123;
      const rx = sx - Math.floor(sx);
      const ry = sy - Math.floor(sy);
      const px = size * (0.37 + rx * 0.26);
      const py = size * (0.535 + ry * 0.075);
      const r = 0.8 + (i % 3) * 0.45;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Soft nose bridge & philtrum shading
  const noseShadow = ctx.createLinearGradient(size * 0.468, size * 0.48, size * 0.532, size * 0.48);
  noseShadow.addColorStop(0, `rgba(${Math.max(0, baseR - 38)}, ${Math.max(0, baseG - 44)}, ${Math.max(0, baseB - 44)}, 0.18)`);
  noseShadow.addColorStop(0.5, 'rgba(0,0,0,0)');
  noseShadow.addColorStop(1, `rgba(${Math.max(0, baseR - 38)}, ${Math.max(0, baseG - 44)}, ${Math.max(0, baseB - 44)}, 0.18)`);
  ctx.fillStyle = noseShadow;
  ctx.fillRect(size * 0.468, size * 0.485, size * 0.064, size * 0.115);

  // Nostril soft dots under nose tip
  ctx.fillStyle = `rgba(${Math.max(0, baseR - 65)}, ${Math.max(0, baseG - 75)}, ${Math.max(0, baseB - 72)}, 0.35)`;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(size * (0.5 + side * 0.015), size * 0.594, 3.2, 2.0, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Eyeshadow & Eyeliner (subtle baked crease accent complementing 3D lashes)
  if (makeup.eyeshadowIntensity > 0.02) {
    for (const side of [-1, 1]) {
      const ex = size * (0.5 + side * eyeOffsetX);
      const ey = eyeY - size * 0.022;
      const g = ctx.createRadialGradient(ex, ey, 3, ex, ey, size * 0.055);
      g.addColorStop(0, rgbaStr(makeup.eyeshadowColor, makeup.eyeshadowIntensity * 0.65));
      g.addColorStop(1, rgbaStr(makeup.eyeshadowColor, 0));
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(side * -eyeTilt);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.052, size * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();

      if (makeup.glitterEyeshadow) {
        ctx.fillStyle = `rgba(255, 250, 245, ${makeup.eyeshadowIntensity * 0.85})`;
        for (let s = 0; s < 14; s++) {
          const ang = (s / 14) * Math.PI * 2;
          const dist = ((s * 7) % 10) * 1.4;
          ctx.fillRect(Math.cos(ang) * dist, Math.sin(ang) * dist * 0.55, 1.8, 1.8);
        }
      }
      ctx.restore();
    }
  }

  if (makeup.eyelinerStyle !== 'none') {
    ctx.strokeStyle = rgbaStr(makeup.eyelinerColor, 0.78);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ex = size * (0.5 + side * eyeOffsetX);
      ctx.save();
      ctx.translate(ex, eyeY - size * 0.012);
      ctx.rotate(side * -eyeTilt);
      ctx.lineWidth = makeup.eyelinerStyle === 'smoky' ? 4.4 : 2.6;
      ctx.beginPath();
      ctx.moveTo(-size * 0.036 * side, size * 0.012);
      ctx.quadraticCurveTo(0, -size * 0.022, size * 0.038 * side, size * 0.008);
      if (makeup.eyelinerStyle === 'winged') {
        ctx.lineTo(size * 0.056 * side, -size * 0.012);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Soft brow bone shadow under 3D eyebrows
  ctx.strokeStyle = `rgba(${Math.max(0, baseR - 42)}, ${Math.max(0, baseG - 48)}, ${Math.max(0, baseB - 48)}, 0.25)`;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const bx = size * (0.5 + side * eyeOffsetX);
    const by = size * 0.408;
    ctx.beginPath();
    ctx.moveTo(bx - side * size * 0.038, by + size * 0.005);
    ctx.quadraticCurveTo(bx + side * size * 0.004, by - size * 0.012, bx + side * size * 0.044, by + size * 0.006);
    ctx.stroke();
  }

  // 7. Lips & Lip Makeup
  const mouthW = size * (0.045 + identity.mouthWidth * 0.007);
  const mouthY = size * 0.678;
  const upperH = size * (0.012 + (identity.lipFullnessUpper + 1) * 0.0045);
  const lowerH = size * (0.015 + (identity.lipFullnessLower + 1) * 0.0055);

  // Soft under-lip chin crease shadow
  const chinShad = ctx.createRadialGradient(size * 0.5, mouthY + lowerH * 1.9, 2, size * 0.5, mouthY + lowerH * 1.9, size * 0.04);
  chinShad.addColorStop(0, `rgba(${Math.max(0, baseR - 48)}, ${Math.max(0, baseG - 56)}, ${Math.max(0, baseB - 54)}, 0.28)`);
  chinShad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = chinShad;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, mouthY + lowerH * 1.9, size * 0.042, size * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();

  const lipAlpha = 0.34 + makeup.lipIntensity * 0.58;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(size * 0.5 - mouthW, mouthY);
  ctx.quadraticCurveTo(size * 0.5 - mouthW * 0.45, mouthY - upperH * 1.1, size * 0.5 - mouthW * 0.16, mouthY - upperH * 0.72);
  ctx.lineTo(size * 0.5, mouthY - upperH * 0.48);
  ctx.lineTo(size * 0.5 + mouthW * 0.16, mouthY - upperH * 0.72);
  ctx.quadraticCurveTo(size * 0.5 + mouthW * 0.45, mouthY - upperH * 1.1, size * 0.5 + mouthW, mouthY);
  ctx.quadraticCurveTo(size * 0.5 + mouthW * 0.45, mouthY + lowerH * 1.25, size * 0.5, mouthY + lowerH * 1.2);
  ctx.quadraticCurveTo(size * 0.5 - mouthW * 0.45, mouthY + lowerH * 1.25, size * 0.5 - mouthW, mouthY);
  ctx.closePath();

  if (makeup.lipFinish === 'ombre') {
    const lipGrad = ctx.createRadialGradient(size * 0.5, mouthY, 2, size * 0.5, mouthY, mouthW);
    lipGrad.addColorStop(0, rgbaStr(makeup.lipSecondaryColor, lipAlpha));
    lipGrad.addColorStop(1, rgbaStr(makeup.lipColor, lipAlpha));
    ctx.fillStyle = lipGrad;
  } else {
    ctx.fillStyle = rgbaStr(makeup.lipColor, lipAlpha);
  }
  ctx.fill();

  if (makeup.lipLiner) {
    ctx.strokeStyle = rgbaStr(makeup.lipSecondaryColor || makeup.lipColor, Math.min(1, lipAlpha + 0.12));
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(${Math.max(0, baseR - 95)}, ${Math.max(0, baseG - 108)}, ${Math.max(0, baseB - 108)}, 0.58)`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(size * 0.5 - mouthW * 0.88, mouthY);
  ctx.quadraticCurveTo(size * 0.5, mouthY + 2, size * 0.5 + mouthW * 0.88, mouthY);
  ctx.stroke();

  if (makeup.lipFinish === 'gloss' || makeup.lipFinish === 'satin') {
    const glossAlpha = makeup.lipFinish === 'gloss' ? 0.55 : 0.22;
    ctx.fillStyle = `rgba(255, 255, 255, ${glossAlpha})`;
    ctx.beginPath();
    ctx.ellipse(size * 0.5, mouthY + lowerH * 0.48, mouthW * 0.32, lowerH * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { canvas, texture };
}

export function buildIrisTexture(irisColorHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Soft shaded sclera (warm off-white with subtle top eyelid shadow)
  ctx.fillStyle = '#FAF6F4';
  ctx.fillRect(0, 0, size, size);
  const scleraShade = ctx.createLinearGradient(0, 0, 0, size * 0.45);
  scleraShade.addColorStop(0, 'rgba(180, 155, 160, 0.45)');
  scleraShade.addColorStop(1, 'rgba(180, 155, 160, 0)');
  ctx.fillStyle = scleraShade;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;

  // Rich animated-film multi-layered iris
  const irisRgb = hexToRgb(irisColorHex);
  const grad = ctx.createRadialGradient(cx, cy, r * 0.24, cx, cy, r);
  grad.addColorStop(0, `rgb(${Math.min(255, irisRgb.r + 55)}, ${Math.min(255, irisRgb.g + 55)}, ${Math.min(255, irisRgb.b + 40)})`);
  grad.addColorStop(0.55, `rgb(${irisRgb.r}, ${irisRgb.g}, ${irisRgb.b})`);
  grad.addColorStop(0.86, `rgb(${Math.max(0, irisRgb.r - 38)}, ${Math.max(0, irisRgb.g - 38)}, ${Math.max(0, irisRgb.b - 38)})`);
  grad.addColorStop(1, `rgb(${Math.max(0, irisRgb.r - 75)}, ${Math.max(0, irisRgb.g - 75)}, ${Math.max(0, irisRgb.b - 75)})`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Delicate radial iris fibers
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 20, 18, 0.16)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36);
    ctx.lineTo(cx + Math.cos(a) * r * 0.90, cy + Math.sin(a) * r * 0.90);
    ctx.stroke();
  }

  // Deep pupil
  ctx.fillStyle = '#0E0B10';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.43, 0, Math.PI * 2);
  ctx.fill();

  // Crisp Pixar specular studio catchlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.28, r * 0.21, r * 0.17, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.beginPath();
  ctx.arc(cx + r * 0.25, cy + r * 0.24, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
