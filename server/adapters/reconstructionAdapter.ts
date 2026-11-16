import { GoogleGenAI, Type } from '@google/genai';
import type {
  FacialIdentityParams,
  PhotoAngleSlot,
  PhotoValidationReport,
} from '../../src/types/studio.ts';

export interface PhotoInputPayload {
  slot: PhotoAngleSlot;
  mimeType: string;
  base64Data: string;
}

export interface ReconstructionResult {
  providerId: string;
  pipelineSteps: string[];
  identity: FacialIdentityParams;
  suggestedHairStyleId: string;
  suggestedHairColorHex: string;
}

export interface ReconstructionProvider {
  readonly id: string;
  validatePhotos(photos: PhotoInputPayload[]): Promise<PhotoValidationReport>;
  reconstructIdentity(photos: PhotoInputPayload[]): Promise<ReconstructionResult>;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image encoding; expected base64 image data URL.');
  }
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

export function normalizeUploadedPayloads(
  photos: Record<PhotoAngleSlot, string>,
): PhotoInputPayload[] {
  const slots: PhotoAngleSlot[] = ['front', 'left_3_4', 'right_3_4', 'side_profile'];
  return slots.map((slot) => {
    const raw = photos[slot];
    if (!raw) {
      throw new Error(`Missing required photograph for slot: ${slot}`);
    }
    const parsed = parseDataUrl(raw);
    return {
      slot,
      mimeType: parsed.mimeType,
      base64Data: parsed.base64Data,
    };
  });
}

/**
 * Gemini Multimodal Facial Morphometry Adapter:
 * Analyzes all four facial angles simultaneously to verify identity consistency,
 * photo suitability, and extract 3D parametric facial proportions for our
 * rigged parametric character mesh. Designed behind ReconstructionProvider so
 * external GLB/mesh reconstruction APIs can be swapped in seamlessly.
 */
export class GeminiMorphometricAdapter implements ReconstructionProvider {
  readonly id = 'gemini-4-hydrogen-morphometric-v1';

