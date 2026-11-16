import { useState } from 'react';
import { Copy, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { BACKGROUNDS, WARDROBE_CATALOG } from '../data/catalog';
import { useStudioStore } from '../store/useStudioStore';

export function SavedLooksView() {
  const savedLooks = useStudioStore((s) => s.savedLooks);
  const characters = useStudioStore((s) => s.characters);
  const applySavedLook = useStudioStore((s) => s.applySavedLook);
  const duplicateSavedLook = useStudioStore((s) => s.duplicateSavedLook);
  const renameSavedLook = useStudioStore((s) => s.renameSavedLook);
  const deleteSavedLook = useStudioStore((s) => s.deleteSavedLook);
  const setView = useStudioStore((s) => s.setView);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  return (
    <main className="flex-1 overflow-y-auto studio-scroll bg-[#FCF9F7] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EADCE3]">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#231924]">
              Saved Looks
            </h1>
            <p className="text-sm text-[#6A5764] mt-1">
              Manage, duplicate, rename, or apply complete outfits, makeup, hairstyles, and nail designs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView('studio')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#231924] text-white text-xs font-semibold hover:bg-[#38293A]"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Return to Studio
          </button>
        </div>

        {savedLooks.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-white border border-[#EADCE3] p-12 text-center">
            <h2 className="font-display text-2xl font-semibold text-[#231924]">
              No Saved Looks Yet
            </h2>
            <p className="text-sm text-[#6A5764] mt-2 max-w-md mx-auto">
              Style a character in the Fashion Studio and click "Save Outfit" in the bottom toolbar to build your lookbook.
            </p>
            <button
              type="button"
              onClick={() => setView('studio')}
              className="mt-6 px-5 py-2.5 rounded-xl bg-[#C84B78] text-white text-xs font-semibold hover:bg-[#B23D67]"
            >
              Open Fashion Studio
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedLooks.map((look) => {
              const char = characters.find((c) => c.id === look.characterId);
              const dressItem = WARDROBE_CATALOG.find((i) => i.id === look.customization.dress?.id);
              const topItem = WARDROBE_CATALOG.find((i) => i.id === look.customization.top?.id);
              const bg = BACKGROUNDS.find((b) => b.id === look.customization.background);

              return (
                <div
                  key={look.id}
                  className="rounded-2xl bg-white border border-[#EADCE3] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      {editingId === look.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            renameSavedLook(look.id, draftName);
                            setEditingId(null);
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            aria-label="Look name"
                            className="px-2 py-1 text-sm border border-[#D8C7D1] rounded-lg w-40"
                            autoFocus
                          />
                          <button type="submit" className="px-2.5 py-1 text-xs bg-[#231924] text-white rounded-lg">
                            Save
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base font-semibold text-[#231924]">{look.name}</h2>
                          <button
                            type="button"
                            aria-label={`Rename ${look.name}`}
                            onClick={() => {
                              setEditingId(look.id);
                              setDraftName(look.name);
                            }}
                            className="text-[#8E7A87] hover:text-[#231924] p-1"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                      <span className="text-xs text-[#7D6976] font-mono-num">{look.createdAt}</span>
                    </div>

                    <p className="text-xs text-[#6A5764] mt-1">
                      Styled for {char?.name ?? 'Studio Character'} · {bg?.name ?? 'Studio'}
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full border border-[#EADCE3]"
                        style={{ backgroundColor: look.customization.dress?.color || look.customization.top?.color || '#D97B9B' }}
                        title="Garment color"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-[#EADCE3]"
                        style={{ backgroundColor: look.customization.hair.primaryColor }}
                        title="Hair color"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-[#EADCE3]"
                        style={{ backgroundColor: look.customization.makeup.lipColor }}
                        title="Lip color"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-[#EADCE3]"
                        style={{ backgroundColor: look.customization.nails.uniformStyle.color }}
                        title="Nail polish"
                      />
                      <span className="text-xs text-[#6A5764] ml-1 truncate">
                        {dressItem?.name ?? topItem?.name ?? 'Custom Ensemble'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#F2E8EE] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applySavedLook(look.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#231924] text-white text-xs font-semibold hover:bg-[#38293A]"
                    >
                      Wear in Studio
                    </button>
                    <button
                      type="button"
                      aria-label={`Duplicate ${look.name}`}
                      onClick={() => duplicateSavedLook(look.id)}
                      className="p-2 rounded-xl border border-[#EADCE3] text-[#6A5764] hover:text-[#231924] hover:bg-[#F7ECF0]"
                    >
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${look.name}`}
                      onClick={() => deleteSavedLook(look.id)}
                      className="p-2 rounded-xl border border-[#EADCE3] text-[#9E455B] hover:bg-[#FDF0F3]"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
