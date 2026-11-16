import { useState } from 'react';
import { FINGER_KEYS, FINGER_LABELS, WARDROBE_CATALOG } from '../../data/catalog';
import { useStudioStore } from '../../store/useStudioStore';
import type {
  EyebrowShape,
  HairEffect,
  LipFinish,
  NailDesign,
  NailLength,
  NailShape,
  SkinFinish,
} from '../../types/studio';

const HAIR_PRESETS = [
  { name: 'Black', hex: '#1B161A' },
  { name: 'Dark Brown', hex: '#3A251D' },
  { name: 'Chestnut', hex: '#6E4532' },
  { name: 'Auburn', hex: '#8F3C2B' },
  { name: 'Blonde', hex: '#D7B684' },
  { name: 'Platinum', hex: '#EFE6D5' },
  { name: 'Silver', hex: '#CFD4DF' },
  { name: 'Rose Pink', hex: '#E69BB8' },
  { name: 'Lavender', hex: '#B8A0E4' },
  { name: 'Sapphire', hex: '#4F74B8' },
];

const NAIL_SHAPES: NailShape[] = ['square', 'round', 'oval', 'almond', 'coffin', 'stiletto'];
const NAIL_LENGTHS: NailLength[] = ['short', 'medium', 'long', 'extra_long'];
const NAIL_DESIGNS: NailDesign[] = [
  'solid', 'french', 'glitter', 'chrome', 'marble',
  'floral', 'hearts', 'butterfly', 'rhinestones', 'ombre',
];

const NAIL_COLORS = [
  '#F2B5C8', '#C84B78', '#E63956', '#FFF7FA', '#231924',
  '#E5C48D', '#D2D8E2', '#B79CED', '#88C4E8', '#E8C5B0', '#A8E6CF', '#FF78B4',
];

