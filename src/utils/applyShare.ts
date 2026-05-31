import type { SharePayload } from './share';
import { restoreArtifacts } from './buildLoader';
import { getWeaponById } from '../data/weapons';
import { useCharacterStore } from '../store/slices/characterSlice';
import { useArtifactStore } from '../store/slices/artifactSlice';

/** Apply a SharePayload to all relevant zustand stores — full replica of the shared config. */
export function applySharePayload(payload: SharePayload): void {
  const cs = useCharacterStore.getState();
  cs.selectCharacter(payload.characterId);

  // Character data loads async; defer dependent state so character base stats are available
  setTimeout(() => {
    cs.setCharacterLevel(payload.characterLevel);
    cs.setSkillMultiplier(payload.skillMultiplier ?? 1.0);
    cs.setReactionType(payload.reactionType as any);
    if (payload.amplifyingMultiplier) cs.setAmplifyingMultiplier(payload.amplifyingMultiplier);

    const wd = getWeaponById(payload.weaponId);
    if (wd) {
      cs.setWeaponConfig(wd, payload.weaponLevel, payload.weaponRefinement);
      cs.setWeaponPassiveBonus(payload.weaponPassive ?? {});
    }

    cs.setConstellationConfig(payload.constellationLevel, payload.constellationBonus ?? {});
    cs.setTalentConfig(payload.talentBonus ?? {});

    if (payload.setBonus && Object.keys(payload.setBonus).length > 0) {
      cs.setSetBonus(payload.setBonus);
    }

    if ((payload.teamBuffs ?? []).length > 0) {
      // Clear existing team buffs then re-add
      const state = useCharacterStore.getState();
      for (let i = state.teamBuffs.length - 1; i >= 0; i--) {
        state.removeTeamBuff(i);
      }
      for (const tb of payload.teamBuffs!) {
        cs.addTeamBuff({ name: tb.name, statType: tb.statType as any, value: tb.value });
      }
    }

    if ((payload.statConversions ?? []).length > 0) {
      cs.setStatConversions(payload.statConversions.map((c: any) => ({
        from: c.from, to: c.to, ratio: c.ratio, maxCap: c.maxCap,
      })));
    }

    const restored = restoreArtifacts(payload);
    if (restored.length > 0) {
      useArtifactStore.getState().setAllArtifacts(restored);
    }
  }, 200);
}
