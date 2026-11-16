export type AppView = 'home' | 'creator' | 'studio' | 'characters' | 'looks' | 'challenges';

export type PhotoAngleSlot = 'front' | 'left_3_4' | 'right_3_4' | 'side_profile';

export interface PhotoCropConfig {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface UploadedPhoto {
  slot: PhotoAngleSlot;
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  crop: PhotoCropConfig;
}

export interface PhotoCheckItem {
  slot: PhotoAngleSlot;
  valid: boolean;
  angleMatch: boolean;
  faceVisible: boolean;
  lightingOk: boolean;
  obstructionFree: boolean;
  message: string;
}

export interface PhotoValidationReport {
  overallValid: boolean;
  samePersonConsistent: boolean;
  summary: string;
  issues: string[];
  checks: PhotoCheckItem[];
}

export type FaceShape = 'oval' | 'heart' | 'diamond' | 'square' | 'round' | 'oblong';
export type BodyPreset = 'petite' | 'slender' | 'athletic' | 'curvy' | 'runway';
export type HeightPreset = 'petite' | 'standard' | 'tall';

export interface FacialIdentityParams {
  faceShape: FaceShape;
  jawWidth: number;       // -1 (narrow) to +1 (wide)
  jawSharpness: number;   // 0 to 1
  chinLength: number;     // -1 to +1
  cheekboneHeight: number;// -1 to +1
  cheekFullness: number;  // -1 to +1
  foreheadHeight: number; // -1 to +1
  eyeSize: number;        // -1 to +1
  eyeSpacing: number;     // -1 to +1
  eyeTilt: number;        // -1 (downturned) to +1 (upturned)
  irisColorHex: string;
  browArch: number;       // 0 to 1
  browThickness: number;  // 0 to 1
  browColorHex: string;
  noseLength: number;     // -1 to +1
  noseWidth: number;      // -1 to +1
  noseTipTilt: number;    // -1 to +1
  lipFullnessUpper: number; // -1 to +1
  lipFullnessLower: number; // -1 to +1
  mouthWidth: number;     // -1 to +1
  skinToneHex: string;
  skinUndertone: 'warm' | 'cool' | 'neutral';
  frecklesIntensity: number; // 0 to 1
  resemblanceSummary: string;
  distinctiveTraits: string[];
}

export interface BodyConfig {
  preset: BodyPreset;
  height: HeightPreset;
  shoulderScale: number;
  waistScale: number;
  hipScale: number;
}

export type FabricFinish = 'matte' | 'silk' | 'satin' | 'velvet' | 'denim' | 'leather' | 'sequin';

export interface GarmentSelection {
  id: string;
  color: string;
  secondaryColor?: string;
  finish: FabricFinish;
}

export type HairEffect = 'solid' | 'highlights' | 'ombre' | 'two_tone';

export interface HairConfig {
  styleId: string;
  primaryColor: string;
  secondaryColor: string;
  effect: HairEffect;
}

export type EyebrowShape = 'natural' | 'arched' | 'thin' | 'thick';
export type SkinFinish = 'matte' | 'satin' | 'dewy';
export type LipFinish = 'matte' | 'satin' | 'gloss' | 'ombre';

export interface MakeupConfig {
  eyeshadowColor: string;
  eyeshadowIntensity: number;
  glitterEyeshadow: boolean;
  eyelinerStyle: 'none' | 'classic' | 'winged' | 'smoky';
  eyelinerColor: string;
  mascaraIntensity: number;
  lashStyle: 'natural' | 'wispy' | 'dramatic' | 'doll';
  eyebrowShape: EyebrowShape;
  eyebrowColor: string;
  foundationCoverage: number;
  skinFinish: SkinFinish;
  blushColor: string;
  blushIntensity: number;
  contourIntensity: number;
  bronzerIntensity: number;
  highlighterIntensity: number;
  frecklesIntensity: number;
  lipColor: string;
  lipSecondaryColor: string;
  lipFinish: LipFinish;
  lipIntensity: number;
  lipLiner: boolean;
}

export type NailShape = 'square' | 'round' | 'oval' | 'almond' | 'coffin' | 'stiletto';
export type NailLength = 'short' | 'medium' | 'long' | 'extra_long';
export type NailDesign =
  | 'solid'
  | 'french'
  | 'glitter'
  | 'chrome'
  | 'marble'
  | 'floral'
  | 'hearts'
  | 'butterfly'
  | 'rhinestones'
  | 'ombre';

export interface SingleNailStyle {
  color: string;
  secondaryColor: string;
  design: NailDesign;
  gems: boolean;
}

export type NailFingerKey =
  | 'L_Thumb' | 'L_Index' | 'L_Middle' | 'L_Ring' | 'L_Pinky'
  | 'R_Thumb' | 'R_Index' | 'R_Middle' | 'R_Ring' | 'R_Pinky';

export interface NailConfig {
  shape: NailShape;
  length: NailLength;
  applyToAll: boolean;
  activeFinger: NailFingerKey;
  uniformStyle: SingleNailStyle;
  perFinger: Record<NailFingerKey, SingleNailStyle>;
  toenailsColor: string;
  toenailsDesign: NailDesign;
}

export interface JewelrySelection {
  necklaceId: string | null;
  earringsId: string | null;
  braceletId: string | null;
  ringId: string | null;
  watchId: string | null;
  ankletId: string | null;
  metalColor: string;
}

export interface AccessoriesSelection {
  bagId: string | null;
  bagColor: string;
  glassesId: string | null;
  glassesColor: string;
  hatId: string | null;
  hatColor: string;
  hairAccessoryId: string | null;
  hairAccessoryColor: string;
  scarfId: string | null;
  beltId: string | null;
  glovesId: string | null;
}

export type ExpressionId =
  | 'neutral'
  | 'happy'
  | 'smiling'
  | 'laughing'
  | 'winking'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'confident'
  | 'relaxed'
  | 'playful';

export type AnimationId =
  | 'idle'
  | 'walking'
  | 'turning'
  | 'runway'
  | 'posing'
  | 'waving'
  | 'dancing'
  | 'blow_kiss'
  | 'show_outfit'
  | 'show_jewelry'
  | 'show_hair';

export type CameraPresetId =
  | 'full_body'
  | 'portrait'
  | 'side_profile'
  | 'back_view'
  | 'manicure'
  | 'shoes';

export type BackgroundId =
  | 'luxury_studio'
  | 'pink_dressing_room'
  | 'paris_street'
  | 'fashion_runway'
  | 'beach_sunset'
  | 'princess_castle'
  | 'modern_apartment'
  | 'garden'
  | 'wedding_venue'
  | 'red_carpet';

export type LightingPresetId = 'studio_soft' | 'golden_hour' | 'runway_spot' | 'candlelight';

export interface LookCustomization {
  dress: GarmentSelection | null;
  top: GarmentSelection | null;
  bottom: GarmentSelection | null;
  outerwear: GarmentSelection | null;
  shoes: GarmentSelection | null;
  hair: HairConfig;
  makeup: MakeupConfig;
  nails: NailConfig;
  jewelry: JewelrySelection;
  accessories: AccessoriesSelection;
  beautyPropId: string | null;
  expression: ExpressionId;
  expressionIntensity: number;
  animation: AnimationId;
  background: BackgroundId;
  lighting: LightingPresetId;
  lightingIntensity: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
  source: 'ai_photos' | 'preset';
  createdAt: string;
  avatarBadgeColor: string;
  referenceThumbnails?: Partial<Record<PhotoAngleSlot, string>>;
  consentConfirmed: boolean;
  identity: FacialIdentityParams;
  body: BodyConfig;
  currentLook: LookCustomization;
}

export interface SavedLook {
  id: string;
  characterId: string;
  name: string;
  createdAt: string;
  tags: string[];
  customization: LookCustomization;
}

export interface CatalogItem {
  id: string;
  name: string;
  category:
    | 'dresses'
    | 'tops'
    | 'bottoms'
    | 'outerwear'
    | 'shoes'
    | 'hairstyles'
    | 'jewelry'
    | 'accessories'
    | 'beauty_props';
  subType: string;
  defaultColor: string;
  defaultSecondaryColor?: string;
  defaultFinish?: FabricFinish;
  heelHeight?: number;
  tags: string[];
  priceCoins?: number;
  collectionId?: string;
}

export interface FashionCollection {
  id: string;
  name: string;
  subtitle: string;
  accentColor: string;
  tags: string[];
  lookPreset: Partial<LookCustomization>;
}

export interface FashionChallenge {
  id: string;
  title: string;
  category: 'daily' | 'makeup' | 'nails' | 'styling' | 'theme';
  description: string;
  requiredTags: string[];
  bonusRequirements: {
    requireDress?: boolean;
    requireHeels?: boolean;
    requireNailDesign?: NailDesign;
    requireBeautyProp?: boolean;
    minMakeupIntensity?: number;
  };
  rewardCoins: number;
  rewardXp: number;
  badgeTitle: string;
}

export interface ChallengeEvaluation {
  score: number;
  passed: boolean;
  matchedCriteria: string[];
  missingCriteria: string[];
  earnedCoins: number;
  earnedXp: number;
}

export type StudioCategoryId =
  | 'collections'
  | 'dresses'
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'shoes'
  | 'hairstyles'
  | 'makeup'
  | 'nails'
  | 'jewelry'
  | 'accessories'
  | 'beauty_props'
  | 'expressions'
  | 'backgrounds';
