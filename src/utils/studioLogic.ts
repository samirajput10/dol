import { WARDROBE_CATALOG } from '../data/catalog';
import type {
  ChallengeEvaluation,
  ExpressionId,
  FacialIdentityParams,
  FashionChallenge,
  GarmentSelection,
  LookCustomization,
  UploadedPhoto,
} from '../types/studio';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface IdentityMorphWeights {
  jawNarrow: number;
  jawWide: number;
  cheekHigh: number;
  chinLong: number;
  noseNarrow: number;
  noseTipUp: number;
  lipsFull: number;
  eyesWide: number;
  eyesTiltUp: number;
  foreheadTall: number;
  faceRound: number;
}

/**
 * Converts AI-extracted facial morphometric parameters into bounded
 * 3D mesh identity morph target weights so the rigged doll preserves
 * recognizable facial structure across all hairstyles, outfits, and poses.
 */
export function computeIdentityMorphWeights(identity: FacialIdentityParams): IdentityMorphWeights {
  const jaw = clamp(identity.jawWidth, -1, 1);
  const roundnessBonus = identity.faceShape === 'round' ? 0.55 : identity.faceShape === 'square' ? 0.25 : 0;
  const heartNarrowBonus = identity.faceShape === 'heart' || identity.faceShape === 'diamond' ? 0.3 : 0;

  return {
    jawNarrow: clamp((-jaw) * 0.7 + heartNarrowBonus, 0, 1),
    jawWide: clamp(jaw * 0.7 + (identity.faceShape === 'square' ? 0.3 : 0), 0, 1),
    cheekHigh: clamp((identity.cheekboneHeight + 0.3) * 0.6, 0, 1),
    chinLong: clamp((identity.chinLength + 0.2) * 0.55, 0, 1),
    noseNarrow: clamp((-identity.noseWidth + 0.1) * 0.55, 0, 1),
    noseTipUp: clamp((identity.noseTipTilt + 0.2) * 0.5, 0, 1),
    lipsFull: clamp(((identity.lipFullnessUpper + identity.lipFullnessLower) / 2 + 0.25) * 0.65, 0, 1),
    eyesWide: clamp((identity.eyeSize + 0.25) * 0.6, 0, 1),
    eyesTiltUp: clamp((identity.eyeTilt + 0.2) * 0.6, 0, 1),
    foreheadTall: clamp((identity.foreheadHeight + 0.2) * 0.5, 0, 1),
    faceRound: clamp((identity.cheekFullness + 0.2) * 0.45 + roundnessBonus, 0, 1),
  };
}

export interface ExpressionWeights {
  smile: number;
  jawOpen: number;
  winkLeft: number;
  browRaise: number;
  browFurrow: number;
  poutKiss: number;
  blink: number;
}

/**
 * Computes facial expression blendshape weights scaled by intensity [0..1].
 */
export function computeExpressionWeights(
  expression: ExpressionId,
  intensity: number,
  autoBlink = 0,
): ExpressionWeights {
  const k = clamp(intensity, 0, 1);
  const base: ExpressionWeights = {
    smile: 0,
    jawOpen: 0,
    winkLeft: 0,
    browRaise: 0,
    browFurrow: 0,
    poutKiss: 0,
    blink: clamp(autoBlink, 0, 1),
  };

  switch (expression) {
    case 'smiling':
      base.smile = 0.75 * k;
      base.browRaise = 0.15 * k;
      break;
    case 'happy':
      base.smile = 0.9 * k;
      base.jawOpen = 0.22 * k;
      base.browRaise = 0.25 * k;
      break;
    case 'laughing':
      base.smile = 1.0 * k;
      base.jawOpen = 0.65 * k;
      base.browRaise = 0.35 * k;
      break;
    case 'winking':
      base.smile = 0.7 * k;
      base.winkLeft = 1.0 * k;
      base.browRaise = 0.2 * k;
      break;
    case 'surprised':
      base.jawOpen = 0.75 * k;
      base.browRaise = 0.95 * k;
      break;
    case 'sad':
      base.browFurrow = 0.55 * k;
      base.poutKiss = 0.25 * k;
      break;
    case 'angry':
      base.browFurrow = 0.95 * k;
      base.jawOpen = 0.15 * k;
      break;
    case 'confident':
      base.smile = 0.42 * k;
      base.browRaise = 0.22 * k;
      break;
    case 'relaxed':
      base.smile = 0.28 * k;
      break;
    case 'playful':
      base.smile = 0.5 * k;
      base.poutKiss = 0.65 * k;
      base.winkLeft = 0.4 * k;
      break;
    case 'neutral':
    default:
      break;
  }

  return base;
}

