import { create } from 'zustand';
import {
  DEFAULT_LOOK,
  FASHION_CHALLENGES,
  FASHION_COLLECTIONS,
  PRESET_CHARACTERS,
  WARDROBE_CATALOG,
} from '../data/catalog';
import { applyGarmentSelection, evaluateChallengeLook, getStylistLevel } from '../utils/studioLogic';
import type {
  AnimationId,
  AppView,
  BackgroundId,
  BodyConfig,
  CameraPresetId,
  ChallengeEvaluation,
  CharacterProfile,
  ExpressionId,
  GarmentSelection,
  HairConfig,
  LightingPresetId,
  LookCustomization,
  MakeupConfig,
  NailConfig,
  NailFingerKey,
  SavedLook,
  SingleNailStyle,
  StudioCategoryId,
} from '../types/studio';

const STORAGE_KEY = 'atelier_lumiere_studio_v1';

interface PersistedState {
  characters: CharacterProfile[];
  activeCharacterId: string;
  savedLooks: SavedLook[];
  coins: number;
  xp: number;
  unlockedBadges: string[];
  completedChallengeIds: string[];
}

function loadPersistedState(): PersistedState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (Array.isArray(parsed.characters) && parsed.characters.length > 0) {
          return {
            characters: parsed.characters,
            activeCharacterId: parsed.activeCharacterId || parsed.characters[0].id,
            savedLooks: Array.isArray(parsed.savedLooks) ? parsed.savedLooks : [],
            coins: typeof parsed.coins === 'number' ? parsed.coins : 500,
            xp: typeof parsed.xp === 'number' ? parsed.xp : 80,
            unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
            completedChallengeIds: Array.isArray(parsed.completedChallengeIds) ? parsed.completedChallengeIds : [],
          };
        }
      }
    }
  } catch {
    // Fallback to initial seed data
  }
  return {
    characters: structuredClone(PRESET_CHARACTERS),
    activeCharacterId: PRESET_CHARACTERS[0].id,
    savedLooks: [],
    coins: 500,
    xp: 80,
    unlockedBadges: [],
    completedChallengeIds: [],
  };
}

function persistState(state: PersistedState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota errors
  }
}

interface StudioStore {
  view: AppView;
  activeCategory: StudioCategoryId;
  cameraPreset: CameraPresetId;
  photoMode: boolean;
  characters: CharacterProfile[];
  activeCharacterId: string;
  savedLooks: SavedLook[];
  undoStack: LookCustomization[];
  redoStack: LookCustomization[];
  coins: number;
  xp: number;
  unlockedBadges: string[];
  completedChallengeIds: string[];
  lastChallengeResult: { challengeId: string; evaluation: ChallengeEvaluation } | null;
  toastMessage: string | null;

  setView: (view: AppView) => void;
  setActiveCategory: (cat: StudioCategoryId) => void;
  setCameraPreset: (preset: CameraPresetId) => void;
  setPhotoMode: (enabled: boolean) => void;
  showToast: (msg: string) => void;

  getActiveCharacter: () => CharacterProfile;
  selectCharacter: (characterId: string, enterStudio?: boolean) => void;
  addGeneratedCharacter: (profile: CharacterProfile, enterStudio?: boolean) => void;
  updateCharacterBody: (characterId: string, body: BodyConfig) => void;
  renameCharacter: (characterId: string, name: string) => void;
  deleteCharacterPhotos: (characterId: string) => void;
  deleteCharacter: (characterId: string) => void;

  updateLook: (updater: (prev: LookCustomization) => LookCustomization, recordHistory?: boolean) => void;
  setGarment: (slot: 'dress' | 'top' | 'bottom' | 'outerwear' | 'shoes', sel: GarmentSelection | null) => void;
  updateHair: (partial: Partial<HairConfig>) => void;
  updateMakeup: (partial: Partial<MakeupConfig>) => void;
  updateNails: (partial: Partial<NailConfig>) => void;
  updateNailStyle: (style: Partial<SingleNailStyle>, targetFinger?: NailFingerKey) => void;
  updateJewelry: (partial: Partial<LookCustomization['jewelry']>) => void;
  updateAccessories: (partial: Partial<LookCustomization['accessories']>) => void;
  setBeautyProp: (propId: string | null) => void;
  setExpression: (expression: ExpressionId, intensity?: number) => void;
  setAnimation: (animation: AnimationId) => void;
  setBackground: (bg: BackgroundId) => void;
  setLighting: (lighting: LightingPresetId, intensity?: number) => void;
  applyCollection: (collectionId: string) => void;

  undo: () => void;
  redo: () => void;
  randomMakeover: () => void;
  resetLook: () => void;

