import * as THREE from 'three';
import { WARDROBE_CATALOG } from '../data/catalog';
import type {
  AccessoriesSelection,
  BodyConfig,
  FabricFinish,
  JewelrySelection,
  LookCustomization,
} from '../types/studio';

function buildSequinSparkleMap(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 6) {
    for (let x = 0; x < size; x += 6) {
      const bright = ((x * 13 + y * 7) % 120) + 120;
      ctx.fillStyle = `rgb(${bright}, ${bright}, ${bright})`;
      ctx.beginPath();
      ctx.arc(x + 3, y + 3, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

let cachedSequinMap: THREE.CanvasTexture | null = null;

export function createFabricMaterial(colorHex: string, finish: FabricFinish = 'matte'): THREE.MeshPhysicalMaterial {
  const baseColor = new THREE.Color(colorHex);
  switch (finish) {
    case 'silk':
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.28,
        metalness: 0.08,
        sheen: 0.85,
        sheenRoughness: 0.25,
        sheenColor: baseColor.clone().lerp(new THREE.Color('#FFFFFF'), 0.45),
        side: THREE.DoubleSide,
      });
    case 'satin':
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.22,
        metalness: 0.12,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
        sheen: 0.65,
        side: THREE.DoubleSide,
      });
    case 'velvet':
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.88,
        metalness: 0.0,
        sheen: 1.0,
        sheenRoughness: 0.75,
        sheenColor: baseColor.clone().lerp(new THREE.Color('#FFFFFF'), 0.35),
        side: THREE.DoubleSide,
      });
    case 'leather':
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.34,
        metalness: 0.06,
        clearcoat: 0.55,
        clearcoatRoughness: 0.28,
        side: THREE.DoubleSide,
      });
    case 'denim':
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.0,
        sheen: 0.2,
        side: THREE.DoubleSide,
      });
    case 'sequin': {
      if (!cachedSequinMap) cachedSequinMap = buildSequinSparkleMap();
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.22,
        metalness: 0.72,
        bumpMap: cachedSequinMap,
        bumpScale: 0.015,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        side: THREE.DoubleSide,
      });
    }
    case 'matte':
    default:
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
  }
}

export function createMetalMaterial(hex: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    metalness: 0.92,
    roughness: 0.16,
    clearcoat: 0.4,
  });
}

export interface BoneAttachmentSlots {
  hips: THREE.Object3D;
  spine: THREE.Object3D;
  chest: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  leftUpperArm: THREE.Object3D;
  leftForearm: THREE.Object3D;
  leftHand: THREE.Object3D;
  rightUpperArm: THREE.Object3D;
  rightForearm: THREE.Object3D;
  rightHand: THREE.Object3D;
  leftThigh: THREE.Object3D;
  leftShin: THREE.Object3D;
  leftFoot: THREE.Object3D;
  rightThigh: THREE.Object3D;
  rightShin: THREE.Object3D;
  rightFoot: THREE.Object3D;
}

