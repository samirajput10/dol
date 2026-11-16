import * as THREE from 'three';
import { FINGER_KEYS } from '../data/catalog';
import type {
  AnimationId,
  BodyConfig,
  FacialIdentityParams,
  LookCustomization,
  NailConfig,
  NailFingerKey,
} from '../types/studio';
import { computeExpressionWeights, computeIdentityMorphWeights } from '../utils/studioLogic';
import { buildFaceCanvasTexture, buildIrisTexture } from './faceTexture';
import { buildHairGroup } from './hairBuilder';
import { buildNailTexture } from './nailTexture';
import { attachWardrobeToRig, type BoneAttachmentSlots } from './wardrobeBuilder';

export interface DollRigController {
  root: THREE.Group;
  skeletonSlots: BoneAttachmentSlots;
  headMesh: THREE.Mesh;
  bodyMeshes: THREE.Mesh[];
  updateAppearance: (identity: FacialIdentityParams, body: BodyConfig, look: LookCustomization) => void;
  updateAnimation: (
    time: number,
    delta: number,
    look: LookCustomization,
  ) => void;
  dispose: () => void;
}

function gaussianFalloff(dx: number, dy: number, sx: number, sy: number): number {
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy)));
}

/**
 * Builds a high-resolution feature-film stylized head geometry with smooth Gaussian anatomical sculpting
 * and named morphAttributes.position for BOTH facial identity preservation AND real-time facial expressions.
 */
