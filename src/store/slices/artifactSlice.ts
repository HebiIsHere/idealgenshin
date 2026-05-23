import { create } from 'zustand';
import type { ArtifactInstance, ShowcaseCharacter } from '../../types';
import { ArtifactSlotType } from '../../types';
import { MAIN_STAT_MAX_VALUES, MAIN_STAT_BY_SLOT } from '../../data/constants';
import { generateId } from '../../utils/helper';

/**
 * Artifact slice — manages 5 artifact instances, Enka import state,
 * and showcase character selection.
 */

interface ArtifactState {
  /** 5 artifact instances indexed by slot. */
  artifacts: Record<ArtifactSlotType, ArtifactInstance | null>;
  /** Whether an Enka import is in progress. */
  isImporting: boolean;
  /** Last import error message. */
  importError: string | null;
  /** Showcase characters loaded from Enka (all characters in showcase). */
  showcaseCharacters: ShowcaseCharacter[];
  /** Index of the currently selected showcase character. */
  selectedShowcaseIdx: number;
}

interface ArtifactActions {
  /** Update a specific artifact slot. */
  setArtifact: (slot: ArtifactSlotType, artifact: ArtifactInstance | null) => void;
  /** Update a specific artifact's sub-stats. */
  updateSubStats: (slot: ArtifactSlotType, subStats: ArtifactInstance['subStats']) => void;
  /** Set all 5 artifacts at once (e.g. from Enka import). */
  setAllArtifacts: (artifacts: ArtifactInstance[]) => void;
  /** Set import state. */
  setImporting: (importing: boolean) => void;
  /** Set import error. */
  setImportError: (error: string | null) => void;
  /** Set showcase characters (overwrite on each new import). */
  setShowcaseCharacters: (chars: ShowcaseCharacter[]) => void;
  /** Select a showcase character by index; auto-fills artifacts. */
  selectShowcaseCharacter: (idx: number) => void;
  /** Clear all artifacts. */
  clearAll: () => void;
  /** Reset state. */
  reset: () => void;
}

/** Create a default artifact for a given slot with no sub-stats. */
export function createDefaultArtifact(slot: ArtifactSlotType): ArtifactInstance {
  const validMainStats = MAIN_STAT_BY_SLOT[slot];
  const mainStatType = validMainStats[0];
  return {
    id: generateId(),
    slot,
    mainStatType,
    mainStatValue: MAIN_STAT_MAX_VALUES[mainStatType] ?? 0,
    subStats: [],
    setName: '',
  };
}

const emptyArtifacts: Record<ArtifactSlotType, ArtifactInstance | null> = {
  [ArtifactSlotType.FLOWER]: null,
  [ArtifactSlotType.FEATHER]: null,
  [ArtifactSlotType.SANDS]: null,
  [ArtifactSlotType.GOBLET]: null,
  [ArtifactSlotType.CIRCLET]: null,
};

const initialState: ArtifactState = {
  artifacts: { ...emptyArtifacts },
  isImporting: false,
  importError: null,
  showcaseCharacters: [],
  selectedShowcaseIdx: 0,
};

export const useArtifactStore = create<ArtifactState & ArtifactActions>((set) => ({
  ...initialState,

  setArtifact: (slot, artifact) =>
    set((state) => ({
      artifacts: { ...state.artifacts, [slot]: artifact },
    })),

  updateSubStats: (slot, subStats) =>
    set((state) => {
      const existing = state.artifacts[slot];
      if (!existing) return state;
      return {
        artifacts: {
          ...state.artifacts,
          [slot]: { ...existing, subStats },
        },
      };
    }),

  setAllArtifacts: (artifacts) =>
    set(() => {
      const newArtifacts = { ...emptyArtifacts };
      for (const artifact of artifacts) {
        newArtifacts[artifact.slot] = artifact;
      }
      return { artifacts: newArtifacts, importError: null };
    }),

  setImporting: (importing) => set({ isImporting: importing }),
  setImportError: (error) => set({ importError: error }),

  setShowcaseCharacters: (chars) =>
    set({
      showcaseCharacters: chars,
      selectedShowcaseIdx: 0,
    }),

  selectShowcaseCharacter: (idx) =>
    set((state) => {
      const chars = state.showcaseCharacters;
      if (idx < 0 || idx >= chars.length) return state;

      const selectedChar = chars[idx];
      const newArtifacts = { ...emptyArtifacts };

      // Fill artifacts by slot from the selected character
      for (const artifact of selectedChar.artifacts) {
        newArtifacts[artifact.slot] = artifact;
      }

      return {
        selectedShowcaseIdx: idx,
        artifacts: newArtifacts,
        importError: null,
      };
    }),

  clearAll: () => set({ artifacts: { ...emptyArtifacts } }),
  reset: () => set(initialState),
}));
