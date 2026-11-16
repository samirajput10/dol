import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Crop,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DEFAULT_LOOK } from '../data/catalog';
import { useStudioStore } from '../store/useStudioStore';
import { DollViewport, type DollViewportHandle } from '../three/DollViewport';
import type {
  BodyConfig,
  BodyPreset,
  CameraPresetId,
  CharacterProfile,
  FacialIdentityParams,
  HeightPreset,
  PhotoAngleSlot,
  PhotoCropConfig,
  PhotoValidationReport,
  UploadedPhoto,
} from '../types/studio';
import { validatePhotoSetClient } from '../utils/studioLogic';

const PHOTO_SLOTS: Array<{
  slot: PhotoAngleSlot;
  title: string;
  subtitle: string;
}> = [
  { slot: 'front', title: '1. Front-Facing', subtitle: 'Looking straight at camera, neutral face' },
  { slot: 'left_3_4', title: '2. Left Three-Quarter', subtitle: 'Head turned ~35° to your left' },
  { slot: 'right_3_4', title: '3. Right Three-Quarter', subtitle: 'Head turned ~35° to your right' },
  { slot: 'side_profile', title: '4. Side Profile', subtitle: 'Clean 90° profile silhouette' },
];

function AngleGuideSvg({ slot }: { slot: PhotoAngleSlot }) {
  const noseOffset =
    slot === 'front' ? 0 : slot === 'left_3_4' ? -8 : slot === 'right_3_4' ? 8 : 16;
  const eyeLeftX = slot === 'side_profile' ? 28 : 18 + noseOffset * 0.6;
  const eyeRightX = slot === 'side_profile' ? 28 : 34 + noseOffset * 0.6;
  return (
    <svg viewBox="0 0 52 52" className="w-11 h-11 text-[#9A4B69]" aria-hidden="true">
      <circle cx="26" cy="24" r="16" fill="#F7ECF0" stroke="currentColor" strokeWidth="1.5" />
      {slot !== 'side_profile' && (
        <circle cx={eyeLeftX} cy="22" r="1.8" fill="currentColor" />
      )}
      <circle cx={eyeRightX} cy="22" r="1.8" fill="currentColor" />
      <path
        d={`M ${26 + noseOffset} 22 L ${26 + noseOffset * 1.2} 29`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={`M ${21 + noseOffset * 0.7} 33 Q ${26 + noseOffset * 0.8} 35 ${31 + noseOffset * 0.7} 33`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function applyCropToDataUrl(photo: UploadedPhoto): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      const scale = Math.max(size / img.width, size / img.height) * photo.crop.zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = (size - drawW) / 2 + photo.crop.offsetX * 1.8;
      const dy = (size - drawH) / 2 + photo.crop.offsetY * 1.8;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = photo.dataUrl;
  });
}

export function CharacterCreatorView() {
  const addGeneratedCharacter = useStudioStore((s) => s.addGeneratedCharacter);
  const showToast = useStudioStore((s) => s.showToast);

  const [photos, setPhotos] = useState<Partial<Record<PhotoAngleSlot, UploadedPhoto>>>({});
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [validationReport, setValidationReport] = useState<PhotoValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Cropper Modal State
  const [croppingSlot, setCroppingSlot] = useState<PhotoAngleSlot | null>(null);
  const [draftCrop, setDraftCrop] = useState<PhotoCropConfig>({ zoom: 1, offsetX: 0, offsetY: 0 });

  // Generated Character Preview State
  const [generatedIdentity, setGeneratedIdentity] = useState<FacialIdentityParams | null>(null);
  const [characterName, setCharacterName] = useState('My Custom Doll');
  const [bodyConfig, setBodyConfig] = useState<BodyConfig>({
    preset: 'slender',
    height: 'standard',
    shoulderScale: 1.0,
    waistScale: 0.96,
    hipScale: 1.0,
  });
  const [previewHairId, setPreviewHairId] = useState('hair_long_wavy');
  const [previewHairColor, setPreviewHairColor] = useState('#4A2E23');
  const [previewCam, setPreviewCam] = useState<CameraPresetId>('portrait');
  const [showAppearanceTune, setShowAppearanceTune] = useState(false);

  const viewportRef = useRef<DollViewportHandle | null>(null);

  const handleFileSelected = (slot: PhotoAngleSlot, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setClientErrors(['Please upload a valid PNG, JPEG, or WebP photograph.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setPhotos((prev) => ({
          ...prev,
          [slot]: {
            slot,
            dataUrl,
            fileName: file.name,
            width: img.width,
            height: img.height,
            crop: { zoom: 1, offsetX: 0, offsetY: 0 },
          },
        }));
        setClientErrors([]);
        setValidationReport(null);
        setApiError(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const applyBodyPreset = (preset: BodyPreset) => {
    const map: Record<BodyPreset, { shoulder: number; waist: number; hip: number }> = {
      petite: { shoulder: 0.94, waist: 0.92, hip: 0.95 },
      slender: { shoulder: 0.98, waist: 0.94, hip: 0.98 },
      athletic: { shoulder: 1.06, waist: 0.98, hip: 1.0 },
      curvy: { shoulder: 1.0, waist: 0.92, hip: 1.14 },
      runway: { shoulder: 1.02, waist: 0.93, hip: 1.0 },
    };
    const dims = map[preset];
    setBodyConfig((prev) => ({
      ...prev,
      preset,
      shoulderScale: dims.shoulder,
      waistScale: dims.waist,
      hipScale: dims.hip,
    }));
  };

  const applyHeightPreset = (height: HeightPreset) => {
    setBodyConfig((prev) => ({ ...prev, height }));
  };

  const prepareCroppedPayload = async (): Promise<Record<PhotoAngleSlot, string>> => {
    return {
      front: await applyCropToDataUrl(photos.front!),
      left_3_4: await applyCropToDataUrl(photos.left_3_4!),
      right_3_4: await applyCropToDataUrl(photos.right_3_4!),
      side_profile: await applyCropToDataUrl(photos.side_profile!),
    };
  };

  const handleValidatePhotos = async () => {
    setApiError(null);
    const check = validatePhotoSetClient(photos, consentConfirmed);
    setClientErrors(check.errors);
    if (!check.ready) return;

    setIsValidating(true);
    try {
      const payloadPhotos = await prepareCroppedPayload();
      const res = await fetch('/api/characters/validate-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payloadPhotos, consentConfirmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Photo validation failed.');
      }
      setValidationReport(data as PhotoValidationReport);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to validate photographs.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateCharacter = async () => {
    setApiError(null);
    const check = validatePhotoSetClient(photos, consentConfirmed);
    setClientErrors(check.errors);
    if (!check.ready) return;

    setIsGenerating(true);
    setGenerationStep('Aligning four facial camera angles...');
    try {
      const payloadPhotos = await prepareCroppedPayload();
      const stepTimer = window.setTimeout(() => {
        setGenerationStep('Analyzing facial proportions & bone structure...');
      }, 1200);
      const stepTimer2 = window.setTimeout(() => {
        setGenerationStep('Rigging 3D head mesh, facial blendshapes & full skeleton...');
      }, 2400);

      const res = await fetch('/api/characters/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payloadPhotos, consentConfirmed }),
      });
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI character reconstruction failed.');
      }

      setGeneratedIdentity(data.identity as FacialIdentityParams);
      setPreviewHairId(data.suggestedHairStyleId || 'hair_long_wavy');
      setPreviewHairColor(data.suggestedHairColorHex || '#4A2E23');
      setPreviewCam('portrait');
      showToast('Personalized 3D character generated!');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to generate character.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const buildCharacterProfile = (): CharacterProfile => {
    return {
      id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: characterName.trim() || 'My Custom Doll',
      source: 'ai_photos',
      createdAt: new Date().toISOString().slice(0, 10),
      avatarBadgeColor: generatedIdentity?.skinToneHex || '#E8BFA8',
      referenceThumbnails: photos.front ? { front: photos.front.dataUrl } : undefined,
      consentConfirmed,
      identity: generatedIdentity!,
      body: bodyConfig,
      currentLook: {
        ...structuredClone(DEFAULT_LOOK),
        hair: {
          styleId: previewHairId,
          primaryColor: previewHairColor,
          secondaryColor: previewHairColor,
          effect: 'solid',
        },
        makeup: {
          ...DEFAULT_LOOK.makeup,
          eyebrowColor: generatedIdentity?.browColorHex || '#3B2820',
          frecklesIntensity: generatedIdentity?.frecklesIntensity || 0,
        },
      },
    };
  };

  const previewLook = generatedIdentity
    ? {
        ...structuredClone(DEFAULT_LOOK),
        hair: {
          styleId: previewHairId,
          primaryColor: previewHairColor,
          secondaryColor: previewHairColor,
          effect: 'solid' as const,
        },
        makeup: {
          ...DEFAULT_LOOK.makeup,
          eyebrowColor: generatedIdentity.browColorHex,
          frecklesIntensity: generatedIdentity.frecklesIntensity,
        },
        expression: 'neutral' as const,
        expressionIntensity: 0.3,
        animation: 'idle' as const,
      }
    : structuredClone(DEFAULT_LOOK);

  return (
    <main className="flex-1 overflow-y-auto studio-scroll bg-[#FCF9F7] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="pb-6 border-b border-[#EADCE3] flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#9A4B69]">Create Your Own Character</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#231924] mt-1">
              AI Four-Angle Photo-to-3D Character Generator
            </h1>
            <p className="text-sm text-[#5E4D58] mt-1.5 max-w-2xl">
              Upload four clear photographs of the same person across front, three-quarter, and side-profile views. Our multi-view AI morphometry engine reconstructs a unified, rigged 3D character preserving their recognizable facial features.
            </p>
          </div>
          {generatedIdentity && (
            <button
              type="button"
              onClick={() => {
                setGeneratedIdentity(null);
                setValidationReport(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EADCE3] bg-white text-xs font-semibold text-[#231924] hover:bg-[#F7ECF0]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Create Another Character
            </button>
          )}
        </div>

        {/* STAGE 1: FOUR-PHOTO UPLOAD & VALIDATION */}
        {!generatedIdentity ? (
          <div className="mt-8 space-y-6">
            {/* Best Practices Strip */}
            <div className="rounded-2xl bg-[#F7ECF0] border border-[#EADCE3] px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#4F3E49]">
              <div className="font-semibold text-[#231924]">Photo Guidelines for Best Resemblance:</div>
              <div>Natural daylight · Neutral expression · No beauty filters · No sunglasses or masks · Unobstructed face</div>
            </div>

            {/* 4 Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PHOTO_SLOTS.map(({ slot, title, subtitle }) => {
                const uploaded = photos[slot];
                const slotCheck = validationReport?.checks.find((c) => c.slot === slot);

                return (
                  <div
                    key={slot}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileSelected(slot, e.dataTransfer.files?.[0]);
                    }}
                    className={`rounded-2xl bg-white border p-4 flex flex-col justify-between transition-colors ${
                      slotCheck && !slotCheck.valid
                        ? 'border-[#C84B78]'
                        : uploaded
                          ? 'border-[#C49A6C]'
                          : 'border-[#EADCE3]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-[#231924]">{title}</h2>
                        {slotCheck && (
                          <span className={`text-xs font-medium ${slotCheck.valid ? 'text-[#2E5D43]' : 'text-[#B8395F]'}`}>
                            {slotCheck.valid ? 'Pass' : 'Check'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6A5764] mb-3">{subtitle}</p>

                      {uploaded ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F7ECF0] border border-[#EADCE3]">
                          <img
                            src={uploaded.dataUrl}
                            alt={title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            style={{
                              transform: `scale(${uploaded.crop.zoom}) translate(${uploaded.crop.offsetX}px, ${uploaded.crop.offsetY}px)`,
                            }}
                          />
                        </div>
                      ) : (
                        <label className="aspect-square rounded-xl border border-dashed border-[#D5BAC6] bg-[#FCF9F7] hover:bg-[#F7ECF0] transition-colors flex flex-col items-center justify-center p-4 text-center cursor-pointer">
                          <AngleGuideSvg slot={slot} />
                          <span className="mt-2 text-xs font-semibold text-[#231924] inline-flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-[#C84B78]" aria-hidden="true" />
                            Upload or Drop Photo
                          </span>
                          <span className="text-[11px] text-[#7D6976] mt-1">Min 200x200px</span>
                          <input
                            type="file"
                            accept="image/*"
                            aria-label={`Upload ${title}`}
                            className="sr-only"
                            onChange={(e) => handleFileSelected(slot, e.target.files?.[0])}
                          />
                        </label>
                      )}

                      {slotCheck && (
                        <p className={`mt-2 text-[11px] ${slotCheck.valid ? 'text-[#2E5D43]' : 'text-[#B8395F]'}`}>
                          {slotCheck.message}
                        </p>
                      )}
                    </div>

                    {uploaded && (
                      <div className="mt-3 pt-3 border-t border-[#F2E8EE] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCroppingSlot(slot);
                            setDraftCrop({ ...uploaded.crop });
                          }}
                          className="text-xs font-medium text-[#231924] hover:text-[#C84B78] inline-flex items-center gap-1"
                        >
                          <Crop className="w-3.5 h-3.5" aria-hidden="true" />
                          Crop
                        </button>
                        <label className="text-xs font-medium text-[#6A5764] hover:text-[#231924] cursor-pointer">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => handleFileSelected(slot, e.target.files?.[0])}
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove ${title}`}
                          onClick={() => {
                            setPhotos((prev) => {
                              const next = { ...prev };
                              delete next[slot];
                              return next;
                            });
                            setValidationReport(null);
                          }}
                          className="text-xs font-medium text-[#9E455B] hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Consent & Privacy Box */}
            <div className="rounded-2xl bg-white border border-[#EADCE3] p-5 flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => {
                    setConsentConfirmed(e.target.checked);
                    setClientErrors([]);
                  }}
                  className="mt-1 w-4 h-4 accent-[#C84B78]"
                />
                <span className="text-xs text-[#4F3E49] leading-relaxed">
                  <strong className="text-[#231924]">Permission & Privacy Confirmation:</strong> I confirm that I have explicit permission to use the uploaded person’s photographs. Photographs are analyzed solely to generate this personalized 3D character, are never used to train external models, and can be deleted at any time from My Characters.
                </span>
              </label>

              {/* Validation & API Errors */}
              {clientErrors.length > 0 && (
                <div role="alert" className="rounded-xl bg-[#FDF0F3] border border-[#E8B8C7] p-3.5 space-y-1">
                  {clientErrors.map((err) => (
                    <p key={err} className="text-xs text-[#9E284A] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {apiError && (
                <div role="alert" className="rounded-xl bg-[#FDF0F3] border border-[#E8B8C7] p-3.5 text-xs text-[#9E284A]">
                  {apiError}
                </div>
              )}

              {validationReport && (
                <div
                  className={`rounded-xl p-4 border ${
                    validationReport.overallValid
                      ? 'bg-[#EEF6F1] border-[#BBDAC6] text-[#244D36]'
                      : 'bg-[#FDF0F3] border-[#E8B8C7] text-[#9E284A]'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    {validationReport.overallValid
                      ? 'All 4 photographs passed quality & identity consistency check.'
                      : 'Photo Quality Review Needed'}
                  </div>
                  <p className="text-xs mt-1">{validationReport.summary}</p>
                  {validationReport.issues.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-xs space-y-0.5">
                      {validationReport.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Primary Generation Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={isValidating || isGenerating}
                  onClick={handleValidatePhotos}
                  className="px-5 py-3 rounded-xl border border-[#D5BAC6] bg-[#FCF9F7] text-[#231924] text-xs font-semibold hover:bg-[#F7ECF0] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#C84B78]" aria-hidden="true" />
                  )}
                  Check Photo Quality
                </button>

                <button
                  type="button"
                  disabled={isGenerating || isValidating}
                  onClick={handleGenerateCharacter}
                  className="px-7 py-3.5 rounded-xl bg-[#C84B78] text-white text-sm font-semibold hover:bg-[#B23D67] disabled:opacity-60 inline-flex items-center gap-2.5 shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      {generationStep || 'Generating 3D Character...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      GENERATE MY 3D CHARACTER
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STAGE 2: GENERATED 3D CHARACTER PREVIEW & FULL-BODY SETUP */
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 rounded-2xl border border-[#EADCE3] bg-[#F7EEF2] overflow-hidden flex flex-col min-h-[540px]">
              <div className="px-4 py-3 bg-white border-b border-[#EADCE3] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(['portrait', 'full_body', 'side_profile', 'back_view'] as CameraPresetId[]).map((cam) => (
                    <button
                      key={cam}
                      type="button"
                      onClick={() => setPreviewCam(cam)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        previewCam === cam
                          ? 'bg-[#231924] text-white'
                          : 'bg-[#F7ECF0] text-[#5E4D58] hover:text-[#231924]'
                      }`}
                    >
                      {cam.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => viewportRef.current?.zoomBy(0.85)}
                    className="px-2.5 py-1 rounded-lg bg-[#F7ECF0] text-xs font-semibold"
                  >
                    Zoom +
                  </button>
                  <button
                    type="button"
                    onClick={() => viewportRef.current?.zoomBy(1.18)}
                    className="px-2.5 py-1 rounded-lg bg-[#F7ECF0] text-xs font-semibold"
                  >
                    Zoom -
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[460px]">
                <DollViewport
                  ref={viewportRef}
                  identity={generatedIdentity}
                  body={bodyConfig}
                  look={previewLook}
                  cameraPreset={previewCam}
                />
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-white border border-[#EADCE3] p-6 flex flex-col justify-between gap-5">
              <div className="space-y-5">
                <div>
                  <span className="text-xs font-medium text-[#2E5D43]">
                    Multi-View Facial Reconstruction Complete
                  </span>
                  <h2 className="font-display text-2xl font-semibold text-[#231924] mt-1">
                    Review & Configure Your Doll
                  </h2>
                  <p className="text-xs text-[#5E4D58] mt-1.5 leading-relaxed">
                    {generatedIdentity.resemblanceSummary}
                  </p>
                  {generatedIdentity.distinctiveTraits.length > 0 && (
                    <p className="text-xs text-[#7D6976] mt-1.5">
                      Preserved traits: {generatedIdentity.distinctiveTraits.join(' · ')}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="char-name-input" className="block text-xs font-semibold text-[#231924] mb-1.5">
                    Character Name
                  </label>
                  <input
                    id="char-name-input"
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8C7D1] text-sm text-[#231924]"
                  />
                </div>

                {/* Body Type & Height Presets */}
                <div>
                  <div className="text-xs font-semibold text-[#231924] mb-2">Body Type Preset</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['petite', 'slender', 'athletic', 'curvy', 'runway'] as BodyPreset[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyBodyPreset(p)}
                        className={`py-2 px-1 rounded-lg text-[11px] font-medium capitalize ${
                          bodyConfig.preset === p
                            ? 'bg-[#231924] text-white'
                            : 'bg-[#F7ECF0] text-[#5E4D58] hover:text-[#231924]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#231924] mb-2">Height Preset</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['petite', 'standard', 'tall'] as HeightPreset[]).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => applyHeightPreset(h)}
                        className={`py-2 rounded-lg text-xs font-medium capitalize ${
                          bodyConfig.height === h
                            ? 'bg-[#231924] text-white'
                            : 'bg-[#F7ECF0] text-[#5E4D58] hover:text-[#231924]'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggleable Fine Appearance Editor */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAppearanceTune((v) => !v)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#C84B78] hover:underline"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    {showAppearanceTune ? 'Hide Fine Facial Tuning' : 'Edit Appearance Proportions'}
                  </button>

                  {showAppearanceTune && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#FCF9F7] border border-[#EADCE3] space-y-2.5 text-xs">
                      {(
                        [
                          { key: 'jawWidth', label: 'Jaw Width' },
                          { key: 'cheekboneHeight', label: 'Cheekbones' },
                          { key: 'eyeSize', label: 'Eye Size' },
                          { key: 'lipFullnessLower', label: 'Lip Fullness' },
                        ] as const
                      ).map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between gap-3">
                          <span className="text-[#5E4D58] w-24">{label}</span>
                          <input
                            type="range"
                            min={-1}
                            max={1}
                            step={0.05}
                            value={generatedIdentity[key]}
                            onChange={(e) =>
                              setGeneratedIdentity((prev) =>
                                prev ? { ...prev, [key]: Number(e.target.value) } : prev,
                              )
                            }
                            className="flex-1 accent-[#C84B78]"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#EADCE3] space-y-2.5">
                <button
                  type="button"
                  onClick={() => addGeneratedCharacter(buildCharacterProfile(), true)}
                  className="w-full py-3 px-4 rounded-xl bg-[#C84B78] text-white text-sm font-semibold hover:bg-[#B23D67] inline-flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  Continue to Fashion Studio
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      addGeneratedCharacter(buildCharacterProfile(), false);
                      showToast('Character saved to My Characters.');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#F7ECF0] text-[#231924] text-xs font-semibold hover:bg-[#EED9E2]"
                  >
                    Save Character
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateCharacter}
                    className="py-2.5 px-3 rounded-xl border border-[#D8C7D1] text-[#231924] text-xs font-semibold hover:bg-[#FCF9F7] inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CROP & REPOSITION MODAL */}
        {croppingSlot && photos[croppingSlot] && (
          <div className="fixed inset-0 z-50 bg-[#231924]/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#EADCE3]">
              <h3 className="font-display text-2xl font-semibold text-[#231924]">
                Crop & Center Face
              </h3>
              <p className="text-xs text-[#6A5764] mt-1">
                Center the face within the guide frame before AI analysis.
              </p>

              <div className="mt-4 relative w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-[#F7ECF0] border border-[#D8C7D1]">
                <img
                  src={photos[croppingSlot]!.dataUrl}
                  alt="Crop preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${draftCrop.zoom}) translate(${draftCrop.offsetX}px, ${draftCrop.offsetY}px)`,
                  }}
                />
                <div className="absolute inset-6 rounded-full border-2 border-dashed border-white/80 pointer-events-none" />
              </div>

              <div className="mt-5 space-y-3 text-xs">
                <label className="flex items-center justify-between gap-3">
                  <span className="w-20 text-[#5E4D58]">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={2.4}
                    step={0.05}
                    value={draftCrop.zoom}
                    onChange={(e) => setDraftCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                    className="flex-1 accent-[#C84B78]"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="w-20 text-[#5E4D58]">Horizontal</span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={draftCrop.offsetX}
                    onChange={(e) => setDraftCrop((c) => ({ ...c, offsetX: Number(e.target.value) }))}
                    className="flex-1 accent-[#C84B78]"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="w-20 text-[#5E4D58]">Vertical</span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={draftCrop.offsetY}
                    onChange={(e) => setDraftCrop((c) => ({ ...c, offsetY: Number(e.target.value) }))}
                    className="flex-1 accent-[#C84B78]"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCroppingSlot(null)}
                  className="px-4 py-2 rounded-xl border border-[#EADCE3] text-xs font-semibold text-[#5E4D58]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotos((prev) => ({
                      ...prev,
                      [croppingSlot]: { ...prev[croppingSlot]!, crop: draftCrop },
                    }));
                    setCroppingSlot(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C84B78] text-white text-xs font-semibold"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
