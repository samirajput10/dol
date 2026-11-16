import { BACKGROUNDS } from '../../data/catalog';
import { useStudioStore } from '../../store/useStudioStore';
import type { AnimationId, ExpressionId, LightingPresetId } from '../../types/studio';

const EXPRESSIONS: Array<{ id: ExpressionId; label: string }> = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'smiling', label: 'Smiling' },
  { id: 'happy', label: 'Happy' },
  { id: 'laughing', label: 'Laughing' },
  { id: 'winking', label: 'Winking' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'confident', label: 'Confident' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'playful', label: 'Playful' },
  { id: 'sad', label: 'Sad' },
  { id: 'angry', label: 'Angry' },
];

const ANIMATIONS: Array<{ id: AnimationId; label: string }> = [
  { id: 'idle', label: 'Standing Naturally' },
  { id: 'posing', label: 'Posing for Photos' },
  { id: 'runway', label: 'Fashion Runway Walk' },
  { id: 'walking', label: 'Walking' },
  { id: 'turning', label: '360° Turntable' },
  { id: 'waving', label: 'Waving' },
  { id: 'dancing', label: 'Dancing' },
  { id: 'blow_kiss', label: 'Blowing a Kiss' },
  { id: 'show_outfit', label: 'Showing Outfit' },
  { id: 'show_jewelry', label: 'Showing Jewelry' },
  { id: 'show_hair', label: 'Showing Hairstyle' },
];

const LIGHTING_PRESETS: Array<{ id: LightingPresetId; label: string }> = [
  { id: 'studio_soft', label: 'Studio Soft' },
  { id: 'golden_hour', label: 'Golden Hour' },
  { id: 'runway_spot', label: 'Runway Spot' },
  { id: 'candlelight', label: 'Candlelight' },
];

export function ScenePosePanel({ mode }: { mode: 'expressions' | 'backgrounds' }) {
  const activeChar = useStudioStore((s) => s.getActiveCharacter)();
  const setExpression = useStudioStore((s) => s.setExpression);
  const setAnimation = useStudioStore((s) => s.setAnimation);
  const setBackground = useStudioStore((s) => s.setBackground);
  const setLighting = useStudioStore((s) => s.setLighting);

  const look = activeChar.currentLook;

  if (mode === 'expressions') {
    return (
      <div className="space-y-5 text-xs">
        <div>
          <div className="font-semibold text-[#231924] mb-2">Facial Expressions</div>
          <div className="grid grid-cols-2 gap-1.5">
            {EXPRESSIONS.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => setExpression(exp.id)}
                className={`py-2 px-2.5 rounded-xl text-left font-medium transition-colors ${
                  look.expression === exp.id
                    ? 'bg-[#C84B78] text-white'
                    : 'bg-[#FCF9F7] border border-[#EADCE3] text-[#5E4D58] hover:text-[#231924]'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block p-3 rounded-xl bg-[#FCF9F7] border border-[#EADCE3]">
          <div className="flex justify-between mb-1 font-semibold text-[#231924]">
            <span>Expression Intensity</span>
            <span className="font-mono-num">{Math.round(look.expressionIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={look.expressionIntensity}
            onChange={(e) => setExpression(look.expression, Number(e.target.value))}
            className="w-full accent-[#C84B78]"
          />
        </label>

        <div>
          <div className="font-semibold text-[#231924] mb-2">Character Animations</div>
          <div className="space-y-1.5">
            {ANIMATIONS.map((anim) => (
              <button
                key={anim.id}
                type="button"
                onClick={() => setAnimation(anim.id)}
                className={`w-full py-2 px-3 rounded-xl text-left font-medium transition-colors ${
                  look.animation === anim.id
                    ? 'bg-[#231924] text-white'
                    : 'bg-[#FCF9F7] border border-[#EADCE3] text-[#5E4D58] hover:text-[#231924]'
                }`}
              >
                {anim.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs">
      <div>
        <div className="font-semibold text-[#231924] mb-2">Studio & Photo Environments</div>
        <div className="space-y-2">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => setBackground(bg.id)}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                look.background === bg.id
                  ? 'border-[#C84B78] bg-[#FDF2F6]'
                  : 'border-[#EADCE3] bg-white hover:border-[#C49A6C]'
              }`}
            >
              <span
                className="w-7 h-7 rounded-lg border border-black/10 shrink-0"
                style={{ backgroundColor: bg.wallHex }}
              />
              <span className="font-semibold text-[#231924]">{bg.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#FCF9F7] border border-[#EADCE3] space-y-3">
        <div className="font-semibold text-[#231924]">Studio Lighting</div>
        <div className="grid grid-cols-2 gap-1.5">
          {LIGHTING_PRESETS.map((lt) => (
            <button
              key={lt.id}
              type="button"
              onClick={() => setLighting(lt.id)}
              className={`py-1.5 rounded-lg font-medium ${
                look.lighting === lt.id ? 'bg-[#231924] text-white' : 'bg-white border border-[#EADCE3] text-[#5E4D58]'
              }`}
            >
              {lt.label}
            </button>
          ))}
        </div>
        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Exposure</span>
            <span className="font-mono-num">{Math.round(look.lightingIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.05}
            value={look.lightingIntensity}
            onChange={(e) => setLighting(look.lighting, Number(e.target.value))}
            className="w-full accent-[#C84B78]"
          />
        </label>
      </div>
    </div>
  );
}
