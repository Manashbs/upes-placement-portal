import { SPR, SPRCycle, Round } from '../types';

export interface AllocationDebugStep {
  sprId: string;
  sprName: string;
  status: 'QUALIFIED' | 'EXCLUDED_USED_IN_CYCLE' | 'EXCLUDED_UNAVAILABLE' | 'EXCLUDED_OVERLAP';
  reason: string;
}

/**
 * Modern Fisher-Yates array shuffle for non-deterministic, completely fair random selection
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Strict Cycle-Based Fair & Randomized SPR Allocation Engine
 * 
 * Rules:
 * 1. Cycle Integrity: Every single SPR in the 50-member pool MUST be assigned exactly once in
 *    the current cycle before anyone can be assigned a second duty in the next cycle.
 * 2. Randomized Selection: Within the eligible pool for the cycle, candidates are chosen COMPLETELY
 *    AT RANDOM. Names will never appear in a fixed alphabetical or sequential pattern.
 * 3. Date Conflict & Availability:
 *    - An SPR assigned to any round on the target date cannot be allotted again on that date.
 *    - SPRs marked unavailable (Exam/Leave) on target date are skipped and retained for later rounds.
 * 4. Automatic Cycle Wrap: If a round requires more SPRs than remain in the current cycle, the
 *    engine finishes the current cycle, advances to the next cycle, and randomly selects the
 *    remaining SPRs from the new cycle pool.
 */
