import { useEffect } from 'react';
import { CharacterCreatorView } from './components/CharacterCreatorView';
import { CharacterLibraryView } from './components/CharacterLibraryView';
import { ChallengesView } from './components/ChallengesView';
import { FashionStudioView } from './components/FashionStudioView';
import { HomeView } from './components/HomeView';
import { SavedLooksView } from './components/SavedLooksView';
import { TopNav } from './components/TopNav';
import { useStudioStore } from './store/useStudioStore';
import type { AppView } from './types/studio';

export default function App() {
  const view = useStudioStore((s) => s.view);
  const setView = useStudioStore((s) => s.setView);
  const toastMessage = useStudioStore((s) => s.toastMessage);

  useEffect(() => {
    document.body.dataset.state = view;
  }, [view]);

  const mobileTabs: Array<{ id: AppView; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'creator', label: 'Create' },
    { id: 'studio', label: 'Studio' },
    { id: 'characters', label: 'Dolls' },
    { id: 'looks', label: 'Looks' },
    { id: 'challenges', label: 'Challenges' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FCF9F7] text-[#231924] overflow-hidden">
      <TopNav />

      {view === 'home' && <HomeView />}
      {view === 'creator' && <CharacterCreatorView />}
      {view === 'studio' && <FashionStudioView />}
      {view === 'characters' && <CharacterLibraryView />}
      {view === 'looks' && <SavedLooksView />}
      {view === 'challenges' && <ChallengesView />}

      {/* Compact Mobile Nav Bar (<= 10% viewport height, md:hidden) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden h-12 px-2 bg-white border-t border-[#EADCE3] flex items-center justify-around shrink-0"
      >
        {mobileTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={`px-2 py-1 text-[11px] font-semibold rounded-lg ${
              view === t.id ? 'bg-[#231924] text-white' : 'text-[#6A5764]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#231924] text-white text-xs font-medium shadow-lg border border-white/10"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
