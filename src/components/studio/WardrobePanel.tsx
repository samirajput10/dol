import { useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { FASHION_COLLECTIONS, WARDROBE_CATALOG } from '../../data/catalog';
import { useStudioStore } from '../../store/useStudioStore';
import type { FabricFinish, StudioCategoryId } from '../../types/studio';

const SWATCHES = [
  '#D97B9B', '#B8395F', '#F3C1D8', '#C7B8EA',
  '#3B234A', '#231924', '#FFF9F5', '#E5C48D',
  '#E59A84', '#3B567E', '#8B8E7A', '#C59E7B',
];

const FINISHES: FabricFinish[] = ['matte', 'silk', 'satin', 'velvet', 'denim', 'leather', 'sequin'];

export function WardrobePanel({ category }: { category: StudioCategoryId }) {
  const activeChar = useStudioStore((s) => s.getActiveCharacter)();
  const setGarment = useStudioStore((s) => s.setGarment);
  const updateJewelry = useStudioStore((s) => s.updateJewelry);
  const updateAccessories = useStudioStore((s) => s.updateAccessories);
  const setBeautyProp = useStudioStore((s) => s.setBeautyProp);
  const applyCollection = useStudioStore((s) => s.applyCollection);

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const look = activeChar.currentLook;

  if (category === 'collections') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-[#6A5764]">
          Apply a complete themed look with coordinated attire, hair, jewelry, and stage.
        </p>
        {FASHION_COLLECTIONS.map((col) => (
          <div
            key={col.id}
            className="rounded-xl border border-[#EADCE3] bg-[#FCF9F7] p-3.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                  style={{ backgroundColor: col.accentColor }}
                />
                <h3 className="text-xs font-semibold text-[#231924]">{col.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => applyCollection(col.id)}
                className="px-3 py-1.5 rounded-lg bg-[#231924] text-white text-[11px] font-semibold hover:bg-[#C84B78] transition-colors shrink-0"
              >
                Apply Look
              </button>
            </div>
            <p className="text-[11px] text-[#6A5764]">{col.subtitle}</p>
          </div>
        ))}
      </div>
    );
  }

  const items = WARDROBE_CATALOG.filter((i) => i.category === category);
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).slice(0, 8);
  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'all' || item.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Helper to get active garment slot
  const garmentSlot =
    category === 'dresses' ||
    category === 'tops' ||
    category === 'bottoms' ||
    category === 'outerwear' ||
    category === 'shoes'
      ? category === 'dresses'
        ? 'dress'
        : category === 'tops'
          ? 'top'
          : category === 'bottoms'
            ? 'bottom'
            : category === 'outerwear'
              ? 'outerwear'
              : 'shoes'
      : null;

  const activeGarment = garmentSlot ? look[garmentSlot] : null;

  return (
    <div className="space-y-4">
      {/* Search & Tag Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8E7A87] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${category.replace('_', ' ')}...`}
            aria-label={`Search ${category.replace('_', ' ')}`}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E6D7DF] bg-[#FCF9F7] text-xs text-[#231924] placeholder:text-[#8E7A87]"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                selectedTag === 'all' ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize ${
                  selectedTag === tag ? 'bg-[#231924] text-white' : 'bg-[#F7ECF0] text-[#5E4D58]'
                }`}
              >
                {tag.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Garment Color & Finish Controls */}
      {garmentSlot && activeGarment && (
        <div className="p-3 rounded-xl bg-[#FCF9F7] border border-[#EADCE3] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#231924]">Color & Fabric</span>
            <button
              type="button"
              onClick={() => setGarment(garmentSlot, null)}
              className="text-[11px] text-[#9E455B] hover:underline inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" aria-hidden="true" />
              Remove
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Set color ${hex}`}
                onClick={() => setGarment(garmentSlot, { ...activeGarment, color: hex })}
                className={`w-6 h-6 rounded-full border transition-transform ${
                  activeGarment.color.toLowerCase() === hex.toLowerCase()
                    ? 'border-[#231924] scale-110 ring-2 ring-[#C84B78]/40'
                    : 'border-[#D8C7D1]'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom garment color"
              value={activeGarment.color}
              onChange={(e) => setGarment(garmentSlot, { ...activeGarment, color: e.target.value })}
              className="w-6 h-6 rounded-full border border-[#D8C7D1] cursor-pointer bg-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FINISHES.map((fin) => (
              <button
                key={fin}
                type="button"
                onClick={() => setGarment(garmentSlot, { ...activeGarment, finish: fin })}
                className={`px-2 py-1 rounded-md text-[11px] capitalize ${
                  activeGarment.finish === fin
                    ? 'bg-[#C84B78] text-white font-semibold'
                    : 'bg-white border border-[#EADCE3] text-[#5E4D58]'
                }`}
              >
                {fin}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Jewelry Metal Selector */}
      {category === 'jewelry' && (
        <div className="p-3 rounded-xl bg-[#FCF9F7] border border-[#EADCE3] flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#231924]">Metal Tone</span>
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Gold', hex: '#E5C48D' },
              { label: 'Silver', hex: '#DCE3EC' },
              { label: 'Rose Gold', hex: '#E0A899' },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => updateJewelry({ metalColor: m.hex })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                  look.jewelry.metalColor === m.hex
                    ? 'border-[#231924] bg-white text-[#231924]'
                    : 'border-transparent bg-[#F7ECF0] text-[#5E4D58]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Item Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filtered.map((item) => {
          let isSelected = false;
          if (garmentSlot) {
            isSelected = look[garmentSlot]?.id === item.id;
          } else if (category === 'jewelry') {
            isSelected =
              look.jewelry.necklaceId === item.id ||
              look.jewelry.earringsId === item.id ||
              look.jewelry.braceletId === item.id ||
              look.jewelry.ringId === item.id ||
              look.jewelry.watchId === item.id ||
              look.jewelry.ankletId === item.id;
          } else if (category === 'accessories') {
            isSelected =
              look.accessories.bagId === item.id ||
              look.accessories.glassesId === item.id ||
              look.accessories.hatId === item.id ||
              look.accessories.hairAccessoryId === item.id ||
              look.accessories.beltId === item.id ||
              look.accessories.glovesId === item.id;
          } else if (category === 'beauty_props') {
            isSelected = look.beautyPropId === item.id;
          }

          const handleClick = () => {
            if (garmentSlot) {
              setGarment(
                garmentSlot,
                isSelected && garmentSlot !== 'shoes'
                  ? null
                  : {
                      id: item.id,
                      color: item.defaultColor,
                      secondaryColor: item.defaultSecondaryColor,
                      finish: item.defaultFinish ?? 'matte',
                    },
              );
            } else if (category === 'jewelry') {
              if (item.subType === 'necklace' || item.subType === 'choker' || item.subType === 'chain') {
                updateJewelry({ necklaceId: isSelected ? null : item.id });
              } else if (item.subType.startsWith('earrings')) {
                updateJewelry({ earringsId: isSelected ? null : item.id });
              } else if (item.subType === 'bracelet') {
                updateJewelry({ braceletId: isSelected ? null : item.id });
              } else if (item.subType === 'ring') {
                updateJewelry({ ringId: isSelected ? null : item.id });
              } else if (item.subType === 'watch') {
                updateJewelry({ watchId: isSelected ? null : item.id });
              } else if (item.subType === 'anklet') {
                updateJewelry({ ankletId: isSelected ? null : item.id });
              }
            } else if (category === 'accessories') {
              if (item.subType.startsWith('bag')) {
                updateAccessories({ bagId: isSelected ? null : item.id, bagColor: item.defaultColor });
              } else if (item.subType.startsWith('glasses')) {
                updateAccessories({ glassesId: isSelected ? null : item.id, glassesColor: item.defaultColor });
              } else if (item.subType.startsWith('hat')) {
                updateAccessories({ hatId: isSelected ? null : item.id, hatColor: item.defaultColor });
              } else if (item.subType.startsWith('hair')) {
                updateAccessories({ hairAccessoryId: isSelected ? null : item.id, hairAccessoryColor: item.defaultColor });
              } else if (item.subType === 'belt') {
                updateAccessories({ beltId: isSelected ? null : item.id });
              } else if (item.subType === 'gloves') {
                updateAccessories({ glovesId: isSelected ? null : item.id });
              }
            } else if (category === 'beauty_props') {
              setBeautyProp(isSelected ? null : item.id);
            }
          };

          return (
            <button
              key={item.id}
              type="button"
              onClick={handleClick}
              className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between min-h-[82px] ${
                isSelected
                  ? 'border-[#C84B78] bg-[#FDF2F6] ring-1 ring-[#C84B78]/30'
                  : 'border-[#EADCE3] bg-white hover:border-[#C49A6C]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: item.defaultColor }}
                />
                {isSelected && <Sparkles className="w-3.5 h-3.5 text-[#C84B78]" aria-hidden="true" />}
              </div>
              <div className="mt-2">
                <div className="text-xs font-semibold text-[#231924] leading-tight">{item.name}</div>
                <div className="text-[11px] text-[#7D6976] capitalize mt-0.5">
                  {item.subType.replace('_', ' ')}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