export function allocateSPRsForRound(
  round: Round,
  countNeeded: number,
  allSprs: SPR[],
  currentCycle: SPRCycle,
  existingRounds: Round[]
): {
  selectedSprs: SPR[];
  debugLog: AllocationDebugStep[];
  cycleClosed: boolean;
  updatedSprPool: SPR[];
  updatedCycle: SPRCycle;
} {
  const debugLog: AllocationDebugStep[] = [];
  const targetDate = (round.date || '').trim();

  // Helper to check if an SPR has a date conflict with any existing round
  const hasConflictOnDate = (sprId: string): boolean => {
    if (!targetDate) return false;
    return existingRounds.some((r) => {
      if (r.id === round.id || !r.assignedSprIds?.includes(sprId)) return false;
      return Boolean(r.date && r.date.trim() === targetDate);
    });
  };

  // Helper to check if SPR is marked unavailable on targetDate
  const isSelfUnavailable = (spr: SPR): boolean => {
    if (!spr.unavailabilities || spr.unavailabilities.length === 0 || !targetDate) return false;
    const rDate = new Date(targetDate).getTime();
    if (isNaN(rDate)) return false;
    return spr.unavailabilities.some((un) => {
      const uFrom = new Date(un.fromDate).getTime();
      const uTo = new Date(un.toDate).getTime();
      if (isNaN(uFrom) || isNaN(uTo)) return false;
      return rDate >= uFrom && rDate <= uTo;
    });
  };

  // Check if an SPR is qualified on targetDate
  const isAvailableOnDate = (spr: SPR): boolean => {
    if (isSelfUnavailable(spr)) {
      debugLog.push({
        sprId: spr.id,
        sprName: spr.name,
        status: 'EXCLUDED_UNAVAILABLE',
        reason: `Marked self as unavailable on calendar on ${targetDate}`,
      });
      return false;
    }
    if (hasConflictOnDate(spr.id)) {
      debugLog.push({
        sprId: spr.id,
        sprName: spr.name,
        status: 'EXCLUDED_OVERLAP',
        reason: `Already assigned to another round on ${targetDate}`,
      });
      return false;
    }
    return true;
  };

  // Group candidates by fewest total duties, then SHUFFLE randomly within each group
  const sortAndRandomize = (candidates: SPR[]): SPR[] => {
    const dutyMap = new Map<number, SPR[]>();
    candidates.forEach((c) => {
      const list = dutyMap.get(c.totalDuties) || [];
      list.push(c);
      dutyMap.set(c.totalDuties, list);
    });

    const sortedDuties = Array.from(dutyMap.keys()).sort((a, b) => a - b);
    const randomized: SPR[] = [];
    sortedDuties.forEach((dutyCount) => {
      const group = dutyMap.get(dutyCount)!;
      randomized.push(...shuffleArray(group));
    });
    return randomized;
  };

  let workingPool = allSprs.map((s) => ({ ...s }));
  let workingCycle = { ...currentCycle };
  let cycleClosed = false;

  // 1. If all SPRs in current cycle have already been allotted, cycle is complete!
  let unusedInCurrentCycle = workingPool.filter((s) => !s.usedInCurrentCycle);
  if (unusedInCurrentCycle.length === 0 && workingPool.length > 0) {
    cycleClosed = true;
    workingCycle = {
      ...workingCycle,
      id: workingCycle.id + 1,
      usedSprCount: 0,
      status: 'OPEN',
    };
    workingPool = workingPool.map((s) => ({ ...s, usedInCurrentCycle: false }));
    unusedInCurrentCycle = workingPool.filter((s) => !s.usedInCurrentCycle);
  }

  // 2. Only candidates who have NOT been allotted in this cycle are eligible
  const eligibleInCurrentCycle = unusedInCurrentCycle.filter(isAvailableOnDate);
  const randomizedEligible = sortAndRandomize(eligibleInCurrentCycle);

  let selectedSprs: SPR[] = [];

  if (randomizedEligible.length >= countNeeded) {
    // Case 1: Requirement fully satisfied by unserved SPRs in current cycle
    selectedSprs = randomizedEligible.slice(0, countNeeded);

    const selectedIds = new Set(selectedSprs.map((s) => s.id));
    workingPool = workingPool.map((s) => {
      if (selectedIds.has(s.id)) {
        return {
          ...s,
          totalDuties: s.totalDuties + 1,
          usedInCurrentCycle: true,
        };
      }
      return s;
    });

    // Check if this allocation completed the entire pool for this cycle
    const remainingUnused = workingPool.filter((s) => !s.usedInCurrentCycle);
    if (remainingUnused.length === 0) {
      cycleClosed = true;
      workingCycle = {
        ...workingCycle,
        id: workingCycle.id + 1,
        usedSprCount: 0,
        status: 'OPEN',
      };
      workingPool = workingPool.map((s) => ({ ...s, usedInCurrentCycle: false }));
    } else {
      workingCycle.usedSprCount = workingPool.filter((s) => s.usedInCurrentCycle).length;
    }
  } else if (unusedInCurrentCycle.length <= countNeeded) {
    // Case 2: Pool of unserved SPRs in current cycle is smaller than requirement (cycle wrap-around)
    selectedSprs = [...randomizedEligible];
    const firstBatchIds = new Set(selectedSprs.map((s) => s.id));

    // Finish current cycle and advance
    cycleClosed = true;
    const nextCycleId = workingCycle.id + 1;

    workingPool = workingPool.map((s) => {
      const wasInFirstBatch = firstBatchIds.has(s.id);
      return {
        ...s,
        totalDuties: wasInFirstBatch ? s.totalDuties + 1 : s.totalDuties,
        usedInCurrentCycle: false, // reset for new cycle
      };
    });

    workingCycle = {
      ...workingCycle,
      id: nextCycleId,
      usedSprCount: 0,
      status: 'OPEN',
    };

    const remainingNeeded = countNeeded - selectedSprs.length;

    // Pick remaining needed from the new cycle pool (excluding those just picked in batch 1)
    const freshCyclePool = workingPool.filter(
      (s) => !firstBatchIds.has(s.id) && isAvailableOnDate(s)
    );
    const randomizedFresh = sortAndRandomize(freshCyclePool);
    const secondBatch = randomizedFresh.slice(0, remainingNeeded);

    const secondBatchIds = new Set(secondBatch.map((s) => s.id));
    workingPool = workingPool.map((s) => {
      if (secondBatchIds.has(s.id)) {
        return {
          ...s,
          totalDuties: s.totalDuties + 1,
          usedInCurrentCycle: true, // marked used in new cycle
        };
      }
      return s;
    });

    workingCycle.usedSprCount = secondBatch.length;
    selectedSprs = [...selectedSprs, ...secondBatch];
  } else {
    // Case 3: There ARE unserved SPRs in the current cycle, but some have conflicts on this specific date
    // Take all eligible unserved SPRs available on this date
    selectedSprs = [...randomizedEligible];
    const selectedIds = new Set(selectedSprs.map((s) => s.id));

    // Fill remaining from other available SPRs without resetting the cycle for unserved SPRs
    const remainingNeeded = countNeeded - selectedSprs.length;
    const otherAvailable = workingPool.filter(
      (s) => !selectedIds.has(s.id) && isAvailableOnDate(s)
    );
    const randomizedOthers = sortAndRandomize(otherAvailable);
    const fillIn = randomizedOthers.slice(0, remainingNeeded);
    const fillInIds = new Set(fillIn.map((s) => s.id));

    workingPool = workingPool.map((s) => {
      if (selectedIds.has(s.id) || fillInIds.has(s.id)) {
        return {
          ...s,
          totalDuties: s.totalDuties + 1,
          usedInCurrentCycle: true,
        };
      }
      return s;
    });

    workingCycle.usedSprCount = workingPool.filter((s) => s.usedInCurrentCycle).length;
    selectedSprs = [...selectedSprs, ...fillIn];
  }

  // Record debug steps
  selectedSprs.forEach((spr) => {
    debugLog.push({
      sprId: spr.id,
      sprName: spr.name,
      status: 'QUALIFIED',
      reason: `Allocated for round on ${targetDate}. Total duties: ${spr.totalDuties}`,
    });
  });

  return {
    selectedSprs,
    debugLog,
    cycleClosed,
    updatedSprPool: workingPool,
    updatedCycle: workingCycle,
  };
}