  saveCurrentLook: (name: string) => void;
  applySavedLook: (lookId: string) => void;
  duplicateSavedLook: (lookId: string) => void;
  renameSavedLook: (lookId: string, name: string) => void;
  deleteSavedLook: (lookId: string) => void;

  submitChallenge: (challengeId: string) => ChallengeEvaluation;
  clearChallengeResult: () => void;
}

const initial = loadPersistedState();

function syncPersist(get: () => StudioStore) {
  const s = get();
  persistState({
    characters: s.characters,
    activeCharacterId: s.activeCharacterId,
    savedLooks: s.savedLooks,
    coins: s.coins,
    xp: s.xp,
    unlockedBadges: s.unlockedBadges,
    completedChallengeIds: s.completedChallengeIds,
  });
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  view: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1'
    ? 'studio'
    : 'home',
  activeCategory: 'dresses',
  cameraPreset: 'full_body',
  photoMode: false,
  characters: initial.characters,
  activeCharacterId: initial.activeCharacterId,
  savedLooks: initial.savedLooks,
  undoStack: [],
  redoStack: [],
  coins: initial.coins,
  xp: initial.xp,
  unlockedBadges: initial.unlockedBadges,
  completedChallengeIds: initial.completedChallengeIds,
  lastChallengeResult: null,
  toastMessage: null,

  setView: (view) => set({ view, photoMode: false }),
  setActiveCategory: (activeCategory) => {
    let nextCam: CameraPresetId = get().cameraPreset;
    if (activeCategory === 'makeup' || activeCategory === 'hairstyles' || activeCategory === 'expressions') {
      nextCam = 'portrait';
    } else if (activeCategory === 'nails') {
      nextCam = 'manicure';
    } else if (activeCategory === 'shoes') {
      nextCam = 'shoes';
    } else {
      nextCam = 'full_body';
    }
    set({ activeCategory, cameraPreset: nextCam });
  },
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setPhotoMode: (photoMode) => set({ photoMode }),
  showToast: (toastMessage) => {
    set({ toastMessage });
    setTimeout(() => {
      if (get().toastMessage === toastMessage) {
        set({ toastMessage: null });
      }
    }, 3200);
  },

  getActiveCharacter: () => {
    const s = get();
    return s.characters.find((c) => c.id === s.activeCharacterId) ?? s.characters[0];
  },

  selectCharacter: (characterId, enterStudio = false) => {
    set((s) => ({
      activeCharacterId: characterId,
      undoStack: [],
      redoStack: [],
      view: enterStudio ? 'studio' : s.view,
    }));
    syncPersist(get);
  },

  addGeneratedCharacter: (profile, enterStudio = true) => {
    set((s) => ({
      characters: [profile, ...s.characters],
      activeCharacterId: profile.id,
      undoStack: [],
      redoStack: [],
      view: enterStudio ? 'studio' : s.view,
    }));
    syncPersist(get);
  },

  updateCharacterBody: (characterId, body) => {
    set((s) => ({
      characters: s.characters.map((c) => (c.id === characterId ? { ...c, body } : c)),
    }));
    syncPersist(get);
  },

  renameCharacter: (characterId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      characters: s.characters.map((c) => (c.id === characterId ? { ...c, name: trimmed } : c)),
    }));
    syncPersist(get);
  },

  deleteCharacterPhotos: (characterId) => {
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === characterId ? { ...c, referenceThumbnails: undefined } : c,
      ),
    }));
    syncPersist(get);
    get().showToast('Reference photographs removed while preserving 3D character.');
  },

  deleteCharacter: (characterId) => {
    const s = get();
    if (s.characters.length <= 1) {
      get().showToast('At least one character must remain in your studio.');
      return;
    }
    const remaining = s.characters.filter((c) => c.id !== characterId);
    const nextActive = s.activeCharacterId === characterId ? remaining[0].id : s.activeCharacterId;
    set({
      characters: remaining,
      activeCharacterId: nextActive,
      savedLooks: s.savedLooks.filter((l) => l.characterId !== characterId),
    });
    syncPersist(get);
  },

  updateLook: (updater, recordHistory = true) => {
    set((s) => {
      const char = s.characters.find((c) => c.id === s.activeCharacterId) ?? s.characters[0];
      const prevLook = char.currentLook;
      const nextLook = updater(structuredClone(prevLook));
      const nextChars = s.characters.map((c) =>
        c.id === char.id ? { ...c, currentLook: nextLook } : c,
      );
      return {
        characters: nextChars,
        undoStack: recordHistory ? [...s.undoStack.slice(-24), structuredClone(prevLook)] : s.undoStack,
        redoStack: recordHistory ? [] : s.redoStack,
      };
    });
    syncPersist(get);
  },

  setGarment: (slot, sel) => {
    get().updateLook((prev) => applyGarmentSelection(prev, slot, sel));
  },

  updateHair: (partial) => {
    get().updateLook((prev) => ({
      ...prev,
      hair: { ...prev.hair, ...partial },
    }));
  },

  updateMakeup: (partial) => {
    get().updateLook((prev) => ({
      ...prev,
      makeup: { ...prev.makeup, ...partial },
    }));
  },

  updateNails: (partial) => {
    get().updateLook((prev) => ({
      ...prev,
      nails: { ...prev.nails, ...partial },
    }));
  },

  updateNailStyle: (style, targetFinger) => {
    get().updateLook((prev) => {
      const nails = structuredClone(prev.nails);
      if (nails.applyToAll && !targetFinger) {
        nails.uniformStyle = { ...nails.uniformStyle, ...style };
        for (const k of Object.keys(nails.perFinger) as NailFingerKey[]) {
          nails.perFinger[k] = { ...nails.uniformStyle };
        }
      } else {
        const finger = targetFinger ?? nails.activeFinger;
        nails.perFinger[finger] = { ...nails.perFinger[finger], ...style };
      }
      return { ...prev, nails };
    });
  },

  updateJewelry: (partial) => {
    get().updateLook((prev) => ({
      ...prev,
      jewelry: { ...prev.jewelry, ...partial },
    }));
  },

  updateAccessories: (partial) => {
    get().updateLook((prev) => ({
      ...prev,
      accessories: { ...prev.accessories, ...partial },
    }));
  },

  setBeautyProp: (beautyPropId) => {
    get().updateLook((prev) => ({ ...prev, beautyPropId }));
  },

  setExpression: (expression, intensity) => {
    get().updateLook((prev) => ({
      ...prev,
      expression,
      expressionIntensity: intensity ?? prev.expressionIntensity,
    }), false);
  },

  setAnimation: (animation) => {
    get().updateLook((prev) => ({ ...prev, animation }), false);
  },

  setBackground: (background) => {
    get().updateLook((prev) => ({ ...prev, background }), false);
  },

  setLighting: (lighting, intensity) => {
    get().updateLook((prev) => ({
      ...prev,
      lighting,
      lightingIntensity: intensity ?? prev.lightingIntensity,
    }), false);
  },

  applyCollection: (collectionId) => {
    const col = FASHION_COLLECTIONS.find((c) => c.id === collectionId);
    if (!col) return;
    get().updateLook((prev) => ({
      ...prev,
      ...structuredClone(col.lookPreset),
      hair: col.lookPreset.hair ? { ...prev.hair, ...col.lookPreset.hair } : prev.hair,
      jewelry: col.lookPreset.jewelry ? { ...prev.jewelry, ...col.lookPreset.jewelry } : prev.jewelry,
      accessories: col.lookPreset.accessories ? { ...prev.accessories, ...col.lookPreset.accessories } : prev.accessories,
    }));
    get().showToast(`Applied ${col.name}`);
  },

  undo: () => {
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const char = s.characters.find((c) => c.id === s.activeCharacterId) ?? s.characters[0];
      const previous = s.undoStack[s.undoStack.length - 1];
      return {
        characters: s.characters.map((c) =>
          c.id === char.id ? { ...c, currentLook: previous } : c,
        ),
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, structuredClone(char.currentLook)],
      };
    });
    syncPersist(get);
  },

  redo: () => {
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const char = s.characters.find((c) => c.id === s.activeCharacterId) ?? s.characters[0];
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        characters: s.characters.map((c) =>
          c.id === char.id ? { ...c, currentLook: next } : c,
        ),
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, structuredClone(char.currentLook)],
      };
    });
    syncPersist(get);
  },

  randomMakeover: () => {
    const dresses = WARDROBE_CATALOG.filter((i) => i.category === 'dresses');
    const tops = WARDROBE_CATALOG.filter((i) => i.category === 'tops');
    const bottoms = WARDROBE_CATALOG.filter((i) => i.category === 'bottoms');
    const shoes = WARDROBE_CATALOG.filter((i) => i.category === 'shoes');
    const hairs = WARDROBE_CATALOG.filter((i) => i.category === 'hairstyles');
    const bags = WARDROBE_CATALOG.filter((i) => i.category === 'accessories' && i.subType.startsWith('bag'));

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const palette = ['#D97B9B', '#C7B8EA', '#E59A84', '#3B234A', '#F3C1D8', '#231924', '#C49A6C', '#B8395F'];
    const hairColors = ['#1E171C', '#4A2E23', '#D7B684', '#A64D3E', '#E8D5EE', '#C59258'];
    const useDress = Math.random() > 0.45;
    const d = pick(dresses);
    const t = pick(tops);
    const b = pick(bottoms);
    const sh = pick(shoes);
    const hr = pick(hairs);
    const bg = pick(bags);

    get().updateLook((prev) => ({
      ...prev,
      dress: useDress ? { id: d.id, color: pick(palette), finish: d.defaultFinish ?? 'silk' } : null,
      top: useDress ? null : { id: t.id, color: pick(palette), finish: t.defaultFinish ?? 'satin' },
      bottom: useDress ? null : { id: b.id, color: pick(palette), finish: b.defaultFinish ?? 'matte' },
      shoes: { id: sh.id, color: pick(palette), finish: sh.defaultFinish ?? 'leather' },
      hair: {
        ...prev.hair,
        styleId: hr.id,
        primaryColor: pick(hairColors),
      },
      makeup: {
        ...prev.makeup,
        eyeshadowColor: pick(['#C98A9E', '#B79CED', '#D6A456', '#8BA7C4']),
        lipColor: pick(['#C84B78', '#9D3B4C', '#D95F8B', '#B84C54']),
      },
      accessories: {
        ...prev.accessories,
        bagId: bg.id,
        bagColor: pick(palette),
      },
    }));
    get().showToast('Random makeover styled!');
  },

  resetLook: () => {
    const active = get().getActiveCharacter();
    const preset = PRESET_CHARACTERS.find((p) => p.id === active.id);
    const baseLook = preset ? structuredClone(preset.currentLook) : structuredClone(DEFAULT_LOOK);
    get().updateLook(() => baseLook);
    get().showToast('Look reset to signature style.');
  },

  saveCurrentLook: (name) => {
    const trimmed = name.trim() || `Look #${get().savedLooks.length + 1}`;
    const char = get().getActiveCharacter();
    const newLook: SavedLook = {
      id: `look_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      characterId: char.id,
      name: trimmed,
      createdAt: new Date().toISOString().slice(0, 10),
      tags: [char.currentLook.dress ? 'Dress' : 'Separates', char.currentLook.background],
      customization: structuredClone(char.currentLook),
    };
    set((s) => ({ savedLooks: [newLook, ...s.savedLooks] }));
    syncPersist(get);
    get().showToast(`Saved "${trimmed}" to Saved Looks.`);
  },

  applySavedLook: (lookId) => {
    const look = get().savedLooks.find((l) => l.id === lookId);
    if (!look) return;
    get().updateLook(() => structuredClone(look.customization));
    set({ view: 'studio' });
    get().showToast(`Applied "${look.name}".`);
  },

  duplicateSavedLook: (lookId) => {
    const look = get().savedLooks.find((l) => l.id === lookId);
    if (!look) return;
    const copy: SavedLook = {
      ...structuredClone(look),
      id: `look_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${look.name} (Copy)`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set((s) => ({ savedLooks: [copy, ...s.savedLooks] }));
    syncPersist(get);
  },

  renameSavedLook: (lookId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      savedLooks: s.savedLooks.map((l) => (l.id === lookId ? { ...l, name: trimmed } : l)),
    }));
    syncPersist(get);
  },

  deleteSavedLook: (lookId) => {
    set((s) => ({
      savedLooks: s.savedLooks.filter((l) => l.id !== lookId),
    }));
    syncPersist(get);
  },

  submitChallenge: (challengeId) => {
    const challenge = FASHION_CHALLENGES.find((c) => c.id === challengeId) ?? FASHION_CHALLENGES[0];
    const char = get().getActiveCharacter();
    const evaluation = evaluateChallengeLook(char.currentLook, challenge);

    set((s) => {
      const alreadyDone = s.completedChallengeIds.includes(challenge.id);
      const nextCoins = s.coins + (alreadyDone && evaluation.passed ? 40 : evaluation.earnedCoins);
      const nextXp = s.xp + (alreadyDone && evaluation.passed ? 20 : evaluation.earnedXp);
      const nextBadges =
        evaluation.passed && !s.unlockedBadges.includes(challenge.badgeTitle)
          ? [...s.unlockedBadges, challenge.badgeTitle]
          : s.unlockedBadges;
      const nextCompleted =
        evaluation.passed && !alreadyDone
          ? [...s.completedChallengeIds, challenge.id]
          : s.completedChallengeIds;

      const prevLvl = getStylistLevel(s.xp).level;
      const newLvl = getStylistLevel(nextXp).level;
      if (newLvl > prevLvl) {
        setTimeout(() => get().showToast(`Level Up! You reached Stylist Level ${newLvl}`), 300);
      }

      return {
        coins: nextCoins,
        xp: nextXp,
        unlockedBadges: nextBadges,
        completedChallengeIds: nextCompleted,
        lastChallengeResult: { challengeId: challenge.id, evaluation },
      };
    });
    syncPersist(get);
    return evaluation;
  },

  clearChallengeResult: () => set({ lastChallengeResult: null }),
}));
