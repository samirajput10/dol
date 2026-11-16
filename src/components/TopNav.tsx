import { Coins, Sparkles } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { getStylistLevel } from '../utils/studioLogic';
import type { AppView } from '../types/studio';

export function TopNav() {
  const view = useStudioStore((s) => s.view);
  const setView = useStudioStore((s) => s.setView);
  const coins = useStudioStore((s) => s.coins);
  const xp = useStudioStore((s) => s.xp);
  const levelInfo = getStylistLevel(xp);

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'characters', label: 'My Characters' },
    { id: 'studio', label: 'My Wardrobe' },
    { id: 'looks', label: 'Saved Looks' },
    { id: 'challenges', label: 'Challenges' },
  ];

  return (
    <header className="h-14 md:h-16 px-4 md:px-6 bg-[#FCF9F7] border-b border-[#EADCE3] flex items-center justify-between gap-4 md:gap-8 shrink-0">
      <button
        type="button"
        onClick={() => setView('home')}
        className="font-display text-xl md:text-2xl font-semibold tracking-tight text-[#231924] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C84B78] rounded"
      >
        Atelier Lumiere
      </button>

      <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
        {navItems.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`text-sm font-medium whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#C84B78] ${
                active
                  ? 'text-[#231924] border-[#C84B78]'
                  : 'text-[#6A5764] border-transparent hover:text-[#231924]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <div className="hidden lg:flex items-center gap-3 text-xs text-[#6A5764] whitespace-nowrap shrink-0">
          <span className="font-mono-num font-medium text-[#231924]">Lvl {levelInfo.level}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-mono-num font-medium text-[#8C6239]">
            <Coins className="w-3.5 h-3.5 text-[#C49A6C]" aria-hidden="true" />
            {coins}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setView('creator')}
          className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-[#C84B78] text-white text-xs font-semibold hover:bg-[#B23D67] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B78]"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          Create Character
        </button>
      </div>
    </header>
  );
}