export function BeautyStudioPanel({ mode }: { mode: 'hairstyles' | 'makeup' | 'nails' }) {
  const activeChar = useStudioStore((s) => s.getActiveCharacter)();
  const updateHair = useStudioStore((s) => s.updateHair);
  const updateMakeup = useStudioStore((s) => s.updateMakeup);
  const updateNails = useStudioStore((s) => s.updateNails);
  const updateNailStyle = useStudioStore((s) => s.updateNailStyle);

  const [makeupTab, setMakeupTab] = useState<'eyes' | 'brows' | 'face' | 'lips'>('eyes');
  const look = activeChar.currentLook;

  if (mode === 'hairstyles') {
    const hairStyles = WARDROBE_CATALOG.filter((i) => i.category === 'hairstyles');
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[#FCF9F7] border border-[#EADCE3] space-y-3">
          <div className="text-xs font-semibold text-[#231924]">Hair Color Studio</div>
          <div className="flex flex-wrap gap-1.5">
            {HAIR_PRESETS.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={`Hair color ${c.name}`}
                onClick={() => updateHair({ primaryColor: c.hex })}
                className={`w-6 h-6 rounded-full border ${
                  look.hair.primaryColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-[#231924] scale-110 ring-2 ring-[#C84B78]/40'
                    : 'border-[#D8C7D1]'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom primary hair color"
              value={look.hair.primaryColor}
              onChange={(e) => updateHair({ primaryColor: e.target.value })}
              className="w-6 h-6 rounded-full border border-[#D8C7D1] cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {(['solid', 'highlights', 'ombre', 'two_tone'] as HairEffect[]).map((eff) => (
              <button
                key={eff}
                type="button"
                onClick={() => updateHair({ effect: eff })}
                className={`px-2.5 py-1 rounded-md text-[11px] capitalize ${
                  look.hair.effect === eff
                    ? 'bg-[#231924] text-white font-semibold'
                    : 'bg-white border border-[#EADCE3] text-[#5E4D58]'
                }`}
              >
                {eff.replace('_', ' ')}
              </button>
            ))}
          </div>

          {look.hair.effect !== 'solid' && (
            <label className="flex items-center justify-between text-xs text-[#5E4D58]">
              <span>Secondary / Highlight Tone</span>
              <input
                type="color"
                aria-label="Secondary hair color"
                value={look.hair.secondaryColor}
                onChange={(e) => updateHair({ secondaryColor: e.target.value })}
                className="w-7 h-7 rounded border border-[#D8C7D1] cursor-pointer"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {hairStyles.map((style) => {
            const active = look.hair.styleId === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => updateHair({ styleId: style.id })}
                className={`text-left p-3 rounded-xl border transition-all ${
                  active
                    ? 'border-[#C84B78] bg-[#FDF2F6] ring-1 ring-[#C84B78]/30'
                    : 'border-[#EADCE3] bg-white hover:border-[#C49A6C]'
                }`}
              >
                <div className="text-xs font-semibold text-[#231924]">{style.name}</div>
                <div className="text-[11px] text-[#7D6976] capitalize mt-0.5">
                  {style.subType.replace('_', ' ')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'makeup') {
    const m = look.makeup;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#F7ECF0]">
          {(['eyes', 'brows', 'face', 'lips'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMakeupTab(t)}
              className={`py-1.5 rounded-lg text-xs font-semibold capitalize ${
                makeupTab === t ? 'bg-white text-[#231924] shadow-sm' : 'text-[#6A5764]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {makeupTab === 'eyes' && (
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Eyeshadow Palette</div>
              <div className="flex flex-wrap gap-1.5">
                {['#C98A9E', '#B79CED', '#D6A456', '#8BA7C4', '#6E4C5E', '#E39A8B', '#4F7D6C'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Eyeshadow ${hex}`}
                    onClick={() => updateMakeup({ eyeshadowColor: hex })}
                    className={`w-6 h-6 rounded-full border ${
                      m.eyeshadowColor === hex ? 'border-[#231924] scale-110' : 'border-[#D8C7D1]'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom eyeshadow color"
                  value={m.eyeshadowColor}
                  onChange={(e) => updateMakeup({ eyeshadowColor: e.target.value })}
                  className="w-6 h-6 rounded-full border border-[#D8C7D1]"
                />
              </div>
            </div>

            <label className="block">
              <div className="flex justify-between mb-1">
                <span>Eyeshadow Intensity</span>
                <span className="font-mono-num">{Math.round(m.eyeshadowIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={m.eyeshadowIntensity}
                onChange={(e) => updateMakeup({ eyeshadowIntensity: Number(e.target.value) })}
                className="w-full accent-[#C84B78]"
              />
            </label>

            <label className="flex items-center justify-between py-1">
              <span>Glitter Eyeshadow Shimmer</span>
              <input
                type="checkbox"
                checked={m.glitterEyeshadow}
                onChange={(e) => updateMakeup({ glitterEyeshadow: e.target.checked })}
                className="w-4 h-4 accent-[#C84B78]"
              />
            </label>

            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Eyeliner Style</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['none', 'classic', 'winged', 'smoky'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateMakeup({ eyelinerStyle: style })}
                    className={`py-1.5 rounded-lg capitalize ${
                      m.eyelinerStyle === style ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-semibold text-[#231924] mb-1.5">False Eyelashes & Mascara</div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {(['natural', 'wispy', 'dramatic', 'doll'] as const).map((lash) => (
                  <button
                    key={lash}
                    type="button"
                    onClick={() => updateMakeup({ lashStyle: lash })}
                    className={`py-1.5 rounded-lg capitalize ${
                      m.lashStyle === lash ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
                    }`}
                  >
                    {lash}
                  </button>
                ))}
              </div>
              <input
                type="range"
                aria-label="Mascara intensity"
                min={0}
                max={1}
                step={0.05}
                value={m.mascaraIntensity}
                onChange={(e) => updateMakeup({ mascaraIntensity: Number(e.target.value) })}
                className="w-full accent-[#C84B78]"
              />
            </div>
          </div>
        )}

        {makeupTab === 'brows' && (
          <div className="space-y-4 text-xs">
            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Eyebrow Shape</div>
              <div className="grid grid-cols-2 gap-2">
                {(['natural', 'arched', 'thin', 'thick'] as EyebrowShape[]).map((sh) => (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => updateMakeup({ eyebrowShape: sh })}
                    className={`py-2 rounded-xl capitalize font-medium ${
                      m.eyebrowShape === sh ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
                    }`}
                  >
                    {sh}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Eyebrow Color</div>
              <div className="flex flex-wrap gap-2">
                {['#1B1412', '#3B2820', '#5C3E32', '#9C7B56', '#C6A47C'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Eyebrow color ${hex}`}
                    onClick={() => updateMakeup({ eyebrowColor: hex })}
                    className={`w-7 h-7 rounded-full border ${
                      m.eyebrowColor === hex ? 'border-[#C84B78] scale-110' : 'border-[#D8C7D1]'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom eyebrow color"
                  value={m.eyebrowColor}
                  onChange={(e) => updateMakeup({ eyebrowColor: e.target.value })}
                  className="w-7 h-7 rounded-full border border-[#D8C7D1]"
                />
              </div>
            </div>
          </div>
        )}

        {makeupTab === 'face' && (
          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Skin Finish</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['matte', 'satin', 'dewy'] as SkinFinish[]).map((fin) => (
                  <button
                    key={fin}
                    type="button"
                    onClick={() => updateMakeup({ skinFinish: fin })}
                    className={`py-1.5 rounded-lg capitalize ${
                      m.skinFinish === fin ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
                    }`}
                  >
                    {fin}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Blush Shade</div>
              <div className="flex gap-1.5">
                {['#E88DA3', '#F09EA9', '#D97268', '#C96B8C', '#E8A58B'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Blush ${hex}`}
                    onClick={() => updateMakeup({ blushColor: hex })}
                    className={`w-6 h-6 rounded-full border ${
                      m.blushColor === hex ? 'border-[#231924] scale-110' : 'border-[#D8C7D1]'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {(
              [
                { key: 'foundationCoverage', label: 'Foundation' },
                { key: 'blushIntensity', label: 'Blush Intensity' },
                { key: 'contourIntensity', label: 'Contour' },
                { key: 'bronzerIntensity', label: 'Bronzer' },
                { key: 'highlighterIntensity', label: 'Highlighter' },
                { key: 'frecklesIntensity', label: 'Freckles' },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="block">
                <div className="flex justify-between mb-0.5">
                  <span>{label}</span>
                  <span className="font-mono-num">{Math.round(m[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={m[key]}
                  onChange={(e) => updateMakeup({ [key]: Number(e.target.value) })}
                  className="w-full accent-[#C84B78]"
                />
              </label>
            ))}
          </div>
        )}

        {makeupTab === 'lips' && (
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Lip Finish</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['matte', 'satin', 'gloss', 'ombre'] as LipFinish[]).map((fin) => (
                  <button
                    key={fin}
                    type="button"
                    onClick={() => updateMakeup({ lipFinish: fin })}
                    className={`py-1.5 rounded-lg capitalize ${
                      m.lipFinish === fin ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
                    }`}
                  >
                    {fin}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-semibold text-[#231924] mb-1.5">Lipstick Shade</div>
              <div className="flex flex-wrap gap-1.5">
                {['#C84B78', '#B82948', '#D95F8B', '#D48A8A', '#9D3B4C', '#7A233A', '#E29E95'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Lipstick ${hex}`}
                    onClick={() => updateMakeup({ lipColor: hex })}
                    className={`w-6 h-6 rounded-full border ${
                      m.lipColor === hex ? 'border-[#231924] scale-110' : 'border-[#D8C7D1]'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom lip color"
                  value={m.lipColor}
                  onChange={(e) => updateMakeup({ lipColor: e.target.value })}
                  className="w-6 h-6 rounded-full border border-[#D8C7D1]"
                />
              </div>
            </div>

            <label className="block">
              <div className="flex justify-between mb-1">
                <span>Pigment Intensity</span>
                <span className="font-mono-num">{Math.round(m.lipIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={m.lipIntensity}
                onChange={(e) => updateMakeup({ lipIntensity: Number(e.target.value) })}
                className="w-full accent-[#C84B78]"
              />
            </label>

            <label className="flex items-center justify-between py-1">
              <span>Defined Lip Liner</span>
              <input
                type="checkbox"
                checked={m.lipLiner}
                onChange={(e) => updateMakeup({ lipLiner: e.target.checked })}
                className="w-4 h-4 accent-[#C84B78]"
              />
            </label>
          </div>
        )}
      </div>
    );
  }

  // NAIL ART & MANICURE SALON
  const n = look.nails;
  const activeStyle = n.applyToAll ? n.uniformStyle : n.perFinger[n.activeFinger];

  return (
    <div className="space-y-4 text-xs">
      {/* Apply Mode Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7ECF0]">
        <span className="font-semibold text-[#231924]">Manicure Mode</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => updateNails({ applyToAll: true })}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              n.applyToAll ? 'bg-[#231924] text-white' : 'text-[#5E4D58]'
            }`}
          >
            All Nails
          </button>
          <button
            type="button"
            onClick={() => updateNails({ applyToAll: false })}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              !n.applyToAll ? 'bg-[#231924] text-white' : 'text-[#5E4D58]'
            }`}
          >
            Per Finger
          </button>
        </div>
      </div>

      {!n.applyToAll && (
        <div>
          <div className="font-semibold text-[#231924] mb-1.5">Select Finger</div>
          <div className="grid grid-cols-2 gap-1">
            {FINGER_KEYS.map((fk) => (
              <button
                key={fk}
                type="button"
                onClick={() => updateNails({ activeFinger: fk })}
                className={`py-1.5 px-2 rounded-lg text-[11px] text-left flex items-center justify-between ${
                  n.activeFinger === fk ? 'bg-[#231924] text-white' : 'bg-[#FCF9F7] border border-[#EADCE3] text-[#5E4D58]'
                }`}
              >
                <span>{FINGER_LABELS[fk]}</span>
                <span
                  className="w-3 h-3 rounded-full border border-white/50"
                  style={{ backgroundColor: n.perFinger[fk].color }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="font-semibold text-[#231924] mb-1.5">Nail Shape</div>
        <div className="grid grid-cols-3 gap-1.5">
          {NAIL_SHAPES.map((sh) => (
            <button
              key={sh}
              type="button"
              onClick={() => updateNails({ shape: sh })}
              className={`py-1.5 rounded-lg capitalize ${
                n.shape === sh ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
              }`}
            >
              {sh}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="font-semibold text-[#231924] mb-1.5">Nail Length</div>
        <div className="grid grid-cols-4 gap-1.5">
          {NAIL_LENGTHS.map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => updateNails({ length: len })}
              className={`py-1.5 rounded-lg capitalize text-[11px] ${
                n.length === len ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
              }`}
            >
              {len.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="font-semibold text-[#231924] mb-1.5">Polish Color</div>
        <div className="flex flex-wrap gap-1.5">
          {NAIL_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Nail polish ${hex}`}
              onClick={() => updateNailStyle({ color: hex })}
              className={`w-6 h-6 rounded-full border ${
                activeStyle.color === hex ? 'border-[#231924] scale-110 ring-2 ring-[#C84B78]/40' : 'border-[#D8C7D1]'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
          <input
            type="color"
            aria-label="Custom nail polish color"
            value={activeStyle.color}
            onChange={(e) => updateNailStyle({ color: e.target.value })}
            className="w-6 h-6 rounded-full border border-[#D8C7D1]"
          />
        </div>
      </div>

      <div>
        <div className="font-semibold text-[#231924] mb-1.5">Nail Art Design</div>
        <div className="grid grid-cols-2 gap-1.5">
          {NAIL_DESIGNS.map((des) => (
            <button
              key={des}
              type="button"
              onClick={() => updateNailStyle({ design: des })}
              className={`py-1.5 px-2.5 rounded-lg capitalize text-left ${
                activeStyle.design === des
                  ? 'bg-[#C84B78] text-white font-semibold'
                  : 'bg-[#FCF9F7] border border-[#EADCE3] text-[#5E4D58]'
              }`}
            >
              {des}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-[#EADCE3] flex items-center justify-between">
        <span className="font-semibold text-[#231924]">Toenails Polish</span>
        <input
          type="color"
          aria-label="Toenails color"
          value={n.toenailsColor}
          onChange={(e) => updateNails({ toenailsColor: e.target.value })}
          className="w-7 h-7 rounded border border-[#D8C7D1]"
        />
      </div>
    </div>
  );
}