/**
 * Wardrobe layering rule:
 * - Selecting a dress clears conflicting top/bottom separates (preserving outerwear/shoes).
 * - Selecting a top or bottom clears an active dress while keeping the other separate.
 */
export function applyGarmentSelection(
  look: LookCustomization,
  slot: 'dress' | 'top' | 'bottom' | 'outerwear' | 'shoes',
  selection: GarmentSelection | null,
): LookCustomization {
  const next: LookCustomization = { ...look };
  if (slot === 'dress') {
    next.dress = selection;
    if (selection) {
      next.top = null;
      next.bottom = null;
    }
  } else if (slot === 'top') {
    next.top = selection;
    if (selection) {
      next.dress = null;
    }
  } else if (slot === 'bottom') {
    next.bottom = selection;
    if (selection) {
      next.dress = null;
    }
  } else if (slot === 'outerwear') {
    next.outerwear = selection;
  } else if (slot === 'shoes') {
    next.shoes = selection;
  }
  return next;
}

/**
 * Client-side pre-validation before sending 4 photos to the AI backend.
 */
export function validatePhotoSetClient(
  photos: Partial<Record<'front' | 'left_3_4' | 'right_3_4' | 'side_profile', UploadedPhoto>>,
  consentConfirmed: boolean,
): { ready: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredSlots: Array<{ key: 'front' | 'left_3_4' | 'right_3_4' | 'side_profile'; label: string }> = [
    { key: 'front', label: 'Front-facing photograph' },
    { key: 'left_3_4', label: 'Left three-quarter angle' },
    { key: 'right_3_4', label: 'Right three-quarter angle' },
    { key: 'side_profile', label: 'Side-profile photograph' },
  ];

  for (const item of requiredSlots) {
    const photo = photos[item.key];
    if (!photo) {
      errors.push(`Missing required photo: ${item.label}.`);
    } else if (photo.width < 200 || photo.height < 200) {
      errors.push(`${item.label} resolution is too low (${photo.width}x${photo.height}). Minimum 200x200px required.`);
    }
  }

  if (!consentConfirmed) {
    errors.push('Please confirm that you have permission to use the uploaded person’s photographs.');
  }

  return {
    ready: errors.length === 0,
    errors,
  };
}

/**
 * Evaluates a character's current look against a Fashion Challenge.
 */
