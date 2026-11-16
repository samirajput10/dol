import { Award, CheckCircle2, Coins, Sparkles, Trophy } from 'lucide-react';
import { FASHION_CHALLENGES } from '../data/catalog';
import { useStudioStore } from '../store/useStudioStore';
import { getStylistLevel } from '../utils/studioLogic';

export function ChallengesView() {
  const coins = useStudioStore((s) => s.coins);
  const xp = useStudioStore((s) => s.xp);
  const unlockedBadges = useStudioStore((s) => s.unlockedBadges);
  const completedChallengeIds = useStudioStore((s) => s.completedChallengeIds);
  const submitChallenge = useStudioStore((s) => s.submitChallenge);
  const lastChallengeResult = useStudioStore((s) => s.lastChallengeResult);
  const clearChallengeResult = useStudioStore((s) => s.clearChallengeResult);
  const setView = useStudioStore((s) => s.setView);
  const activeChar = useStudioStore((s) => s.getActiveCharacter)();

  const level = getStylistLevel(xp);

  return (
    <main className="flex-1 overflow-y-auto studio-scroll bg-[#FCF9F7] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-[#EADCE3]">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#231924]">
              Fashion Challenges & Stylist Progression
            </h1>
            <p className="text-sm text-[#6A5764] mt-1">
              Style {activeChar.name} in the studio to match theme briefs, earn virtual coins, and unlock stylist badges.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-[#6A5764]">Stylist Rank</div>
              <div className="text-sm font-semibold text-[#231924]">
                Level {level.level} · {level.title}
              </div>
              <div className="w-36 h-1.5 bg-[#EADCE3] rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#C84B78] rounded-full transition-all"
                  style={{ width: `${level.progressPct}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6A5764]">Studio Balance</div>
              <div className="inline-flex items-center gap-1.5 text-lg font-semibold font-mono-num text-[#8C6239]">
                <Coins className="w-4 h-4 text-[#C49A6C]" aria-hidden="true" />
                {coins}
              </div>
            </div>
          </div>
        </div>

        {/* Last Evaluation Result Banner */}
        {lastChallengeResult && (
          <div className="mt-6 rounded-2xl bg-white border border-[#C84B78]/40 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#C84B78]">
                {lastChallengeResult.evaluation.passed ? 'Challenge Passed' : 'Style Review'} · Score{' '}
                <span className="font-mono-num">{lastChallengeResult.evaluation.score}/100</span>
              </div>
              <div className="mt-2 space-y-1">
                {lastChallengeResult.evaluation.matchedCriteria.map((m) => (
                  <p key={m} className="text-xs text-[#2E5D43] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {m}
                  </p>
                ))}
                {lastChallengeResult.evaluation.missingCriteria.map((m) => (
                  <p key={m} className="text-xs text-[#7D6976]">
                    Tip: {m}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-xs font-mono-num">
                <div className="font-semibold text-[#8C6239]">+{lastChallengeResult.evaluation.earnedCoins} coins</div>
                <div className="text-[#6A5764]">+{lastChallengeResult.evaluation.earnedXp} XP</div>
              </div>
              <button
                type="button"
                onClick={clearChallengeResult}
                className="px-3 py-1.5 rounded-lg border border-[#EADCE3] text-xs font-medium hover:bg-[#F7ECF0]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Challenges Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {FASHION_CHALLENGES.map((ch) => {
            const done = completedChallengeIds.includes(ch.id);
            return (
              <div
                key={ch.id}
                className="rounded-2xl bg-white border border-[#EADCE3] p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#7D6976]">
                    <span className="capitalize">{ch.category} Challenge</span>
                    <span className="font-mono-num text-[#8C6239] font-medium">
                      +{ch.rewardCoins} coins · +{ch.rewardXp} XP
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-[#231924] mt-2">
                    {ch.title}
                  </h2>
                  <p className="text-sm text-[#5E4D58] mt-1.5 leading-relaxed">{ch.description}</p>

                  <div className="mt-4 text-xs text-[#6A5764]">
                    Key styling tags: {ch.requiredTags.join(' · ')}
                  </div>
                  <div className="mt-1 text-xs text-[#8C6239] inline-flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                    Badge reward: {ch.badgeTitle} {done ? '(Unlocked)' : ''}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setView('studio')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#F7ECF0] text-[#231924] text-xs font-semibold hover:bg-[#EED9E2]"
                  >
                    Style Look
                  </button>
                  <button
                    type="button"
                    onClick={() => submitChallenge(ch.id)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#231924] text-white text-xs font-semibold hover:bg-[#38293A] inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    Submit Current Look
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unlocked Badges */}
        <div className="mt-10 pt-8 border-t border-[#EADCE3]">
          <h2 className="font-display text-2xl font-semibold text-[#231924]">Achievement Badges</h2>
          {unlockedBadges.length === 0 ? (
            <p className="text-sm text-[#6A5764] mt-2">
              Complete any Fashion Challenge with a score of 70+ to earn your first stylist badge.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {unlockedBadges.map((b) => (
                <div
                  key={b}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#EADCE3] text-xs font-semibold text-[#231924]"
                >
                  <Trophy className="w-4 h-4 text-[#C49A6C]" aria-hidden="true" />
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
