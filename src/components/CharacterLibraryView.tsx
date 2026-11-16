import { useState } from 'react';
import { Pencil, Plus, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export function CharacterLibraryView() {
  const characters = useStudioStore((s) => s.characters);
  const activeCharacterId = useStudioStore((s) => s.activeCharacterId);
  const savedLooks = useStudioStore((s) => s.savedLooks);
  const selectCharacter = useStudioStore((s) => s.selectCharacter);
  const renameCharacter = useStudioStore((s) => s.renameCharacter);
  const deleteCharacterPhotos = useStudioStore((s) => s.deleteCharacterPhotos);
  const deleteCharacter = useStudioStore((s) => s.deleteCharacter);
  const setView = useStudioStore((s) => s.setView);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  return (
    <main className="flex-1 overflow-y-auto studio-scroll bg-[#FCF9F7] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EADCE3]">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#231924]">
              My Characters
            </h1>
            <p className="text-sm text-[#6A5764] mt-1">
              Switch between your AI-generated and studio characters without losing saved outfits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView('creator')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C84B78] text-white text-xs font-semibold hover:bg-[#B23D67] transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Create New Character
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((char) => {
            const lookCount = savedLooks.filter((l) => l.characterId === char.id).length;
            const isActive = char.id === activeCharacterId;
            const hasRefPhotos = Boolean(char.referenceThumbnails && Object.keys(char.referenceThumbnails).length > 0);

            return (
              <div
                key={char.id}
                className={`rounded-2xl bg-white border p-5 flex flex-col justify-between ${
                  isActive ? 'border-[#C84B78] ring-1 ring-[#C84B78]/25' : 'border-[#EADCE3]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-display text-xl font-semibold text-[#231924] border border-[#EADCE3] shrink-0"
                        style={{ backgroundColor: char.avatarBadgeColor }}
                      >
                        {char.referenceThumbnails?.front ? (
                          <img
                            src={char.referenceThumbnails.front}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          char.name.slice(0, 1)
                        )}
                      </div>
                      <div>
                        {editingId === char.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              renameCharacter(char.id, draftName);
                              setEditingId(null);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={draftName}
                              onChange={(e) => setDraftName(e.target.value)}
                              aria-label="Character name"
                              className="px-2 py-1 text-sm border border-[#D8C7D1] rounded-lg w-36"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="px-2 py-1 text-xs bg-[#231924] text-white rounded-lg"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h2 className="text-base font-semibold text-[#231924]">{char.name}</h2>
                            <button
                              type="button"
                              aria-label={`Rename ${char.name}`}
                              onClick={() => {
                                setEditingId(char.id);
                                setDraftName(char.name);
                              }}
                              className="text-[#8E7A87] hover:text-[#231924] p-1"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-[#6A5764] mt-0.5 font-mono-num">
                          Created {char.createdAt} · {lookCount} saved look{lookCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-[#5E4D58] leading-relaxed">
                    {char.identity.resemblanceSummary}
                  </p>

                  <div className="mt-3 text-xs text-[#7D6976]">
                    {char.identity.faceShape} face · {char.body.preset} body · {char.source === 'ai_photos' ? 'AI Photo Avatar' : 'Studio Preset'}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#F2E8EE] flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectCharacter(char.id, true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#231924] text-white text-xs font-semibold hover:bg-[#38293A] transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    {isActive ? 'Open Studio' : 'Edit Character'}
                  </button>

                  {hasRefPhotos && (
                    <button
                      type="button"
                      title="Delete uploaded reference photos for privacy while keeping 3D character"
                      aria-label={`Delete reference photos for ${char.name}`}
                      onClick={() => deleteCharacterPhotos(char.id)}
                      className="p-2 rounded-xl border border-[#EADCE3] text-[#6A5764] hover:text-[#231924] hover:bg-[#F7ECF0]"
                    >
                      <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}

                  {characters.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete ${char.name}`}
                      onClick={() => deleteCharacter(char.id)}
                      className="p-2 rounded-xl border border-[#EADCE3] text-[#9E455B] hover:bg-[#FDF0F3]"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