export function evaluateChallengeLook(
  look: LookCustomization,
  challenge: FashionChallenge,
): ChallengeEvaluation {
  const equippedIds = [
    look.dress?.id,
    look.top?.id,
    look.bottom?.id,
    look.outerwear?.id,
    look.shoes?.id,
    look.hair.styleId,
    look.jewelry.necklaceId,
    look.jewelry.earringsId,
    look.jewelry.braceletId,
    look.jewelry.ringId,
    look.jewelry.watchId,
    look.jewelry.ankletId,
    look.accessories.bagId,
    look.accessories.glassesId,
    look.accessories.hatId,
    look.accessories.hairAccessoryId,
    look.accessories.beltId,
    look.accessories.glovesId,
    look.beautyPropId,
  ].filter(Boolean) as string[];

  const equippedItems = equippedIds
    .map((id) => WARDROBE_CATALOG.find((c) => c.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const tagCounts = new Map<string, number>();
  for (const item of equippedItems) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const matchedCriteria: string[] = [];
  const missingCriteria: string[] = [];
  let score = 35;

  let themeHits = 0;
  for (const reqTag of challenge.requiredTags) {
    themeHits += tagCounts.get(reqTag) ?? 0;
  }

  if (themeHits >= 3) {
    score += 35;
    matchedCriteria.push(`Strong theme synergy (${themeHits} coordinated pieces)`);
  } else if (themeHits >= 1) {
    score += 18;
    matchedCriteria.push(`Partial theme alignment (${themeHits} themed piece${themeHits > 1 ? 's' : ''})`);
  } else {
    missingCriteria.push(`Add pieces matching: ${challenge.requiredTags.join(', ')}`);
  }

  const { bonusRequirements } = challenge;
  if (bonusRequirements.requireDress) {
    if (look.dress) {
      score += 15;
      matchedCriteria.push('Signature dress equipped');
    } else {
      missingCriteria.push('Equip a dress or evening gown');
    }
  }

  if (bonusRequirements.requireHeels) {
    const shoe = WARDROBE_CATALOG.find((c) => c.id === look.shoes?.id);
    if (shoe && (shoe.heelHeight ?? 0) >= 0.08) {
      score += 10;
      matchedCriteria.push('Elevated heels selected');
    } else {
      missingCriteria.push('Pair the look with high heels or heeled boots');
    }
  }

  if (bonusRequirements.requireNailDesign) {
    if (look.nails.uniformStyle.design === bonusRequirements.requireNailDesign) {
      score += 15;
      matchedCriteria.push(`Custom ${bonusRequirements.requireNailDesign} nail art`);
    } else {
      missingCriteria.push(`Apply ${bonusRequirements.requireNailDesign} nail art in the Nail Salon`);
    }
  }

  if (bonusRequirements.requireBeautyProp) {
    if (look.beautyPropId) {
      score += 10;
      matchedCriteria.push('Beauty prop held in hand');
    } else {
      missingCriteria.push('Equip a beauty or skincare prop');
    }
  }

  if (bonusRequirements.minMakeupIntensity !== undefined) {
    const avgMakeup = (look.makeup.eyeshadowIntensity + look.makeup.lipIntensity + look.makeup.blushIntensity) / 3;
    if (avgMakeup >= bonusRequirements.minMakeupIntensity) {
      score += 10;
      matchedCriteria.push('Coordinated makeup glamour');
    } else {
      missingCriteria.push('Increase makeup color intensity in Makeup Studio');
    }
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  const passed = finalScore >= 70;
  return {
    score: finalScore,
    passed,
    matchedCriteria,
    missingCriteria,
    earnedCoins: passed ? challenge.rewardCoins : Math.round(challenge.rewardCoins * 0.25),
    earnedXp: passed ? challenge.rewardXp : Math.round(challenge.rewardXp * 0.3),
  };
}

export function getStylistLevel(xp: number): { level: number; title: string; nextLevelXp: number; progressPct: number } {
  const thresholds = [
    { xp: 0, title: 'Atelier Apprentice' },
    { xp: 150, title: 'Junior Stylist' },
    { xp: 400, title: 'Couture Curator' },
    { xp: 800, title: 'Parisian Runway Director' },
    { xp: 1400, title: 'Grand Maison Icon' },
  ];
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i].xp) idx = i;
  }
  const current = thresholds[idx];
  const next = thresholds[idx + 1];
  if (!next) {
    return { level: idx + 1, title: current.title, nextLevelXp: current.xp, progressPct: 100 };
  }
  const span = next.xp - current.xp;
  const progressPct = clamp(Math.round(((xp - current.xp) / span) * 100), 0, 100);
  return { level: idx + 1, title: current.title, nextLevelXp: next.xp, progressPct };
}