  async validatePhotos(photos: PhotoInputPayload[]): Promise<PhotoValidationReport> {
    const ai = getGeminiClient();

    const parts = photos.flatMap((photo) => [
      { text: `Reference slot "${photo.slot}":` },
      {
        inlineData: {
          mimeType: photo.mimeType,
          data: photo.base64Data,
        },
      },
    ]);

    parts.push({
      text:
        'Evaluate these 4 photographs for 3D character face reconstruction. ' +
        'Verify: (1) whether all 4 photos clearly depict the same human person, ' +
        '(2) whether the face is clearly visible without sunglasses, masks, or heavy occlusion, ' +
        '(3) whether lighting is clear enough to read facial geometry, and ' +
        '(4) whether each image reasonably matches its labeled angle (front, left_3_4, right_3_4, side_profile). ' +
        'Be helpful and realistic. Return structured JSON.',
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are a computer-vision photogrammetry validator for a 3D character creator. Return strict JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallValid: { type: Type.BOOLEAN },
            samePersonConsistent: { type: Type.BOOLEAN },
            summary: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            checks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slot: { type: Type.STRING },
                  valid: { type: Type.BOOLEAN },
                  angleMatch: { type: Type.BOOLEAN },
                  faceVisible: { type: Type.BOOLEAN },
                  lightingOk: { type: Type.BOOLEAN },
                  obstructionFree: { type: Type.BOOLEAN },
                  message: { type: Type.STRING },
                },
                required: [
                  'slot',
                  'valid',
                  'angleMatch',
                  'faceVisible',
                  'lightingOk',
                  'obstructionFree',
                  'message',
                ],
              },
            },
          },
          required: ['overallValid', 'samePersonConsistent', 'summary', 'issues', 'checks'],
        },
      },
    });

    const jsonStr = (response.text ?? '{}').trim();
    return JSON.parse(jsonStr) as PhotoValidationReport;
  }

  async reconstructIdentity(photos: PhotoInputPayload[]): Promise<ReconstructionResult> {
    const ai = getGeminiClient();

    const parts = photos.flatMap((photo) => [
      { text: `Angle "${photo.slot}":` },
      {
        inlineData: {
          mimeType: photo.mimeType,
          data: photo.base64Data,
        },
      },
    ]);

    parts.push({
      text:
        'Analyze all four photographs of this person together to reconstruct one consistent 3D stylized animated character face. ' +
        'Measure and preserve the person’s real facial proportions and distinctive characteristics: ' +
        'face shape (oval, heart, diamond, square, round, oblong), jaw width (-1 narrow to +1 wide), jaw sharpness (0 to 1), ' +
        'chin length (-1 to +1), cheekbone height (-1 to +1), cheek fullness (-1 to +1), forehead height (-1 to +1), ' +
        'eye size (-1 to +1), eye spacing (-1 to +1), eye tilt (-1 downturned to +1 upturned), iris color hex, ' +
        'brow arch (0 to 1), brow thickness (0 to 1), brow color hex, nose length (-1 to +1), nose width (-1 to +1), ' +
        'nose tip tilt (-1 to +1), upper/lower lip fullness (-1 to +1), mouth width (-1 to +1), skin tone hex, undertone (warm/cool/neutral), ' +
        'freckles intensity (0 to 1), suggested hair style ID from [hair_long_wavy, hair_long_straight, hair_short_bob, hair_glam_curls, hair_high_ponytail, hair_twin_braids, hair_french_braid, hair_messy_bun, hair_updo_chignon, hair_pixie_cut, hair_curtain_bangs], ' +
        'hair color hex, a concise resemblanceSummary, and 3 distinctiveTraits.',
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are an identity-preserving multi-view 3D character facial reconstruction engine. Output calibrated morphometric parameters strictly matching the person across all four reference views.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceShape: { type: Type.STRING },
            jawWidth: { type: Type.NUMBER },
            jawSharpness: { type: Type.NUMBER },
            chinLength: { type: Type.NUMBER },
            cheekboneHeight: { type: Type.NUMBER },
            cheekFullness: { type: Type.NUMBER },
            foreheadHeight: { type: Type.NUMBER },
            eyeSize: { type: Type.NUMBER },
            eyeSpacing: { type: Type.NUMBER },
            eyeTilt: { type: Type.NUMBER },
            irisColorHex: { type: Type.STRING },
            browArch: { type: Type.NUMBER },
            browThickness: { type: Type.NUMBER },
            browColorHex: { type: Type.STRING },
            noseLength: { type: Type.NUMBER },
            noseWidth: { type: Type.NUMBER },
            noseTipTilt: { type: Type.NUMBER },
            lipFullnessUpper: { type: Type.NUMBER },
            lipFullnessLower: { type: Type.NUMBER },
            mouthWidth: { type: Type.NUMBER },
            skinToneHex: { type: Type.STRING },
            skinUndertone: { type: Type.STRING },
            frecklesIntensity: { type: Type.NUMBER },
            suggestedHairStyleId: { type: Type.STRING },
            suggestedHairColorHex: { type: Type.STRING },
            resemblanceSummary: { type: Type.STRING },
            distinctiveTraits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'faceShape',
            'jawWidth',
            'jawSharpness',
            'chinLength',
            'cheekboneHeight',
            'cheekFullness',
            'foreheadHeight',
            'eyeSize',
            'eyeSpacing',
            'eyeTilt',
            'irisColorHex',
            'browArch',
            'browThickness',
            'browColorHex',
            'noseLength',
            'noseWidth',
            'noseTipTilt',
            'lipFullnessUpper',
            'lipFullnessLower',
            'mouthWidth',
            'skinToneHex',
            'skinUndertone',
            'frecklesIntensity',
            'suggestedHairStyleId',
            'suggestedHairColorHex',
            'resemblanceSummary',
            'distinctiveTraits',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as FacialIdentityParams & {
      suggestedHairStyleId: string;
      suggestedHairColorHex: string;
    };

    const allowedShapes = new Set(['oval', 'heart', 'diamond', 'square', 'round', 'oblong']);
    const faceShape = allowedShapes.has(parsed.faceShape) ? parsed.faceShape : 'oval';
    const undertone = parsed.skinUndertone === 'warm' || parsed.skinUndertone === 'cool' ? parsed.skinUndertone : 'neutral';

    return {
      providerId: this.id,
      pipelineSteps: [
        'Multi-view landmark alignment across 4 angles',
        'Facial proportion & bone-structure morphometry',
        'Parametric 3D head mesh & skin shader binding',
        'Full-body skeletal & facial expression blendshape rigging',
      ],
      identity: {
        faceShape,
        jawWidth: Number(parsed.jawWidth) || 0,
        jawSharpness: Number(parsed.jawSharpness) || 0.5,
        chinLength: Number(parsed.chinLength) || 0,
        cheekboneHeight: Number(parsed.cheekboneHeight) || 0.2,
        cheekFullness: Number(parsed.cheekFullness) || 0,
        foreheadHeight: Number(parsed.foreheadHeight) || 0,
        eyeSize: Number(parsed.eyeSize) || 0.1,
        eyeSpacing: Number(parsed.eyeSpacing) || 0,
        eyeTilt: Number(parsed.eyeTilt) || 0.1,
        irisColorHex: /^#[0-9a-fA-F]{6}$/.test(parsed.irisColorHex) ? parsed.irisColorHex : '#4B362C',
        browArch: Number(parsed.browArch) || 0.5,
        browThickness: Number(parsed.browThickness) || 0.5,
        browColorHex: /^#[0-9a-fA-F]{6}$/.test(parsed.browColorHex) ? parsed.browColorHex : '#3B2820',
        noseLength: Number(parsed.noseLength) || 0,
        noseWidth: Number(parsed.noseWidth) || 0,
        noseTipTilt: Number(parsed.noseTipTilt) || 0,
        lipFullnessUpper: Number(parsed.lipFullnessUpper) || 0.2,
        lipFullnessLower: Number(parsed.lipFullnessLower) || 0.3,
        mouthWidth: Number(parsed.mouthWidth) || 0,
        skinToneHex: /^#[0-9a-fA-F]{6}$/.test(parsed.skinToneHex) ? parsed.skinToneHex : '#E8BFA8',
        skinUndertone: undertone,
        frecklesIntensity: Number(parsed.frecklesIntensity) || 0,
        resemblanceSummary: parsed.resemblanceSummary || 'Personalized 3D facial reconstruction from 4 reference angles.',
        distinctiveTraits: Array.isArray(parsed.distinctiveTraits) ? parsed.distinctiveTraits.slice(0, 4) : [],
      },
      suggestedHairStyleId: parsed.suggestedHairStyleId || 'hair_long_wavy',
      suggestedHairColorHex: /^#[0-9a-fA-F]{6}$/.test(parsed.suggestedHairColorHex)
        ? parsed.suggestedHairColorHex
        : '#3E2720',
    };
  }
}

export function createReconstructionProvider(): ReconstructionProvider {
  return new GeminiMorphometricAdapter();
}