function buildMorphableHeadGeometry(): {
  geometry: THREE.BufferGeometry;
  morphDictionary: Record<string, number>;
} {
  const geo = new THREE.SphereGeometry(0.118, 56, 44);
  // Rotate UV seam to the back of the head so u=0.5 is dead center face
  geo.rotateY(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Classic stylized Pixar proportions: slightly rounded cranium, delicate tapered lower jaw
    y *= 1.12;
    x *= 0.99;

    if (y < 0.01) {
      const t = Math.min(1, (0.01 - y) / 0.13);
      x *= 1 - t * 0.28;
      z *= 1 - t * 0.15;
      if (z > 0) z += (1 - t * 0.65) * 0.008;
    }

    if (z > 0.03) {
      // Soft apple cheek fullness
      const cheekL = gaussianFalloff(x - 0.056, y + 0.022, 0.032, 0.026);
      const cheekR = gaussianFalloff(x + 0.056, y + 0.022, 0.032, 0.026);
      z += (cheekL + cheekR) * 0.012;

      // Expressive orbital recesses for large Pixar eyes
      const eyeL = gaussianFalloff(x - 0.044, y - 0.012, 0.029, 0.025);
      const eyeR = gaussianFalloff(x + 0.044, y - 0.012, 0.029, 0.025);
      z -= (eyeL + eyeR) * 0.024;

      // Smooth sculpted nasal bridge & cute rounded nasal tip
      const bridge = gaussianFalloff(x, y + 0.002, 0.011, 0.026);
      const tip = gaussianFalloff(x, y + 0.028, 0.014, 0.013);
      z += bridge * 0.016 + tip * 0.026;
      y -= tip * 0.003;

      // Soft brow ridge
      const browL = gaussianFalloff(x - 0.044, y - 0.044, 0.026, 0.010);
      const browR = gaussianFalloff(x + 0.044, y - 0.044, 0.026, 0.010);
      z += (browL + browR) * 0.007;

      // Sculpted lip cushion & subtle chin curve
      const lips = gaussianFalloff(x, y + 0.062, 0.024, 0.012);
      const chin = gaussianFalloff(x, y + 0.102, 0.022, 0.016);
      z += lips * 0.012 + chin * 0.010;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();

  const morphNames = [
    // Identity morphs (11)
    'jawNarrow',
    'jawWide',
    'cheekHigh',
    'chinLong',
    'noseNarrow',
    'noseTipUp',
    'lipsFull',
    'eyesWide',
    'eyesTiltUp',
    'foreheadTall',
    'faceRound',
    // Expression morphs (7)
    'smile',
    'jawOpen',
    'winkLeft',
    'browRaise',
    'browFurrow',
    'poutKiss',
    'blink',
  ];

  const morphDictionary: Record<string, number> = {};
  const morphPositions: THREE.Float32BufferAttribute[] = [];

  morphNames.forEach((name, idx) => {
    morphDictionary[name] = idx;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      let dx = 0;
      let dy = 0;
      let dz = 0;

      switch (name) {
        case 'jawNarrow':
          if (y < -0.02) {
            const w = Math.min(1, (-y - 0.02) / 0.11);
            dx = -x * 0.22 * w;
          }
          break;
        case 'jawWide':
          if (y < -0.02 && y > -0.11) {
            dx = Math.sign(x) * 0.020 * (1 - Math.abs(y + 0.065) / 0.055);
          }
          break;
        case 'cheekHigh':
          if (z > 0.03) {
            const w =
              gaussianFalloff(x - 0.058, y + 0.012, 0.026, 0.022) +
              gaussianFalloff(x + 0.058, y + 0.012, 0.026, 0.022);
            dz = w * 0.014;
            dy = w * 0.008;
            dx = Math.sign(x) * w * 0.006;
          }
          break;
        case 'chinLong':
          if (y < -0.085) dy = -0.016 * ((-y - 0.085) / 0.05);
          break;
        case 'noseNarrow':
          if (z > 0.05 && Math.abs(x) < 0.028 && y < 0.02 && y > -0.045) {
            dx = -x * 0.24;
          }
          break;
        case 'noseTipUp':
          if (z > 0.07) {
            const w = gaussianFalloff(x, y + 0.028, 0.016, 0.016);
            dy = w * 0.009;
            dz = w * 0.005;
          }
          break;
        case 'lipsFull':
          if (z > 0.05) {
            const w = gaussianFalloff(x, y + 0.062, 0.026, 0.015);
            dz = w * 0.011;
            dy = y > -0.062 ? w * 0.004 : -w * 0.005;
          }
          break;
        case 'eyesWide':
          if (z > 0.04 && Math.abs(Math.abs(x) - 0.044) < 0.026 && Math.abs(y - 0.012) < 0.022) {
            dy = (y - 0.012) * 0.22;
          }
          break;
        case 'eyesTiltUp':
          if (z > 0.04 && Math.abs(x) > 0.052 && Math.abs(y - 0.012) < 0.024) {
            dy = 0.007;
          }
          break;
        case 'foreheadTall':
          if (y > 0.06) dy = 0.015 * ((y - 0.06) / 0.07);
          break;
        case 'faceRound':
          if (y < 0.02 && y > -0.09 && z > 0) {
            dx = Math.sign(x) * 0.014;
            dz = 0.007;
          }
          break;
        case 'smile':
          if (z > 0.04 && Math.abs(x) > 0.018 && Math.abs(x) < 0.062 && Math.abs(y + 0.062) < 0.026) {
            dy = 0.013 * (Math.abs(x) / 0.062);
            dz = 0.006;
          }
          break;
        case 'jawOpen':
          if (y < -0.064 && z > -0.02) {
            dy = -0.018 * Math.min(1, (-y - 0.064) / 0.06);
          }
          break;
        case 'winkLeft':
          if (z > 0.04 && x > 0.018 && x < 0.068 && Math.abs(y - 0.012) < 0.02) {
            dy = -(y - 0.012) * 0.4;
          }
          break;
        case 'browRaise':
          if (z > 0.04 && Math.abs(x) < 0.072 && y > 0.03 && y < 0.068) {
            dy = 0.012;
          }
          break;
        case 'browFurrow':
          if (z > 0.05 && Math.abs(x) < 0.036 && y > 0.026 && y < 0.06) {
            dy = -0.009;
            dx = -Math.sign(x) * 0.004;
          }
          break;
        case 'poutKiss':
          if (z > 0.05) {
            const w = gaussianFalloff(x, y + 0.062, 0.026, 0.015);
            dz = w * 0.013;
            dx = -x * 0.18 * w;
          }
          break;
        case 'blink':
          if (z > 0.04 && Math.abs(Math.abs(x) - 0.044) < 0.026 && Math.abs(y - 0.012) < 0.02) {
            dy = -(y - 0.012) * 0.4;
          }
          break;
      }

      arr[i * 3] = x + dx;
      arr[i * 3 + 1] = y + dy;
      arr[i * 3 + 2] = z + dz;
    }
    morphPositions.push(new THREE.Float32BufferAttribute(arr, 3));
  });

  geo.morphAttributes.position = morphPositions;
  return { geometry: geo, morphDictionary };
}

function createLatheLimb(radii: Array<[number, number]>, segments = 20): THREE.LatheGeometry {
  const pts = radii.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

export function createDollRig(): DollRigController {
  const root = new THREE.Group();
  root.name = 'DollRoot';

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#F2C9B2'),
    roughness: 0.46,
    metalness: 0.0,
    envMapIntensity: 0.52,
    sheen: 0.48,
    sheenRoughness: 0.50,
    sheenColor: new THREE.Color('#FFA894'),
    clearcoat: 0.04,
    clearcoatRoughness: 0.70,
  });

  const bodyMeshes: THREE.Mesh[] = [];
  const registerBody = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    bodyMeshes.push(m);
    return m;
  };

  // --- ORGANIC CONTOURED SKELETAL HIERARCHY ---
  const hips = new THREE.Group();
  hips.position.set(0, 0.85, 0);
  root.add(hips);

  const pelvisMesh = registerBody(
    new THREE.Mesh(
      createLatheLimb([
        [0.045, -0.085],
        [0.095, -0.055],
        [0.106, -0.01],
        [0.096, 0.045],
        [0.078, 0.085],
      ], 26),
      skinMat,
    ),
  );
  pelvisMesh.scale.set(1.12, 1, 0.80);
  hips.add(pelvisMesh);

  const spine = new THREE.Group();
  spine.position.set(0, 0.075, 0);
  hips.add(spine);

  const waistMesh = registerBody(
    new THREE.Mesh(
      createLatheLimb([
        [0.082, -0.025],
        [0.075, 0.035],
        [0.076, 0.085],
        [0.090, 0.145],
      ], 26),
      skinMat,
    ),
  );
  waistMesh.scale.set(1.06, 1, 0.78);
  spine.add(waistMesh);

  const chest = new THREE.Group();
  chest.position.set(0, 0.19, 0);
  spine.add(chest);

  const torsoMesh = registerBody(
    new THREE.Mesh(
      createLatheLimb([
        [0.082, -0.08],
        [0.096, -0.02],
        [0.104, 0.035],
        [0.098, 0.085],
        [0.070, 0.128],
        [0.038, 0.148],
      ], 28),
      skinMat,
    ),
  );
  torsoMesh.scale.set(1.12, 1, 0.78);
  chest.add(torsoMesh);

  const neck = new THREE.Group();
  neck.position.set(0, 0.135, 0);
  chest.add(neck);

  const neckMesh = registerBody(
    new THREE.Mesh(
      createLatheLimb([
        [0.054, -0.015],
        [0.036, 0.025],
        [0.033, 0.065],
        [0.037, 0.105],
      ], 20),
      skinMat,
    ),
  );
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.178, 0.008);
  neck.add(head);

  // Morphable Pixar-Stylized Head Mesh
  const { geometry: headGeo, morphDictionary } = buildMorphableHeadGeometry();
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.46,
    metalness: 0.0,
    envMapIntensity: 0.52,
    sheen: 0.50,
    sheenRoughness: 0.50,
    sheenColor: new THREE.Color('#FFA894'),
    clearcoat: 0.04,
    clearcoatRoughness: 0.70,
  });
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  headMesh.morphTargetDictionary = morphDictionary;
  headMesh.morphTargetInfluences = new Array(Object.keys(morphDictionary).length).fill(0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  head.add(headMesh);

  // Sculpted Ears with warm inner tint
  for (const s of [-1, 1]) {
    const ear = registerBody(new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 12), skinMat));
    ear.position.set(s * 0.112, -0.004, -0.006);
    ear.scale.set(0.42, 1.18, 0.72);
    ear.rotation.z = s * -0.15;
    head.add(ear);
  }

  // Large Expressive Pixar 3D Eyes + Glossy Cornea + Eyelid Hood + Curved Lash Line + 3D Eyebrows
  const eyeMatL = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const eyeMatR = eyeMatL.clone();
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.0255, 24, 20), eyeMatL);
  leftEye.position.set(0.044, 0.012, 0.095);
  leftEye.scale.set(0.96, 1.12, 1.04);
  leftEye.rotation.y = -Math.PI / 2;
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.0255, 24, 20), eyeMatR);
  rightEye.position.set(-0.044, 0.012, 0.095);
  rightEye.scale.set(0.96, 1.12, 1.04);
  rightEye.rotation.y = -Math.PI / 2;
  head.add(leftEye, rightEye);

  // Sculpted Upper Eyelids & Lush Curved Upper Eyelashes
  const lashMat = new THREE.MeshStandardMaterial({ color: '#1B1115', roughness: 0.42 });
  const buildEyeLash = (side: 1 | -1) => {
    const pts = [
      new THREE.Vector3(-0.022 * side, -0.002, 0.011),
      new THREE.Vector3(-0.008 * side, 0.013, 0.023),
      new THREE.Vector3(0.010 * side, 0.013, 0.022),
      new THREE.Vector3(0.025 * side, 0.004, 0.009),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0028, 8, false), lashMat);
    mesh.position.set(side * 0.044, 0.019, 0.097);
    return mesh;
  };
  const leftEyelash = buildEyeLash(1);
  const rightEyelash = buildEyeLash(-1);
  head.add(leftEyelash, rightEyelash);

  // 3D Sculpted Eyebrows (expressive Pixar arches!)
  const browMat = new THREE.MeshStandardMaterial({ color: '#3D2518', roughness: 0.55 });
  const buildBrow = (side: 1 | -1) => {
    const pts = [
      new THREE.Vector3(-0.020 * side, -0.002, 0.004),
      new THREE.Vector3(-0.003 * side, 0.006, 0.010),
      new THREE.Vector3(0.017 * side, 0.004, 0.004),
      new THREE.Vector3(0.029 * side, -0.004, -0.005),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0036, 8, false), browMat);
    mesh.position.set(side * 0.044, 0.051, 0.101);
    mesh.castShadow = true;
    return mesh;
  };
  const leftBrow = buildBrow(1);
  const rightBrow = buildBrow(-1);
  head.add(leftBrow, rightBrow);

  // --- ORGANIC TAPERED ARMS, ROUNDED PALMS, 10 FINGERS & FINGERNAILS ---
  const createArm = (side: 1 | -1) => {
    const upperArm = new THREE.Group();
    upperArm.position.set(side * 0.112, 0.088, 0);
    chest.add(upperArm);

    const shoulderCap = registerBody(new THREE.Mesh(new THREE.SphereGeometry(0.029, 14, 12), skinMat));
    shoulderCap.scale.set(0.95, 1.05, 0.88);
    upperArm.add(shoulderCap);

    const upperMesh = registerBody(
      new THREE.Mesh(
        createLatheLimb([
          [0.021, -0.22],
          [0.024, -0.15],
          [0.027, -0.07],
          [0.029, 0.0],
        ], 16),
        skinMat,
      ),
    );
    upperArm.add(upperMesh);

    const elbowCap = registerBody(new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 10), skinMat));
    elbowCap.position.set(0, -0.22, 0);
    upperArm.add(elbowCap);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.22, 0);
    upperArm.add(forearm);

    const foreMesh = registerBody(
      new THREE.Mesh(
        createLatheLimb([
          [0.0155, -0.205],
          [0.021, -0.13],
          [0.024, -0.06],
          [0.021, 0.0],
        ], 16),
        skinMat,
      ),
    );
    forearm.add(foreMesh);

    const hand = new THREE.Group();
    hand.position.set(0, -0.205, 0);
    forearm.add(hand);

    // Sculpted rounded palm (no blocky BoxGeometry)
    const palm = registerBody(new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 12), skinMat));
    palm.position.set(0, -0.020, 0);
    palm.scale.set(0.75, 1.08, 0.38);
    hand.add(palm);

    const nailMeshes: THREE.Mesh[] = [];
    const fingerX = [side * -0.015, side * -0.0075, 0, side * 0.0075, side * 0.014];
    const fingerLen = [0.022, 0.032, 0.036, 0.033, 0.026];
    const fingerSpread = [side * -0.48, side * -0.09, 0, side * 0.08, side * 0.18];

    for (let f = 0; f < 5; f++) {
      const fGroup = new THREE.Group();
      fGroup.position.set(fingerX[f], f === 0 ? -0.018 : -0.040, f === 0 ? 0.007 : 0);
      fGroup.rotation.z = fingerSpread[f];
      hand.add(fGroup);

      const fMesh = registerBody(new THREE.Mesh(new THREE.CapsuleGeometry(0.0034, fingerLen[f], 5, 8), skinMat));
      fMesh.position.y = -fingerLen[f] * 0.5;
      fGroup.add(fMesh);

      const nailMat = new THREE.MeshPhysicalMaterial({
        color: '#F2B5C8',
        roughness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      });
      const nail = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.002), nailMat);
      nail.position.set(0, -fingerLen[f] * 0.92, 0.0032);
      fGroup.add(nail);
      nailMeshes.push(nail);
    }

    return { upperArm, forearm, hand, nailMeshes };
  };

  const leftArm = createArm(1);
  const rightArm = createArm(-1);

  // --- ORGANIC TAPERED LEGS, CALVES, FEET & TOENAILS ---
  const createLeg = (side: 1 | -1) => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.068, -0.045, 0);
    hips.add(thigh);

    const hipCap = registerBody(new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), skinMat));
    thigh.add(hipCap);

    const thighMesh = registerBody(
      new THREE.Mesh(
        createLatheLimb([
          [0.036, -0.37],
          [0.041, -0.26],
          [0.048, -0.14],
          [0.054, -0.04],
          [0.052, 0.0],
        ], 20),
        skinMat,
      ),
    );
    thigh.add(thighMesh);

    const kneeCap = registerBody(new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 12), skinMat));
    kneeCap.position.set(0, -0.37, 0);
    thigh.add(kneeCap);

    const shin = new THREE.Group();
    shin.position.set(0, -0.37, 0);
    thigh.add(shin);

    const shinMesh = registerBody(
      new THREE.Mesh(
        createLatheLimb([
          [0.024, -0.38],
          [0.028, -0.29],
          [0.039, -0.17],
          [0.038, -0.08],
          [0.036, 0.0],
        ], 20),
        skinMat,
      ),
    );
    shin.add(shinMesh);

    const foot = new THREE.Group();
    foot.position.set(0, -0.385, 0.01);
    shin.add(foot);

    const footMesh = registerBody(new THREE.Mesh(new THREE.CapsuleGeometry(0.023, 0.082, 8, 14), skinMat));
    footMesh.rotation.x = Math.PI / 2;
    footMesh.position.set(0, -0.015, 0.038);
    footMesh.scale.set(1.0, 1, 0.68);
    foot.add(footMesh);

    const toenails: THREE.Mesh[] = [];
    for (let t = 0; t < 5; t++) {
      const tMat = new THREE.MeshPhysicalMaterial({ color: '#F2B5C8', roughness: 0.15, clearcoat: 1.0 });
      const tn = new THREE.Mesh(new THREE.BoxGeometry(0.0058, 0.002, 0.0068), tMat);
      tn.position.set((t - 2) * 0.008, -0.003, 0.088);
      foot.add(tn);
      toenails.push(tn);
    }

    return { thigh, shin, foot, toenails };
  };

  const leftLeg = createLeg(1);
  const rightLeg = createLeg(-1);

  const nailMeshMap = new Map<NailFingerKey, THREE.Mesh>();
  ['L_Thumb', 'L_Index', 'L_Middle', 'L_Ring', 'L_Pinky'].forEach((k, i) => {
    nailMeshMap.set(k as NailFingerKey, leftArm.nailMeshes[i]);
  });
  ['R_Thumb', 'R_Index', 'R_Middle', 'R_Ring', 'R_Pinky'].forEach((k, i) => {
    nailMeshMap.set(k as NailFingerKey, rightArm.nailMeshes[i]);
  });

  const skeletonSlots: BoneAttachmentSlots = {
    hips,
    spine,
    chest,
    neck,
    head,
    leftUpperArm: leftArm.upperArm,
    leftForearm: leftArm.forearm,
    leftHand: leftArm.hand,
    rightUpperArm: rightArm.upperArm,
    rightForearm: rightArm.forearm,
    rightHand: rightArm.hand,
    leftThigh: leftLeg.thigh,
    leftShin: leftLeg.shin,
    leftFoot: leftLeg.foot,
    rightThigh: rightLeg.thigh,
    rightShin: rightLeg.shin,
    rightFoot: rightLeg.foot,
  };

  let hairGroup: THREE.Group | null = null;
  const wardrobeObjects: THREE.Object3D[] = [];
  let faceCanvas: HTMLCanvasElement | undefined;
  let activeHeelHeight = 0;
  let lastFaceKey = '';
  let lastHairKey = '';
  let lastWardrobeKey = '';
  let lastNailKey = '';

  const applyNails = (nails: NailConfig) => {
    const lengthScale =
      nails.length === 'short'
        ? 0.85
        : nails.length === 'medium'
          ? 1.15
          : nails.length === 'long'
            ? 1.55
            : 2.0;

    const tipTapering =
      nails.shape === 'stiletto'
        ? 0.55
        : nails.shape === 'coffin'
          ? 0.78
          : nails.shape === 'almond' || nails.shape === 'oval'
            ? 0.88
            : 1.0;

    for (const key of FINGER_KEYS) {
      const mesh = nailMeshMap.get(key);
      if (!mesh) continue;
      const style = nails.applyToAll ? nails.uniformStyle : nails.perFinger[key];
      const tex = buildNailTexture(style);
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.map?.dispose();
      mat.map = tex;
      mat.color.setHex(0xffffff);
      mat.metalness = style.design === 'chrome' ? 0.88 : 0.08;
      mat.roughness = style.design === 'chrome' ? 0.12 : 0.14;
      mat.needsUpdate = true;
      mesh.scale.set(tipTapering, lengthScale, 1);
    }

    const toeTex = buildNailTexture({
      color: nails.toenailsColor,
      secondaryColor: '#FFFFFF',
      design: nails.toenailsDesign,
      gems: false,
    });
    for (const tn of [...leftLeg.toenails, ...rightLeg.toenails]) {
      const mat = tn.material as THREE.MeshPhysicalMaterial;
      mat.map?.dispose();
      mat.map = toeTex;
      mat.color.setHex(0xffffff);
      mat.needsUpdate = true;
    }
  };

  const updateAppearance = (
    identity: FacialIdentityParams,
    body: BodyConfig,
    look: LookCustomization,
  ) => {
    skinMat.color.set(identity.skinToneHex);
    const heightScale = body.height === 'petite' ? 0.94 : body.height === 'tall' ? 1.06 : 1.0;
    root.scale.set(1, heightScale, 1);
    waistMesh.scale.set(1.06 * body.waistScale, 1, 0.78 * body.waistScale);
    pelvisMesh.scale.set(1.12 * body.hipScale, 1, 0.80 * body.hipScale);
    torsoMesh.scale.set(1.12 * body.shoulderScale, 1, 0.78);

    const idWeights = computeIdentityMorphWeights(identity);
    if (headMesh.morphTargetInfluences) {
      for (const [key, val] of Object.entries(idWeights)) {
        const idx = morphDictionary[key];
        if (idx !== undefined) {
          headMesh.morphTargetInfluences[idx] = val;
        }
      }
    }

    const eyeX = 0.044 + identity.eyeSpacing * 0.005;
    leftEye.position.x = eyeX;
    rightEye.position.x = -eyeX;
    leftEyelash.position.x = eyeX;
    rightEyelash.position.x = -eyeX;
    leftBrow.position.x = eyeX;
    rightBrow.position.x = -eyeX;

    browMat.color.set(look.makeup.eyebrowColor || identity.browColorHex);
    const browThicknessScale =
      look.makeup.eyebrowShape === 'thin' ? 0.78 : look.makeup.eyebrowShape === 'thick' ? 1.32 : 1.0;
    leftBrow.scale.set(1, browThicknessScale, 1);
    rightBrow.scale.set(1, browThicknessScale, 1);

    const lashScale =
      look.makeup.lashStyle === 'dramatic'
        ? 1.32
        : look.makeup.lashStyle === 'doll'
          ? 1.24
          : look.makeup.lashStyle === 'wispy'
            ? 1.08
            : 0.92;
    leftEyelash.scale.setScalar(lashScale * (0.78 + look.makeup.mascaraIntensity * 0.3));
    rightEyelash.scale.setScalar(lashScale * (0.78 + look.makeup.mascaraIntensity * 0.3));

    const faceKey = JSON.stringify([identity, look.makeup]);
    if (faceKey !== lastFaceKey) {
      lastFaceKey = faceKey;
      const { canvas, texture } = buildFaceCanvasTexture(identity, look.makeup, faceCanvas);
      faceCanvas = canvas;
      faceMat.map?.dispose();
      faceMat.map = texture;
      faceMat.roughness =
        look.makeup.skinFinish === 'dewy' ? 0.28 : look.makeup.skinFinish === 'satin' ? 0.42 : 0.62;
      faceMat.needsUpdate = true;

      const irisTex = buildIrisTexture(identity.irisColorHex);
      eyeMatL.map?.dispose();
      eyeMatR.map?.dispose();
      eyeMatL.map = irisTex;
      eyeMatR.map = irisTex;
      eyeMatL.needsUpdate = true;
      eyeMatR.needsUpdate = true;
    }

    const hairKey = JSON.stringify(look.hair);
    if (hairKey !== lastHairKey) {
      lastHairKey = hairKey;
      if (hairGroup) {
        head.remove(hairGroup);
      }
      hairGroup = buildHairGroup(look.hair);
      head.add(hairGroup);
    }

    const wardrobeKey = JSON.stringify([
      look.dress,
      look.top,
      look.bottom,
      look.outerwear,
      look.shoes,
      look.jewelry,
      look.accessories,
      look.beautyPropId,
      body,
    ]);
    if (wardrobeKey !== lastWardrobeKey) {
      lastWardrobeKey = wardrobeKey;
      activeHeelHeight = attachWardrobeToRig(skeletonSlots, look, body, wardrobeObjects);
    }

    const nailKey = JSON.stringify(look.nails);
    if (nailKey !== lastNailKey) {
      lastNailKey = nailKey;
      applyNails(look.nails);
    }
  };

  const updateAnimation = (time: number, _delta: number, look: LookCustomization) => {
    const anim: AnimationId = look.animation;

    // Ground character smoothly according to shoe heel height
    hips.position.y = 0.845 + activeHeelHeight;

    const breath = Math.sin(time * 2.1) * 0.010;
    chest.position.y = 0.19 + breath * 0.35;
    const blinkCycle = time % 4.2;
    const autoBlink = blinkCycle > 4.02 ? Math.sin(((blinkCycle - 4.02) / 0.18) * Math.PI) : 0;

    // Facial Expression Blendshapes + Expressive 3D Brows
    const exp = computeExpressionWeights(look.expression, look.expressionIntensity, autoBlink);
    if (headMesh.morphTargetInfluences) {
      headMesh.morphTargetInfluences[morphDictionary.smile] = exp.smile;
      headMesh.morphTargetInfluences[morphDictionary.jawOpen] = exp.jawOpen;
      headMesh.morphTargetInfluences[morphDictionary.winkLeft] = exp.winkLeft;
      headMesh.morphTargetInfluences[morphDictionary.browRaise] = exp.browRaise;
      headMesh.morphTargetInfluences[morphDictionary.browFurrow] = exp.browFurrow;
      headMesh.morphTargetInfluences[morphDictionary.poutKiss] = exp.poutKiss;
      headMesh.morphTargetInfluences[morphDictionary.blink] = exp.blink;
    }

    // Drive 3D eyebrows + eyelid blinking smoothly
    const asymmetricAppeal = look.expression === 'confident' || look.expression === 'playful' ? 0.005 : 0;
    leftBrow.position.y = 0.047 + exp.browRaise * 0.008 - exp.browFurrow * 0.006 + asymmetricAppeal;
    rightBrow.position.y = 0.047 + exp.browRaise * 0.008 - exp.browFurrow * 0.006 - asymmetricAppeal * 0.5;
    leftBrow.rotation.z = exp.browFurrow * -0.22 + (asymmetricAppeal > 0 ? 0.12 : 0);
    rightBrow.rotation.z = exp.browFurrow * 0.22;

    leftEye.scale.y = Math.max(0.08, 1.10 * (1 - Math.max(exp.blink, exp.winkLeft) * 0.88));
    rightEye.scale.y = Math.max(0.08, 1.10 * (1 - exp.blink * 0.88));

    // Reset default pose angles cleanly before applying animation
    root.rotation.set(0, 0, 0);
    hips.rotation.set(0, 0, 0);
    spine.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);
    leftArm.upperArm.rotation.set(0, 0, 0.14);
    leftArm.forearm.rotation.set(-0.22, 0, 0);
    leftArm.hand.rotation.set(0, 0, 0);
    rightArm.upperArm.rotation.set(0, 0, -0.14);
    rightArm.forearm.rotation.set(-0.22, 0, 0);
    rightArm.hand.rotation.set(0, 0, 0);
    leftLeg.thigh.rotation.set(0, 0, -0.02);
    leftLeg.shin.rotation.set(0, 0, 0);
    rightLeg.thigh.rotation.set(0, 0, 0.02);
    rightLeg.shin.rotation.set(0, 0, 0);

    const anklePitch = activeHeelHeight >= 0.06 ? 0.30 : 0;
    leftLeg.foot.rotation.set(anklePitch, 0, 0);
    rightLeg.foot.rotation.set(anklePitch, 0, 0);

    switch (anim) {
      case 'walking':
      case 'runway': {
        const speed = anim === 'runway' ? 5.2 : 3.8;
        const amp = anim === 'runway' ? 0.42 : 0.32;
        const s = Math.sin(time * speed);
        const c = Math.cos(time * speed);
        hips.position.y += Math.abs(c) * 0.022;
        hips.rotation.y = s * (anim === 'runway' ? 0.18 : 0.08);
        hips.rotation.z = s * (anim === 'runway' ? 0.06 : 0.02);
        leftLeg.thigh.rotation.x = s * amp;
        rightLeg.thigh.rotation.x = -s * amp;
        leftLeg.shin.rotation.x = Math.max(0, -c * 0.45);
        rightLeg.shin.rotation.x = Math.max(0, c * 0.45);
        leftArm.upperArm.rotation.x = -s * amp * 0.65;
        rightArm.upperArm.rotation.x = s * amp * 0.65;
        head.rotation.y = -hips.rotation.y * 0.5;
        break;
      }

      case 'turning': {
        root.rotation.y = time * 0.9;
        head.rotation.y = Math.sin(time * 1.4) * 0.08;
        break;
      }

      case 'posing': {
        // Expressive animated-film shrug / editorial pose (hands open outward)
        hips.rotation.y = 0.06;
        spine.rotation.z = -0.02;
        leftArm.upperArm.rotation.set(0.12, 0.18, 0.72);
        leftArm.forearm.rotation.set(-0.25, 0.25, 0.85);
        leftArm.hand.rotation.set(0.25, 0, 0.42);
        rightArm.upperArm.rotation.set(0.12, -0.18, -0.72);
        rightArm.forearm.rotation.set(-0.25, -0.25, -0.85);
        rightArm.hand.rotation.set(0.25, 0, -0.42);
        head.rotation.set(0.03, -0.05, 0.04);
        break;
      }

      case 'waving': {
        rightArm.upperArm.rotation.set(0.1, 0, -2.55);
        rightArm.forearm.rotation.set(0, 0, -0.45 + Math.sin(time * 6.5) * 0.32);
        head.rotation.z = 0.08;
        break;
      }

      case 'dancing': {
        const beat = time * 5.0;
        hips.position.y += Math.abs(Math.sin(beat)) * 0.035;
        hips.rotation.z = Math.sin(beat * 0.5) * 0.09;
        spine.rotation.y = Math.sin(beat * 0.5) * 0.16;
        leftArm.upperArm.rotation.set(-0.5 + Math.sin(beat) * 0.35, 0, 0.7);
        rightArm.upperArm.rotation.set(-0.5 - Math.sin(beat) * 0.35, 0, -0.7);
        leftArm.forearm.rotation.x = -0.8;
        rightArm.forearm.rotation.x = -0.8;
        head.rotation.z = Math.sin(beat * 0.5) * 0.1;
        break;
      }

      case 'blow_kiss': {
        rightArm.upperArm.rotation.set(-0.95, 0.2, -0.35);
        rightArm.forearm.rotation.set(-1.35 + Math.sin(time * 2.8) * 0.2, 0, 0.3);
        head.rotation.set(0.06, -0.1, 0.08);
        break;
      }

      case 'show_outfit': {
        root.rotation.y = Math.sin(time * 1.4) * 0.55;
        leftArm.upperArm.rotation.set(0, 0, 0.55);
        rightArm.upperArm.rotation.set(0, 0, -0.55);
        break;
      }

      case 'show_jewelry': {
        rightArm.upperArm.rotation.set(-0.7, 0.35, -0.2);
        rightArm.forearm.rotation.set(-1.1, 0, 0.45);
        head.rotation.set(0.05, -0.25, 0.08);
        break;
      }

      case 'show_hair': {
        root.rotation.y = Math.sin(time * 1.1) * 0.75;
        leftArm.upperArm.rotation.set(-0.8, 0, 0.55);
        leftArm.forearm.rotation.set(-1.2, 0, -0.35);
        break;
      }

      case 'idle':
      default: {
        head.rotation.y = Math.sin(time * 0.85) * 0.05;
        head.rotation.x = Math.sin(time * 1.1) * 0.025;
        hips.rotation.z = Math.sin(time * 0.9) * 0.015;
        break;
      }
    }

    if (look.beautyPropId && anim === 'idle') {
      rightArm.upperArm.rotation.set(-0.45, 0.12, -0.25);
      rightArm.forearm.rotation.set(-0.95, 0, 0.25);
    }
  };

  const dispose = () => {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m) {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          }
        });
      }
    });
  };

  return {
    root,
    skeletonSlots,
    headMesh,
    bodyMeshes,
    updateAppearance,
    updateAnimation,
    dispose,
  };
}
