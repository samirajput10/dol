import * as THREE from 'three';
import type { HairConfig } from '../types/studio';

/**
 * Generates a silky, high-resolution animated-film hair strand CanvasTexture.
 * Uses ultra-fine micro-streaks along U (horizontal in canvas -> lengthwise along TubeGeometry)
 * so hair reads as glossy sculpted fibers rather than thick zebra stripes.
 */
function buildHairTexture(config: HairConfig): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (config.effect === 'ombre') {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, config.primaryColor);
    grad.addColorStop(0.42, config.primaryColor);
    grad.addColorStop(1, config.secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (config.effect === 'two_tone') {
    ctx.fillStyle = config.primaryColor;
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = config.secondaryColor;
    ctx.fillRect(0, h / 2, w, h / 2);
  } else {
    ctx.fillStyle = config.primaryColor;
    ctx.fillRect(0, 0, w, h);
  }

  // Subtle dark root-to-mid-sheen gradient for sculpted volume
  const depthGrad = ctx.createLinearGradient(0, 0, w, 0);
  depthGrad.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
  depthGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.06)');
  depthGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.04)');
  depthGrad.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
  ctx.fillStyle = depthGrad;
  ctx.fillRect(0, 0, w, h);

  // Ultra-fine silky lengthwise hair strands along U
  for (let y = 0; y < h; y += 2) {
    const isHighlight = config.effect === 'highlights' && y % 18 === 0;
    const seed = Math.sin(y * 19.37) * 0.5 + 0.5;
    ctx.strokeStyle = isHighlight
      ? config.secondaryColor
      : seed > 0.55
        ? 'rgba(255, 235, 215, 0.055)'
        : 'rgba(10, 6, 4, 0.065)';
    ctx.lineWidth = isHighlight ? 1.8 : 0.9;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addTubeStrand(
  group: THREE.Group,
  points: THREE.Vector3[],
  radius: number,
  mat: THREE.Material,
  tubularSegments = 24,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

/**
 * Soft root-to-crown scalp cap texture without horizontal rings across the forehead.
 */
function buildCapTexture(config: HairConfig): THREE.CanvasTexture {
  const w = 128;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = config.primaryColor;
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.04)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.14)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical hairline streaks along V (from crown downward)
  for (let x = 0; x < w; x += 2) {
    ctx.strokeStyle = x % 4 === 0 ? 'rgba(255, 235, 215, 0.04)' : 'rgba(10, 6, 4, 0.05)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds sculpted feature-film 3D hairstyles calibrated for the 0.118 stylized head rig.
 * Never alters underlying facial identity geometry.
 */
export function buildHairGroup(config: HairConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'HairGroup';

  const texture = buildHairTexture(config);
  const capTexture = buildCapTexture(config);
  const hairMat = new THREE.MeshPhysicalMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.03,
    sheen: 0.85,
    sheenRoughness: 0.32,
    sheenColor: new THREE.Color('#FFE8D6'),
  });
  const capMat = new THREE.MeshPhysicalMaterial({
    map: capTexture,
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.02,
    sheen: 0.75,
    sheenRoughness: 0.36,
    sheenColor: new THREE.Color('#FFE8D6'),
  });

  // Fitted anatomical scalp dome wrapping upper cranium & back cleanly behind center forehead
  const capGeo = new THREE.SphereGeometry(0.123, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.50);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(0, 0.026, -0.014);
  cap.scale.set(1.01, 1.12, 1.03);
  cap.rotation.x = -0.12;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  // Sculpted Pixar center-part hairline waves arching cleanly to sides of forehead
  for (const s of [-1, 1]) {
    addTubeStrand(
      group,
      [
        new THREE.Vector3(s * 0.008, 0.126, 0.044),
        new THREE.Vector3(s * 0.056, 0.106, 0.072),
        new THREE.Vector3(s * 0.098, 0.058, 0.054),
        new THREE.Vector3(s * 0.114, -0.028, 0.004),
      ],
      0.022,
      hairMat,
    );
  }

  switch (config.styleId) {
    case 'hair_short_bob': {
      for (let i = -5; i <= 5; i++) {
        const ang = i * 0.28;
        const x = Math.sin(ang) * 0.118;
        const z = -Math.cos(ang) * 0.114 - 0.014;
        addTubeStrand(
          group,
          [
            new THREE.Vector3(x * 0.86, 0.095, z * 0.86),
            new THREE.Vector3(x * 1.08, -0.01, z * 1.05),
            new THREE.Vector3(x * 0.96, -0.145, z * 0.96),
          ],
          0.034,
          hairMat,
        );
      }
      break;
    }

    case 'hair_long_straight': {
      for (let i = -5; i <= 5; i++) {
        const ang = i * 0.28;
        const x = Math.sin(ang) * 0.12;
        const z = -Math.cos(ang) * 0.116 - 0.015;
        addTubeStrand(
          group,
          [
            new THREE.Vector3(x * 0.86, 0.095, z * 0.86),
            new THREE.Vector3(x * 1.06, -0.08, z * 1.08),
            new THREE.Vector3(x * 1.08, -0.38, z * 1.08),
          ],
          0.033,
          hairMat,
        );
      }
      break;
    }

    case 'hair_glam_curls': {
      for (let i = -5; i <= 5; i++) {
        const ang = i * 0.28;
        const x = Math.sin(ang) * 0.122;
        const z = -Math.cos(ang) * 0.118 - 0.015;
        addTubeStrand(
          group,
          [
            new THREE.Vector3(x * 0.86, 0.095, z * 0.86),
            new THREE.Vector3(x * 1.16, -0.04, z * 1.1),
            new THREE.Vector3(x * 1.05, -0.18, z * 1.18),
            new THREE.Vector3(x * 1.2, -0.32, z * 1.08),
          ],
          0.036,
          hairMat,
        );
      }
      break;
    }

    case 'hair_high_ponytail': {
      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.008, 10, 20),
        new THREE.MeshStandardMaterial({ color: config.secondaryColor || '#E9B9CC', roughness: 0.4 }),
      );
      tie.position.set(0, 0.122, -0.10);
      tie.rotation.x = Math.PI / 3;
      group.add(tie);

      for (let s = -1; s <= 1; s++) {
        addTubeStrand(
          group,
          [
            new THREE.Vector3(s * 0.014, 0.124, -0.102),
            new THREE.Vector3(s * 0.042, 0.148, -0.165),
            new THREE.Vector3(s * 0.064, -0.05, -0.188),
            new THREE.Vector3(s * 0.052, -0.27, -0.165),
          ],
          0.033,
          hairMat,
        );
      }
      break;
    }

    case 'hair_twin_braids': {
      for (const s of [-1, 1]) {
        for (let b = 0; b < 7; b++) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.026 - b * 0.0014, 14, 12), hairMat);
          bead.position.set(s * (0.115 + b * 0.004), 0.01 - b * 0.044, -0.025 + b * 0.006);
          bead.scale.set(1.1, 0.9, 1);
          bead.castShadow = true;
          group.add(bead);
        }
      }
      break;
    }

    case 'hair_french_braid': {
      for (let b = 0; b < 9; b++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.033 - b * 0.0016, 14, 12), hairMat);
        bead.position.set(0, 0.075 - b * 0.044, -0.122 - Math.sin(b * 0.3) * 0.015);
        bead.scale.set(1.25, 0.95, 0.9);
        bead.castShadow = true;
        group.add(bead);
      }
      break;
    }

    case 'hair_messy_bun': {
      // Sculpted Pixar top-knot bun with clean center part, swept side volumes, and face-framing wisps
      const bunY = 0.158;
      const bunZ = -0.028;

      const bunCore = new THREE.Mesh(new THREE.SphereGeometry(0.068, 22, 18), hairMat);
      bunCore.position.set(0, bunY, bunZ);
      bunCore.scale.set(1.16, 0.78, 1.02);
      bunCore.castShadow = true;
      group.add(bunCore);

      const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.022, 12, 24), hairMat);
      coil1.position.set(0, bunY - 0.008, bunZ);
      coil1.rotation.x = Math.PI / 2.1;
      coil1.castShadow = true;
      group.add(coil1);

      const coil2 = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.018, 12, 20), hairMat);
      coil2.position.set(0.005, bunY + 0.018, bunZ - 0.004);
      coil2.rotation.x = Math.PI / 2.2;
      coil2.rotation.y = 0.25;
      group.add(coil2);

      // Swept back side waves covering back of crown smoothly
      for (let i = -3; i <= 3; i++) {
        const ang = i * 0.36;
        const x = Math.sin(ang) * 0.115;
        const z = -Math.cos(ang) * 0.112 - 0.012;
        addTubeStrand(
          group,
          [
            new THREE.Vector3(x * 0.95, 0.02, z * 0.95),
            new THREE.Vector3(x * 0.75, 0.09, z * 0.78),
            new THREE.Vector3(x * 0.25, bunY - 0.01, bunZ),
          ],
          0.026,
          hairMat,
          14,
        );
      }

      // Delicate face-framing loose wisps curving softly inward past cheekbones
      for (const s of [-1, 1]) {
        addTubeStrand(
          group,
          [
            new THREE.Vector3(s * 0.090, 0.045, 0.064),
            new THREE.Vector3(s * 0.097, -0.022, 0.062),
            new THREE.Vector3(s * 0.088, -0.084, 0.050),
          ],
          0.0038,
          hairMat,
          16,
        );
        addTubeStrand(
          group,
          [
            new THREE.Vector3(s * 0.094, 0.038, 0.056),
            new THREE.Vector3(s * 0.102, -0.014, 0.052),
            new THREE.Vector3(s * 0.094, -0.052, 0.044),
          ],
          0.0028,
          hairMat,
          12,
        );
      }
      break;
    }

    case 'hair_updo_chignon': {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.066, 20, 18), hairMat);
      bun.position.set(0, 0.04, -0.132);
      bun.scale.set(1.08, 0.92, 0.95);
      bun.castShadow = true;
      group.add(bun);
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 10, 20), hairMat);
      wrap.position.set(0, 0.04, -0.132);
      wrap.rotation.x = Math.PI / 2.2;
      group.add(wrap);
      break;
    }

    case 'hair_pixie_cut': {
      for (let i = -2; i <= 2; i++) {
        addTubeStrand(
          group,
          [
            new THREE.Vector3(i * 0.024, 0.118, 0.05),
            new THREE.Vector3(i * 0.028 + 0.01, 0.086, 0.095),
          ],
          0.016,
          hairMat,
          10,
        );
      }
      break;
    }

    case 'hair_curtain_bangs': {
      for (const s of [-1, 1]) {
        addTubeStrand(
          group,
          [
            new THREE.Vector3(s * 0.012, 0.122, 0.058),
            new THREE.Vector3(s * 0.066, 0.082, 0.098),
            new THREE.Vector3(s * 0.098, 0.01, 0.068),
          ],
          0.022,
          hairMat,
        );
      }
      for (let i = -4; i <= 4; i++) {
        const ang = i * 0.3;
        const x = Math.sin(ang) * 0.12;
        const z = -Math.cos(ang) * 0.116 - 0.015;
        addTubeStrand(
          group,
          [
            new THREE.Vector3(x * 0.86, 0.095, z * 0.86),
            new THREE.Vector3(x * 1.06, -0.1, z * 1.06),
            new THREE.Vector3(x * 1.08, -0.34, z * 1.05),
          ],
          0.032,
          hairMat,
        );
      }
      break;
    }

    case 'hair_long_wavy':
    default: {
      for (let i = -5; i <= 5; i++) {
        const ang = i * 0.28;
        const x = Math.sin(ang) * 0.12;
        const z = -Math.cos(ang) * 0.116 - 0.015;
        addTubeStrand(
          group,
          [
            new THREE.Vector3(x * 0.86, 0.095, z * 0.86),
            new THREE.Vector3(x * 1.08, -0.06, z * 1.06),
            new THREE.Vector3(x * 1.03, -0.22, z * 1.14),
            new THREE.Vector3(x * 1.12, -0.36, z * 1.06),
          ],
          0.033,
          hairMat,
        );
      }
      break;
    }
  }

  return group;
}
