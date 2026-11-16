import * as THREE from 'three';
import type { SingleNailStyle } from '../types/studio';

export function buildNailTexture(style: SingleNailStyle): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = style.color;
  ctx.fillRect(0, 0, size, size);

  switch (style.design) {
    case 'french': {
      ctx.fillStyle = style.secondaryColor || '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(size / 2, size * 0.12, size * 0.56, size * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ombre': {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, style.secondaryColor || '#FFFFFF');
      grad.addColorStop(1, style.color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'glitter': {
      for (let i = 0; i < 48; i++) {
        const x = ((i * 37) % 118) + 5;
        const y = ((i * 53) % 118) + 5;
        ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : style.secondaryColor || '#FFE5B4';
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'marble': {
      ctx.strokeStyle = style.secondaryColor || 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2.5;
      for (let v = 0; v < 5; v++) {
        ctx.beginPath();
        ctx.moveTo(0, v * 28);
        ctx.bezierCurveTo(size * 0.35, v * 20 + 18, size * 0.65, v * 30 - 12, size, v * 24 + 10);
        ctx.stroke();
      }
      break;
    }
    case 'floral': {
      ctx.fillStyle = style.secondaryColor || '#FFFFFF';
      const cx = size * 0.5;
      const cy = size * 0.55;
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 18, cy + Math.sin(ang) * 18, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F7D26A';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'hearts': {
      ctx.fillStyle = style.secondaryColor || '#FF3D7F';
      const cx = size * 0.5;
      const cy = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 16);
      ctx.bezierCurveTo(cx - 26, cy - 4, cx - 16, cy - 26, cx, cy - 10);
      ctx.bezierCurveTo(cx + 16, cy - 26, cx + 26, cy - 4, cx, cy + 16);
      ctx.fill();
      break;
    }
    case 'butterfly': {
      ctx.fillStyle = style.secondaryColor || '#E0B8FF';
      const cx = size * 0.5;
      const cy = size * 0.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * 16, cy - 8, 14, 10, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + s * 12, cy + 10, 10, 8, s * -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#231924';
      ctx.fillRect(cx - 2, cy - 14, 4, 28);
      break;
    }
    case 'rhinestones': {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.72, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = style.secondaryColor || '#E8F3FF';
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.72, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chrome': {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.5, style.color);
      grad.addColorStop(1, '#231924');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    default:
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
