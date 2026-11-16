import * as THREE from 'three';

export interface LoftSlice {
  y: number;
  rx: number;
  rz: number;
  offsetX?: number;
  offsetZ?: number;
  /** Optional front/back asymmetry: > 0 pushes front (+Z) out (e.g. bust, calf back, knee) */
  frontBias?: number;
  /** Optional back (-Z) bulge (e.g. glutes, gastrocnemius calf) */
  backBias?: number;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Generates a smooth, anatomically contoured lofted mesh from elliptical cross-section slices
 * with optional front/back anatomical curvature and sealed end caps.
 */
export function buildLoftedGeometry(
  slices: LoftSlice[],
  radialSegments = 28,
  capEnds = true,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const rows = slices.length;
  const cols = radialSegments + 1;

  for (let r = 0; r < rows; r++) {
    const s = slices[r];
    const v = r / Math.max(1, rows - 1);
    const ox = s.offsetX ?? 0;
    const oz = s.offsetZ ?? 0;
    const fb = s.frontBias ?? 0;
    const bb = s.backBias ?? 0;

    for (let c = 0; c < cols; c++) {
      const u = c / radialSegments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Front is +Z (sinT > 0), Back is -Z (sinT < 0)
      let zScale = s.rz;
      if (sinT > 0 && fb !== 0) {
        zScale += fb * Math.pow(sinT, 1.4);
      } else if (sinT < 0 && bb !== 0) {
        zScale += bb * Math.pow(-sinT, 1.4);
      }

      const x = ox + cosT * s.rx;
      const z = oz + sinT * zScale;

      positions.push(x, s.y, z);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < radialSegments; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  if (capEnds && rows >= 2) {
    // Bottom cap
    const bot = slices[0];
    const botCenterIdx = positions.length / 3;
    positions.push(bot.offsetX ?? 0, bot.y, bot.offsetZ ?? 0);
    uvs.push(0.5, 0);
    for (let c = 0; c < radialSegments; c++) {
      indices.push(botCenterIdx, c + 1, c);
    }

    // Top cap
    const top = slices[rows - 1];
    const topStart = (rows - 1) * cols;
    const topCenterIdx = positions.length / 3;
    positions.push(top.offsetX ?? 0, top.y, top.offsetZ ?? 0);
    uvs.push(0.5, 1);
    for (let c = 0; c < radialSegments; c++) {
      indices.push(topCenterIdx, topStart + c, topStart + c + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a tapered, almond-profile 3D hair lock ribbon swept along a CatmullRomCurve3.
 * UV.x runs across the strand width, UV.y runs root (0) -> tip (1), enabling silky
 * anisotropic strand lines and ombre gradients without circumferential striping.
 */
export function createTaperedHairLockGeometry(
  points: THREE.Vector3[],
  baseWidth: number,
  baseThickness: number,
  tubularSegments = 24,
  radialSegments = 10,
  rootTaper = 0.55,
  tipTaper = 0.08,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const cols = radialSegments + 1;
  const worldUp = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const sideVec = new THREE.Vector3();
  const normVec = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const v = i / tubularSegments;
    const center = curve.getPointAt(v);
    tangent.copy(frames.tangents[i]).normalize();

    // Stabilized ribbon frame so locks lie naturally flat against the head/shoulders
    sideVec.crossVectors(tangent, worldUp);
    if (sideVec.lengthSq() < 0.001) {
      sideVec.copy(frames.normals[i]);
    } else {
      sideVec.normalize();
    }
    normVec.crossVectors(sideVec, tangent).normalize();

    // Smooth taper from root -> lush mid-shaft -> fine feathered tip
    const rootEase = smoothstep(0, 0.16, v);
    const tipEase = 1 - smoothstep(0.55, 1.0, v);
    const scale =
      (rootTaper + (1 - rootTaper) * rootEase) *
      (tipTaper + (1 - tipTaper) * tipEase);

    const w = baseWidth * scale;
    const th = baseThickness * scale;

    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const theta = u * Math.PI * 2;
      // Almond cross-section: flat/curved ribbon rather than circular pipe
      const cx = Math.cos(theta) * w;
      const cz = Math.sin(theta) * th + (Math.cos(theta) * Math.cos(theta) - 0.5) * th * 0.28;

      const px = center.x + sideVec.x * cx + normVec.x * cz;
      const py = center.y + sideVec.y * cx + normVec.y * cz;
      const pz = center.z + sideVec.z * cx + normVec.z * cz;

      positions.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const d = (i + 1) * cols + j;
      const e = d + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
