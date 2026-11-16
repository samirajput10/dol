import { ArrowRight, Camera, Palette, Sparkles, UserCheck } from 'lucide-react';
import { PRESET_CHARACTERS } from '../data/catalog';
import { useStudioStore } from '../store/useStudioStore';

export function HomeView() {
  const setView = useStudioStore((s) => s.setView);
  const selectCharacter = useStudioStore((s) => s.selectCharacter);
  const characters = useStudioStore((s) => s.characters);

  return (
    <main className="flex-1 overflow-y-auto studio-scroll bg-[#FCF9F7]">
      {/* Editorial Hero Split */}
      <section className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center pr-0 lg:pr-6">
            <p className="text-xs font-medium tracking-wide text-[#9A4B69] mb-3">
              AI Avatar Reconstruction · 3D Couture Studio · Virtual Beauty Salon
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold leading-[1.08] text-[#231924] max-w-xl [text-wrap:balance]">
              Turn Four Photographs Into Your Animated 3D Fashion Doll
            </h1>
            <p className="mt-4 text-base text-[#5E4D58] leading-relaxed max-w-lg">
              Upload four camera angles to reconstruct a recognizable, fully rigged 3D character—then customize couture gowns, hairstyles, makeup, nail art, jewelry, and runway animations.
            </p>

            {/* Primary Dual Choice */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                data-testid="option-create-character"
                onClick={() => setView('creator')}
                className="group text-left p-5 rounded-2xl bg-[#231924] text-white hover:bg-[#352637] transition-colors flex flex-col justify-between min-h-[148px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B78]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#E9B9CC]">Option A</span>
                  <Camera className="w-4 h-4 text-[#E9B9CC]" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="text-base font-semibold">Create Your Own Character</div>
                  <p className="text-xs text-[#D5C6D0] mt-1">
                    Upload 4 angles for AI facial reconstruction
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4D0DF]">
                  Start Photo Studio
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </div>
              </button>

              <button
                type="button"
                data-testid="option-choose-preset"
                onClick={() => {
                  selectCharacter(characters[0]?.id ?? PRESET_CHARACTERS[0].id, true);
                }}
                className="group text-left p-5 rounded-2xl bg-[#F7ECF0] border border-[#E6CFD9] text-[#231924] hover:bg-[#F2E0E7] transition-colors flex flex-col justify-between min-h-[148px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84B78]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#9A4B69]">Option B</span>
                  <Palette className="w-4 h-4 text-[#9A4B69]" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="text-base font-semibold">Choose a Ready-Made Doll</div>
                  <p className="text-xs text-[#6A5764] mt-1">
                    Enter the fashion studio immediately
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A4B69]">
                  Enter Fashion Studio
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </div>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[340px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-[#EADCE3] bg-[#F3E6EC]">
              <img
                src="/src/assets/images/atelier_welcome_hero_1794849533466.jpg"
                alt="Luxury Parisian fashion atelier salon interior"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#231924]/92 via-[#231924]/55 to-transparent text-white">
                <p className="text-xs text-[#F4D0DF]">Rigged Parametric 3D Engine</p>
                <p className="font-display text-2xl font-semibold mt-0.5">
                  Identity-Preserving Facial Morphs, Full Skeleton & Beauty Salon
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready-Made Character Gallery */}
      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="flex items-end justify-between border-b border-[#EADCE3] pb-4 mb-6">
          <div>
            <h2 className="font-display text-3xl font-semibold text-[#231924]">
              Ready-Made Studio Dolls
            </h2>
            <p className="text-sm text-[#6A5764] mt-1">
              Select a prebuilt 3D character to customize outfits, makeup, nails, and poses right away.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView('characters')}
            className="text-sm font-medium text-[#C84B78] hover:underline whitespace-nowrap shrink-0"
          >
            View All Characters ({characters.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {characters.slice(0, 5).map((char) => (
            <div
              key={char.id}
              className="rounded-2xl bg-white border border-[#EADCE3] p-5 flex flex-col justify-between transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-display text-xl font-semibold text-[#231924] border border-[#EADCE3]"
                    style={{ backgroundColor: char.avatarBadgeColor }}
                  >
                    {char.name.slice(0, 1)}
                  </div>
                  <span className="text-xs text-[#6A5764]">
                    {char.source === 'ai_photos' ? 'AI Generated' : 'Atelier Preset'}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[#231924]">{char.name}</h3>
                <p className="text-xs text-[#6A5764] mt-1 line-clamp-2">
                  {char.identity.resemblanceSummary}
                </p>

                <div className="mt-3 text-xs text-[#7D6976]">
                  {char.identity.faceShape} face · {char.body.preset} frame
                </div>
              </div>

              <button
                type="button"
                onClick={() => selectCharacter(char.id, true)}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#F7ECF0] hover:bg-[#C84B78] text-[#231924] hover:text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Customize in Studio
              </button>
            </div>
          ))}
        </div>

        {/* Studio Capabilities Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[#EADCE3]">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#231924]">
              <UserCheck className="w-4 h-4 text-[#C84B78]" aria-hidden="true" />
              4-Angle Facial Morphometry
            </div>
            <p className="text-xs text-[#6A5764] mt-1.5 leading-relaxed">
              Front, left three-quarter, right three-quarter, and side profile photos are analyzed together to reconstruct consistent jawline, cheekbones, eyes, nose, and lips.
            </p>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#231924]">
              <Sparkles className="w-4 h-4 text-[#C84B78]" aria-hidden="true" />
              Full Skeletal & Facial Rig
            </div>
            <p className="text-xs text-[#6A5764] mt-1.5 leading-relaxed">
              Articulated neck, arms, 10 fingers, fingernails, legs, and blendshape expressions keep your character’s identity intact across every walk, dance, and pose.
            </p>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#231924]">
              <Palette className="w-4 h-4 text-[#C84B78]" aria-hidden="true" />
              Complete Wardrobe & Nail Salon
            </div>
            <p className="text-xs text-[#6A5764] mt-1.5 leading-relaxed">
              Mix couture dresses, separates, heels, hairstyles, custom ombre hair colors, professional makeup, per-finger nail art, jewelry, and photo backdrops.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