function createLatheSkirt(
  topR: number,
  midR: number,
  botR: number,
  length: number,
  mat: THREE.Material,
): THREE.Mesh {
  const pts = [
    new THREE.Vector2(topR, 0),
    new THREE.Vector2(topR * 1.06, -length * 0.18),
    new THREE.Vector2(midR, -length * 0.52),
    new THREE.Vector2(botR, -length),
  ];
  const geo = new THREE.LatheGeometry(pts, 32);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createBodiceMesh(
  waistScale: number,
  hipScale: number,
  mat: THREE.Material,
  cropFactor = 0,
  highNeck = false,
): THREE.Group {
  const g = new THREE.Group();
  const bottomY = cropFactor > 0.5 ? -0.05 : -0.225;
  const pts = highNeck
    ? [
        new THREE.Vector2(0.045, 0.146),
        new THREE.Vector2(0.078, 0.128),
        new THREE.Vector2(0.106, 0.085),
        new THREE.Vector2(0.114, 0.035),
        new THREE.Vector2(0.111, -0.015),
        new THREE.Vector2(0.089 * waistScale, -0.095),
      ]
    : [
        new THREE.Vector2(0.094, 0.096),
        new THREE.Vector2(0.116, 0.04),
        new THREE.Vector2(0.113, -0.01),
        new THREE.Vector2(0.089 * waistScale, -0.095),
      ];
  if (cropFactor <= 0.5) {
    pts.push(new THREE.Vector2(0.115 * hipScale, bottomY));
  }
  const bodiceGeo = new THREE.LatheGeometry(pts, 32);
  const bodiceMesh = new THREE.Mesh(bodiceGeo, mat);
  bodiceMesh.scale.set(1.13, 1, 0.81);
  bodiceMesh.castShadow = true;
  bodiceMesh.receiveShadow = true;
  g.add(bodiceMesh);

  return g;
}

function buildDenimWashTexture(baseHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(baseHex);
  const light = base.clone().lerp(new THREE.Color('#4B72B0'), 0.25);
  const dark = base.clone().lerp(new THREE.Color('#070E24'), 0.35);

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `#${dark.getHexString()}`);
  grad.addColorStop(0.45, `#${base.getHexString()}`);
  grad.addColorStop(0.65, `#${light.getHexString()}`);
  grad.addColorStop(1, `#${dark.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 256; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function attachWardrobeToRig(
  slots: BoneAttachmentSlots,
  look: LookCustomization,
  body: BodyConfig,
  dynamicObjects: THREE.Object3D[],
): number {
  // Clean previous dynamic wardrobe meshes
  for (const obj of dynamicObjects) {
    obj.parent?.remove(obj);
  }
  dynamicObjects.length = 0;

  const track = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T): T => {
    parent.add(child);
    dynamicObjects.push(child);
    return child;
  };

  // 1. DRESSES
  if (look.dress) {
    const item = WARDROBE_CATALOG.find((c) => c.id === look.dress?.id);
    const mat = createFabricMaterial(look.dress.color, look.dress.finish);
    const trimMat = createFabricMaterial(look.dress.secondaryColor || '#FFF5F9', 'satin');

    const bodice = createBodiceMesh(body.waistScale, body.hipScale, mat, 0, false);
    track(slots.chest, bodice);

    // Straps / neckline
    if (item?.subType === 'evening_gown' || item?.subType === 'ball_gown' || item?.subType === 'wedding') {
      const sweet = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.014, 10, 24, Math.PI), trimMat);
      sweet.position.set(0, 0.092, 0.02);
      sweet.rotation.x = Math.PI / 2;
      bodice.add(sweet);
    } else {
      for (const s of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.048, 8), mat);
        strap.position.set(s * 0.068, 0.104, 0.004);
        strap.rotation.z = s * -0.14;
        bodice.add(strap);
      }
    }

    // Skirt attached to hips — starts high at y=0.11 so it overlaps smoothly with bodice bottom
    const isBallGown = item?.subType === 'ball_gown' || item?.subType === 'wedding';
    const isMaxi = item?.subType === 'evening_gown' || item?.subType === 'maxi';
    const isMini = item?.subType === 'mini';
    const skirtLen = isBallGown || isMaxi ? 0.86 : isMini ? 0.34 : 0.49;
    const topR = 0.105 * body.hipScale;
    const midR = isBallGown ? 0.34 : isMaxi ? 0.22 : 0.165;
    const botR = isBallGown ? 0.46 : isMaxi ? 0.28 : 0.195;

    const skirt = createLatheSkirt(topR, midR, botR, skirtLen, mat);
    skirt.position.set(0, 0.11, 0);
    skirt.scale.set(1.09, 1, 0.81);
    track(slots.hips, skirt);

    if (isBallGown) {
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.105 * body.waistScale, 0.014, 10, 24), trimMat);
      belt.position.set(0, 0.10, 0);
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(1.08, 0.8, 1);
      track(slots.hips, belt);
    }
  }

  // 2. TOPS
  if (look.top) {
    const item = WARDROBE_CATALOG.find((c) => c.id === look.top?.id);
    const mat = createFabricMaterial(look.top.color, look.top.finish);
    const isCrop = item?.subType === 'crop' || item?.subType === 'corset';
    const isHighNeck =
      item?.subType === 'tshirt' ||
      item?.subType === 'sweater' ||
      item?.subType === 'hoodie' ||
      item?.subType === 'blouse';
    const isLongSleeve = item?.subType === 'sweater' || item?.subType === 'hoodie' || item?.subType === 'blouse';

    const bodice = createBodiceMesh(body.waistScale, body.hipScale, mat, isCrop ? 0.75 : 0, isHighNeck);
    track(slots.chest, bodice);

    if (item?.subType === 'tshirt' || item?.subType === 'sweater') {
      // Flush crewneck rib collar sitting directly at the top of the high-neck shoulder yoke
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.049, 0.008, 10, 24), mat);
      collar.position.set(0, 0.146, 0.002);
      collar.rotation.x = Math.PI / 2 + 0.06;
      collar.scale.set(1.10, 0.84, 1);
      bodice.add(collar);
    }

    if (item?.subType === 'off_shoulder') {
      const ruffle = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 12, 24), mat);
      ruffle.position.set(0, 0.075, 0);
      ruffle.rotation.x = Math.PI / 2;
      ruffle.scale.set(1.15, 0.76, 1);
      bodice.add(ruffle);
    } else if (item?.subType === 'tshirt' || item?.subType === 'sweater' || item?.subType === 'hoodie') {
      for (const slot of [slots.leftUpperArm, slots.rightUpperArm]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 12), mat);
        cap.scale.set(0.95, 1.0, 0.90);
        track(slot, cap);
        const sleevePts = isLongSleeve
          ? [new THREE.Vector2(0.032, -0.22), new THREE.Vector2(0.036, -0.10), new THREE.Vector2(0.038, 0.0)]
          : [new THREE.Vector2(0.035, -0.105), new THREE.Vector2(0.037, -0.05), new THREE.Vector2(0.038, 0.0)];
        const sleeve = new THREE.Mesh(new THREE.LatheGeometry(sleevePts, 18), mat);
        sleeve.castShadow = true;
        track(slot, sleeve);
      }
      if (isLongSleeve) {
        for (const slot of [slots.leftForearm, slots.rightForearm]) {
          const fore = new THREE.Mesh(
            new THREE.LatheGeometry([new THREE.Vector2(0.022, -0.195), new THREE.Vector2(0.031, -0.08), new THREE.Vector2(0.032, 0.0)], 16),
            mat,
          );
          fore.castShadow = true;
          track(slot, fore);
        }
      }
    }
  }

  // 3. BOTTOMS
  if (look.bottom) {
    const item = WARDROBE_CATALOG.find((c) => c.id === look.bottom?.id);
    const isJeans = item?.subType === 'jeans';
    const mat = createFabricMaterial(look.bottom.color, look.bottom.finish);
    if (isJeans) {
      mat.map = buildDenimWashTexture(look.bottom.color);
      mat.needsUpdate = true;
    }

    const pelvisCover = new THREE.Mesh(
      new THREE.LatheGeometry([
        new THREE.Vector2(0.055 * body.hipScale, -0.095),
        new THREE.Vector2(0.110 * body.hipScale, -0.045),
        new THREE.Vector2(0.110 * body.hipScale, 0.025),
        new THREE.Vector2(0.090 * body.waistScale, 0.078),
      ], 26),
      mat,
    );
    pelvisCover.scale.set(1.09, 1, 0.80);
    pelvisCover.castShadow = true;
    track(slots.hips, pelvisCover);

    if (item?.subType.includes('skirt')) {
      const len = item.subType === 'mini_skirt' ? 0.30 : item.subType === 'midi_skirt' ? 0.52 : 0.82;
      const skirt = createLatheSkirt(0.116 * body.hipScale, 0.16, len > 0.6 ? 0.26 : 0.19, len, mat);
      skirt.position.set(0, 0.06, 0);
      skirt.scale.set(1.08, 1, 0.82);
      track(slots.hips, skirt);
    } else if (item?.subType === 'shorts') {
      for (const legSlot of [slots.leftThigh, slots.rightThigh]) {
        const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.056, 0.16, 16), mat);
        shortLeg.position.set(0, -0.07, 0);
        shortLeg.castShadow = true;
        track(legSlot, shortLeg);
      }
    } else {
      const isWide = item?.subType === 'trousers' || item?.subType === 'cargo';
      for (const thighSlot of [slots.leftThigh, slots.rightThigh]) {
        const thighPts = isWide
          ? [new THREE.Vector2(0.056, -0.37), new THREE.Vector2(0.058, -0.18), new THREE.Vector2(0.061, 0.0)]
          : [new THREE.Vector2(0.040, -0.37), new THREE.Vector2(0.049, -0.20), new THREE.Vector2(0.058, -0.04), new THREE.Vector2(0.056, 0.0)];
        const thigh = new THREE.Mesh(new THREE.LatheGeometry(thighPts, 18), mat);
        thigh.castShadow = true;
        track(thighSlot, thigh);
      }
      for (const shinSlot of [slots.leftShin, slots.rightShin]) {
        const shinPts = isWide
          ? [new THREE.Vector2(0.064, -0.38), new THREE.Vector2(0.058, -0.18), new THREE.Vector2(0.056, 0.0)]
          : [new THREE.Vector2(0.028, -0.37), new THREE.Vector2(0.032, -0.26), new THREE.Vector2(0.042, -0.15), new THREE.Vector2(0.040, 0.0)];
        const shin = new THREE.Mesh(new THREE.LatheGeometry(shinPts, 18), mat);
        shin.castShadow = true;
        track(shinSlot, shin);
      }
    }
  }

  // 4. OUTERWEAR
  if (look.outerwear) {
    const item = WARDROBE_CATALOG.find((c) => c.id === look.outerwear?.id);
    const mat = createFabricMaterial(look.outerwear.color, look.outerwear.finish);
    const isLong = item?.subType === 'long_coat';
    const jacketLen = isLong ? 0.65 : 0.32;

    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.124, jacketLen, 20, 1, false, Math.PI * 0.25, Math.PI * 1.5), mat);
    back.position.set(0, -jacketLen * 0.35 + 0.04, -0.004);
    back.scale.set(1.08, 1, 0.84);
    back.castShadow = true;
    track(slots.chest, back);

    // Lapels
    for (const s of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.014), mat);
      lapel.position.set(s * 0.055, 0.02, 0.088);
      lapel.rotation.z = s * -0.15;
      back.add(lapel);
    }

    for (const arm of [slots.leftUpperArm, slots.rightUpperArm]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.042, 0.24, 14), mat);
      sleeve.position.set(0, -0.11, 0);
      sleeve.castShadow = true;
      track(arm, sleeve);
    }
    for (const fore of [slots.leftForearm, slots.rightForearm]) {
      const fSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.034, 0.21, 14), mat);
      fSleeve.position.set(0, -0.10, 0);
      fSleeve.castShadow = true;
      track(fore, fSleeve);
    }
  }

  // 5. SHOES & FOOTWEAR
  let heelHeight = 0;
  if (look.shoes) {
    const shoeItem = WARDROBE_CATALOG.find((c) => c.id === look.shoes?.id);
    heelHeight = shoeItem?.heelHeight ?? 0.02;
    const shoeMat = createFabricMaterial(look.shoes.color, look.shoes.finish);
    const soleMat = new THREE.MeshStandardMaterial({ color: '#1E161A', roughness: 0.5, metalness: 0.1 });

    const footSlots = [slots.leftFoot, slots.rightFoot];
    const shinSlots = [slots.leftShin, slots.rightShin];

    footSlots.forEach((fSlot, idx) => {
      const shoeGroup = new THREE.Group();

      // Vamp / Toe box
      const vamp = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.085, 8, 14), shoeMat);
      vamp.rotation.x = Math.PI / 2;
      vamp.position.set(0, -0.012, 0.045);
      vamp.scale.set(1.05, 1, 0.68);
      vamp.castShadow = true;
      shoeGroup.add(vamp);

      // Platform / sole
      const isPlatform = shoeItem?.subType === 'platform' || shoeItem?.subType === 'sneakers';
      const isBoot = shoeItem?.subType === 'ankle_boot' || shoeItem?.subType === 'knee_boot';
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.062, isPlatform ? 0.032 : isBoot ? 0.022 : 0.01, 0.15),
        isPlatform && shoeItem?.subType === 'sneakers'
          ? new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.4 })
          : isBoot
            ? new THREE.MeshStandardMaterial({ color: '#333036', roughness: 0.72 })
            : soleMat,
      );
      sole.position.set(0, isBoot ? -0.028 : -0.032, 0.042);
      shoeGroup.add(sole);

      // Stiletto / Heel spike
      if (heelHeight >= 0.06 && !isBoot) {
        const heelSpike = new THREE.Mesh(
          new THREE.CylinderGeometry(0.011, 0.006, heelHeight, 10),
          shoeItem?.subType === 'luxury_party' ? createMetalMaterial('#E5C48D') : shoeMat,
        );
        heelSpike.position.set(0, -heelHeight * 0.5 - 0.015, -0.032);
        heelSpike.castShadow = true;
        shoeGroup.add(heelSpike);
      }

      // Structured Two-Tone Boots shaft + cuff trim
      if (isBoot) {
        const shaftH = shoeItem?.subType === 'knee_boot' ? 0.28 : 0.15;
        const shaft = new THREE.Mesh(
          new THREE.LatheGeometry([
            new THREE.Vector2(0.032, 0),
            new THREE.Vector2(0.036, shaftH * 0.45),
            new THREE.Vector2(0.044, shaftH),
          ], 18),
          shoeMat,
        );
        shaft.position.set(0, -0.38, 0);
        shaft.castShadow = true;
        track(shinSlots[idx], shaft);

        // Contrast lower vamp & cuff rim
        const cuffTrim = new THREE.Mesh(
          new THREE.TorusGeometry(0.044, 0.004, 8, 20),
          createFabricMaterial(look.shoes?.secondaryColor || '#3D1D22', 'leather'),
        );
        cuffTrim.rotation.x = Math.PI / 2;
        cuffTrim.position.set(0, -0.38 + shaftH - 0.01, 0);
        track(shinSlots[idx], cuffTrim);
      }

      track(fSlot, shoeGroup);
    });
  }

  // 6. JEWELRY
  attachJewelry(slots, look.jewelry, track);

  // 7. ACCESSORIES
  attachAccessories(slots, look.accessories, track);

  // 8. BEAUTY PROPS
  if (look.beautyPropId) {
    attachBeautyProp(slots.rightHand, slots.head, look.beautyPropId, track);
  }

  return heelHeight;
}

function attachJewelry(
  slots: BoneAttachmentSlots,
  jewelry: JewelrySelection,
  track: <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => T,
) {
  const metal = createMetalMaterial(jewelry.metalColor || '#E5C48D');
  const pearl = new THREE.MeshPhysicalMaterial({ color: '#FFF7F0', roughness: 0.15, clearcoat: 1.0 });
  const gem = new THREE.MeshPhysicalMaterial({ color: '#E8F4FF', roughness: 0.05, metalness: 0.2, clearcoat: 1.0 });

  if (jewelry.necklaceId) {
    const isChoker = jewelry.necklaceId.includes('choker');
    const neckRing = new THREE.Mesh(
      new THREE.TorusGeometry(isChoker ? 0.043 : 0.056, isChoker ? 0.005 : 0.0038, 10, 28),
      jewelry.necklaceId.includes('pearl') ? pearl : metal,
    );
    neckRing.rotation.x = Math.PI / 2 + (isChoker ? 0 : 0.22);
    neckRing.position.set(0, isChoker ? 0.042 : 0.132, isChoker ? 0.004 : 0.012);
    if (!isChoker && jewelry.necklaceId.includes('diamond')) {
      const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.01, 0), gem);
      pendant.position.set(0, 0.056, 0.005);
      neckRing.add(pendant);
    }
    track(isChoker ? slots.neck : slots.chest, neckRing);
  }

  if (jewelry.earringsId) {
    for (const s of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(s * 0.118, -0.008, 0.004);
      if (jewelry.earringsId.includes('hoop')) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 20), metal);
        hoop.rotation.y = Math.PI / 2;
        earGroup.add(hoop);
      } else if (jewelry.earringsId.includes('drop')) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 10), metal);
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 12), pearl);
        drop.position.y = -0.018;
        drop.scale.set(0.85, 1.3, 0.85);
        earGroup.add(stud, drop);
      } else {
        const stud = new THREE.Mesh(new THREE.OctahedronGeometry(0.006, 0), gem);
        earGroup.add(stud);
      }
      track(slots.head, earGroup);
    }
  }

  if (jewelry.braceletId) {
    for (let i = 0; i < 2; i++) {
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0035, 8, 20), metal);
      bangle.rotation.x = Math.PI / 2;
      bangle.position.set(0, -0.185 - i * 0.012, 0);
      track(slots.rightForearm, bangle);
    }
  }

  if (jewelry.watchId) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.004, 8, 20), metal);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, -0.19, 0);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.006, 16), pearl);
    dial.rotation.z = Math.PI / 2;
    dial.position.set(-0.032, 0, 0);
    band.add(dial);
    track(slots.leftForearm, band);
  }

  if (jewelry.ringId) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0018, 8, 16), metal);
    ring.position.set(0.008, -0.045, 0.005);
    ring.rotation.x = Math.PI / 2;
    const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.0045, 0), createFabricMaterial('#F4A6BE', 'satin'));
    stone.position.set(0, 0.008, 0);
    ring.add(stone);
    track(slots.rightHand, ring);
  }

  if (jewelry.ankletId) {
    const anklet = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.003, 8, 20), pearl);
    anklet.rotation.x = Math.PI / 2;
    anklet.position.set(0, -0.37, 0);
    track(slots.rightShin, anklet);
  }
}

function attachAccessories(
  slots: BoneAttachmentSlots,
  acc: AccessoriesSelection,
  track: <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => T,
) {
  if (acc.bagId) {
    const bagMat = createFabricMaterial(acc.bagColor || '#F5DCE5', 'leather');
    const metal = createMetalMaterial('#E5C48D');
    if (acc.bagId === 'acc_mini_backpack') {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.08), bagMat);
      pack.position.set(0, 0.0, -0.125);
      pack.castShadow = true;
      track(slots.chest, pack);
    } else if (acc.bagId === 'acc_quilted_clutch') {
      const clutch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.16), bagMat);
      clutch.position.set(-0.025, -0.04, 0.02);
      clutch.castShadow = true;
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.025), metal);
      clutch.add(clasp);
      track(slots.leftHand, clutch);
    } else {
      const tote = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.18), bagMat);
      tote.position.set(-0.04, -0.10, 0.02);
      tote.castShadow = true;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.005, 8, 20, Math.PI), metal);
      handle.position.y = 0.07;
      handle.rotation.y = Math.PI / 2;
      tote.add(handle);
      track(slots.leftHand, tote);
    }
  }

  if (acc.glassesId) {
    const frameMat = createFabricMaterial(acc.glassesColor || '#231924', 'leather');
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: acc.glassesId === 'acc_cat_sunglasses' ? '#1E151C' : '#EBF4FA',
      transparent: true,
      opacity: acc.glassesId === 'acc_cat_sunglasses' ? 0.85 : 0.25,
      roughness: 0.05,
      clearcoat: 1.0,
    });
    const glasses = new THREE.Group();
    glasses.position.set(0, 0.014, 0.125);
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0035, 8, 24), frameMat);
      rim.position.x = s * 0.042;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 18), lensMat);
      lens.position.x = s * 0.042;
      glasses.add(rim, lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.004, 0.004), frameMat);
    glasses.add(bridge);
    track(slots.head, glasses);
  }

  if (acc.hatId) {
    const hatMat = createFabricMaterial(acc.hatColor || '#B8395F', 'velvet');
    if (acc.hatId === 'acc_paris_beret') {
      const beret = new THREE.Mesh(new THREE.SphereGeometry(0.132, 24, 14), hatMat);
      beret.position.set(0.02, 0.128, -0.015);
      beret.scale.set(1.1, 0.36, 1.1);
      beret.rotation.z = -0.22;
      beret.castShadow = true;
      track(slots.head, beret);
    } else {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.01, 32), hatMat);
      brim.position.set(0, 0.128, -0.01);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.128, 0.08, 24), hatMat);
      crown.position.y = 0.04;
      brim.add(crown);
      track(slots.head, brim);
    }
  }

  if (acc.hairAccessoryId) {
    const accMat = createFabricMaterial(acc.hairAccessoryColor || '#F5E4B8', 'satin');
    if (acc.hairAccessoryId === 'acc_tiara_crown') {
      const tiara = new THREE.Group();
      tiara.position.set(0, 0.138, 0.016);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.004, 8, 24, Math.PI), createMetalMaterial('#F5E4B8'));
      band.rotation.x = Math.PI / 2;
      tiara.add(band);
      for (let i = -2; i <= 2; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.034 - Math.abs(i) * 0.005, 6), createMetalMaterial('#F5E4B8'));
        spike.position.set(i * 0.024, 0.016, 0.074 - Math.abs(i) * 0.012);
        tiara.add(spike);
      }
      track(slots.head, tiara);
    } else {
      const bow = new THREE.Group();
      bow.position.set(0, 0.135, -0.068);
      for (const s of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), accMat);
        loop.position.x = s * 0.028;
        loop.scale.set(1.3, 0.75, 0.5);
        loop.rotation.z = s * 0.25;
        bow.add(loop);
      }
      track(slots.head, bow);
    }
  }

  if (acc.beltId) {
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.008, 8, 24), createMetalMaterial('#E5C48D'));
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 0.075, 0);
    belt.scale.set(1.06, 0.78, 1);
    track(slots.hips, belt);
  }

  if (acc.glovesId) {
    const gloveMat = createFabricMaterial('#FFF7FA', 'satin');
    for (const slot of [slots.leftForearm, slots.rightForearm]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.21, 12), gloveMat);
      sleeve.position.set(0, -0.105, 0);
      track(slot, sleeve);
    }
  }
}

function attachBeautyProp(
  rightHand: THREE.Object3D,
  head: THREE.Object3D,
  propId: string,
  track: <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => T,
) {
  const gold = createMetalMaterial('#E5C48D');
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#F8D4E0',
    roughness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.85,
  });

  if (propId === 'prop_perfume') {
    const bottle = new THREE.Group();
    bottle.position.set(0, -0.03, 0.035);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.064, 0.034), glass);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 12), gold);
    cap.position.y = 0.045;
    bottle.add(body, cap);
    track(rightHand, bottle);
  } else if (propId === 'prop_palette') {
    const pal = new THREE.Group();
    pal.position.set(0, -0.02, 0.04);
    pal.rotation.x = -0.35;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.06), createFabricMaterial('#2E202B', 'leather'));
    pal.add(base);
    const shades = ['#E8A4BA', '#C7B8EA', '#D4A857', '#B8395F'];
    shades.forEach((hex, idx) => {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 12), createFabricMaterial(hex, 'sequin'));
      pan.position.set(-0.027 + idx * 0.018, 0.007, 0);
      pal.add(pan);
    });
    track(rightHand, pal);
  } else if (propId === 'prop_brush') {
    const brush = new THREE.Group();
    brush.position.set(0, 0.02, 0.03);
    brush.rotation.x = 0.4;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.14, 10), gold);
    const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, 14), createFabricMaterial('#F5DCE5', 'velvet'));
    bristles.position.y = 0.085;
    bristles.rotation.x = Math.PI;
    brush.add(handle, bristles);
    track(rightHand, brush);
  } else if (propId === 'prop_lip_balm') {
    const lip = new THREE.Group();
    lip.position.set(0, -0.02, 0.03);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.075, 12), gold);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 12), createFabricMaterial('#C84B78', 'satin'));
    tip.position.y = 0.045;
    lip.add(tube, tip);
    track(rightHand, lip);
  } else if (propId === 'prop_moisturizer') {
    const jar = new THREE.Group();
    jar.position.set(0, -0.025, 0.035);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.042, 18), createFabricMaterial('#FAF0EC', 'satin'));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.012, 18), gold);
    lid.position.y = 0.026;
    jar.add(base, lid);
    track(rightHand, jar);
  } else if (propId === 'prop_sheet_mask') {
    const mask = new THREE.Mesh(
      new THREE.SphereGeometry(0.104, 24, 20, -Math.PI * 0.28, Math.PI * 0.56, Math.PI * 0.28, Math.PI * 0.52),
      new THREE.MeshPhysicalMaterial({ color: '#FFF7FA', roughness: 0.4, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    );
    mask.position.set(0, 0.01, 0.006);
    mask.rotation.y = Math.PI / 2;
    track(head, mask);
  }
}
