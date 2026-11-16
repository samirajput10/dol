import { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Crown,
  Download,
  Eye,
  Footprints,
  Gem,
  Hand,
  Image as ImageIcon,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Shirt,
  ShoppingBag,
  Shuffle,
  Smile,
  Sparkles,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { DollViewport, type DollViewportHandle } from '../three/DollViewport';
import type { CameraPresetId, StudioCategoryId } from '../types/studio';
import { BeautyStudioPanel } from './studio/BeautyStudioPanel';
import { ScenePosePanel } from './studio/ScenePosePanel';
import { WardrobePanel } from './studio/WardrobePanel';

const CATEGORIES: Array<{ id: StudioCategoryId; label: string; icon: typeof Shirt }> = [
  { id: 'collections', label: 'Collections', icon: Crown },
  { id: 'dresses', label: 'Dresses', icon: Sparkles },
  { id: 'tops', label: 'Tops', icon: Shirt },
  { id: 'bottoms', label: 'Bottoms', icon: Shirt },
  { id: 'outerwear', label: 'Outerwear', icon: Shirt },
  { id: 'shoes', label: 'Shoes', icon: Footprints },
  { id: 'hairstyles', label: 'Hairstyles', icon: Scissors },
  { id: 'makeup', label: 'Makeup', icon: Palette },
  { id: 'nails', label: 'Nail Salon', icon: Hand },
  { id: 'jewelry', label: 'Jewelry', icon: Gem },
  { id: 'accessories', label: 'Accessories', icon: ShoppingBag },
  { id: 'beauty_props', label: 'Beauty Props', icon: Eye },
  { id: 'expressions', label: 'Expressions', icon: Smile },
  { id: 'backgrounds', label: 'Backgrounds', icon: ImageIcon },
];

const CAMERA_PRESETS: Array<{ id: CameraPresetId; label: string }> = [
  { id: 'full_body', label: 'Full Body' },
  { id: 'portrait', label: 'Face' },
  { id: 'side_profile', label: 'Side' },
  { id: 'back_view', label: 'Back' },
  { id: 'manicure', label: 'Nails' },
  { id: 'shoes', label: 'Shoes' },
];

export function FashionStudioView() {
  const activeChar = useStudioStore((s) => s.getActiveCharacter)();
  const activeCategory = useStudioStore((s) => s.activeCategory);
  const setActiveCategory = useStudioStore((s) => s.setActiveCategory);
  const cameraPreset = useStudioStore((s) => s.cameraPreset);
  const setCameraPreset = useStudioStore((s) => s.setCameraPreset);
  const photoMode = useStudioStore((s) => s.photoMode);
  const setPhotoMode = useStudioStore((s) => s.setPhotoMode);
  const undoStack = useStudioStore((s) => s.undoStack);
  const redoStack = useStudioStore((s) => s.redoStack);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const randomMakeover = useStudioStore((s) => s.randomMakeover);
  const resetLook = useStudioStore((s) => s.resetLook);
  const saveCurrentLook = useStudioStore((s) => s.saveCurrentLook);

  const viewportRef = useRef<DollViewportHandle | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [lookName, setLookName] = useState('');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const activeCategoryLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'Studio';

  const handleCapture = () => {
    const dataUrl = viewportRef.current?.captureScreenshot();
    if (dataUrl) {
      setCapturedPhotoUrl(dataUrl);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#FCF9F7] overflow-hidden">
      {/* Main 3-Pane Studio Workspace (stacked vertically on mobile, 3-pane on md+) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT SIDEBAR: Categories (horizontal scrollable strip on mobile, vertical sidebar on desktop) */}
        {!photoMode && (
          <aside
            aria-label="Customization categories"
            className="order-2 md:order-1 w-full md:w-44 lg:w-52 shrink-0 bg-white border-y md:border-y-0 md:border-r border-[#EADCE3] overflow-x-auto md:overflow-y-auto studio-scroll p-2 md:p-2.5 flex flex-row md:flex-col gap-1.5 md:gap-1 md:space-y-0"
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 md:w-full px-3 py-2 md:py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 md:gap-2.5 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#231924] text-white font-semibold'
                      : 'text-[#5E4D58] hover:bg-[#F7ECF0] hover:text-[#231924]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </aside>
        )}

        {/* CENTER 3D CHARACTER VIEWPORT */}
        <section className="order-1 md:order-2 h-[40vh] min-h-[250px] md:h-auto md:flex-1 min-w-0 relative bg-[#F7EEF2] flex flex-col shrink-0 md:shrink">
          {/* Compact Top Stage Controls */}
          <div className="px-3 md:px-4 py-2 md:py-2.5 bg-white/95 border-b border-[#EADCE3] flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="text-xs text-[#5E4D58] truncate">
              <strong className="text-[#231924] font-semibold">{activeChar.name}</strong>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{activeChar.identity.faceShape} face</span>
              <span className="hidden sm:inline">
                <span className="mx-1.5" aria-hidden="true">·</span>
                Drag to rotate 360°
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {CAMERA_PRESETS.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    cameraPreset === cam.id
                      ? 'bg-[#C84B78] text-white'
                      : 'bg-[#F7ECF0] text-[#5E4D58] hover:text-[#231924]'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => viewportRef.current?.zoomBy(0.85)}
                className="p-1.5 rounded-lg bg-[#F7ECF0] text-[#231924] hover:bg-[#EED9E2]"
              >
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => viewportRef.current?.zoomBy(1.18)}
                className="p-1.5 rounded-lg bg-[#F7ECF0] text-[#231924] hover:bg-[#EED9E2]"
              >
                <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <DollViewport
              ref={viewportRef}
              identity={activeChar.identity}
              body={activeChar.body}
              look={activeChar.currentLook}
              cameraPreset={cameraPreset}
            />

            {photoMode && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white border border-[#EADCE3] px-4 py-2.5 rounded-2xl shadow-lg z-20">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="px-4 py-2 rounded-xl bg-[#C84B78] text-white text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#B23D67]"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  Capture Studio Photo
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#F7ECF0] text-[#231924] text-xs font-semibold hover:bg-[#EED9E2]"
                >
                  Exit Photo Mode
                </button>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Selected Category Controls */}
        {!photoMode && (
          <aside
            aria-label="Customization items"
            className="order-3 flex-1 min-h-0 md:flex-initial w-full md:w-72 lg:w-88 shrink-0 bg-white md:border-l border-[#EADCE3] flex flex-col overflow-hidden"
          >
            <div className="px-4 py-2.5 md:py-3 border-b border-[#EADCE3] flex items-center justify-between">
              <h2 className="font-display text-lg md:text-xl font-semibold text-[#231924]">
                {activeCategoryLabel}
              </h2>
              <span className="text-[11px] text-[#7D6976]">Live 3D Preview</span>
            </div>

            <div className="flex-1 overflow-y-auto studio-scroll p-3 md:p-4">
              {activeCategory === 'hairstyles' || activeCategory === 'makeup' || activeCategory === 'nails' ? (
                <BeautyStudioPanel mode={activeCategory} />
              ) : activeCategory === 'expressions' || activeCategory === 'backgrounds' ? (
                <ScenePosePanel mode={activeCategory} />
              ) : (
                <WardrobePanel category={activeCategory} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* BOTTOM STUDIO TOOLBAR */}
      {!photoMode && (
        <footer className="h-12 md:h-14 px-3 md:px-5 bg-white border-t border-[#EADCE3] flex items-center justify-between gap-2 md:gap-4 shrink-0 overflow-x-auto studio-scroll">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={undo}
              className="px-3 py-1.5 rounded-xl border border-[#EADCE3] text-xs font-medium text-[#231924] hover:bg-[#F7ECF0] disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              Undo
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={redo}
              className="px-3 py-1.5 rounded-xl border border-[#EADCE3] text-xs font-medium text-[#231924] hover:bg-[#F7ECF0] disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
              Redo
            </button>
            <button
              type="button"
              onClick={randomMakeover}
              className="px-3 py-1.5 rounded-xl bg-[#F7ECF0] text-xs font-semibold text-[#231924] hover:bg-[#EED9E2] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#C84B78]" aria-hidden="true" />
              Random Makeover
            </button>
            <button
              type="button"
              onClick={resetLook}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-[#EADCE3] text-xs font-medium text-[#5E4D58] hover:text-[#231924] items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            {showSaveForm ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveCurrentLook(lookName);
                  setLookName('');
                  setShowSaveForm(false);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={lookName}
                  onChange={(e) => setLookName(e.target.value)}
                  placeholder="Look name..."
                  aria-label="Look name"
                  className="px-2.5 py-1.5 rounded-lg border border-[#D8C7D1] text-xs w-36"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#231924] text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Save
                </button>
                <button
                  type="button"
                  aria-label="Cancel save"
                  onClick={() => setShowSaveForm(false)}
                  className="p-1.5 text-[#6A5764]"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                className="px-4 py-1.5 rounded-xl bg-[#231924] text-white text-xs font-semibold hover:bg-[#38293A] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                Save Outfit
              </button>
            )}

            <button
              type="button"
              onClick={() => setPhotoMode(true)}
              className="px-4 py-1.5 rounded-xl bg-[#C84B78] text-white text-xs font-semibold hover:bg-[#B23D67] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              Photo Mode
            </button>
          </div>
        </footer>
      )}

      {/* SCREENSHOT CAPTURE MODAL */}
      {capturedPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-[#231924]/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#EADCE3]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-2xl font-semibold text-[#231924]">
                Studio Snapshot Ready
              </h3>
              <button
                type="button"
                aria-label="Close snapshot preview"
                onClick={() => setCapturedPhotoUrl(null)}
                className="p-1.5 rounded-lg text-[#6A5764] hover:bg-[#F7ECF0]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-[#EADCE3] bg-[#F7EEF2] aspect-video">
              <img
                src={capturedPhotoUrl}
                alt={`${activeChar.name} studio photograph`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCapturedPhotoUrl(null)}
                className="px-4 py-2 rounded-xl border border-[#EADCE3] text-xs font-semibold text-[#5E4D58]"
              >
                Close
              </button>
              <a
                href={capturedPhotoUrl}
                download={`${activeChar.name.toLowerCase().replace(/\s+/g, '_')}_atelier_look.png`}
                className="px-4 py-2 rounded-xl bg-[#C84B78] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Download PNG
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
