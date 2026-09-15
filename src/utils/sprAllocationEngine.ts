import { SPR, SPRCycle, Round } from '../types';

export interface AllocationDebugStep {
  sprId: string;
  sprName: string;
  status: 'QUALIFIED' | 'EXCLUDED_USED_IN_CYCLE' | 'EXCLUDED_UNAVAILABLE' | 'EXCLUDED_OVERLAP';
  reason: string;
  score?: number;
}

/**
 * Fair SPR Allocation Engine
 * 
 * Rules:
 * 1. Date Conflict Prevention: If an SPR is already allotted to any process/round on the target date,
 *    do not allot them to any other process/round on that date.
 * 2. Duty Cycle & Balance:
 *    - Maintain cycle order where every SPR gets a duty before a second duty is assigned.
 *    - Prioritize SPRs with fewer total duties (totalDuties ascending).
 *    - If an SPR cannot be allotted on date X (conflict or shortage), allot the next available SPR,
 *      and prioritize the skipped SPR in the next process due to their lower duty count.
 * 3. Cycle Advancement: When all available SPRs have served in the cycle, advance cycle and reset flags.
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
} {
  const debugLog: AllocationDebugStep[] = [];
  const targetDate = (round.date || '').trim();

  const roundStartMs = round.startTime ? new Date(`${targetDate}T${round.startTime}`).getTime() : 0;
  const roundEndMs = round.endTime ? new Date(`${targetDate}T${round.endTime}`).getTime() : 0;

  // Evaluate SPR eligibility
  const evaluateSprs = (sprList: SPR[], allowUsedInCycle: boolean) => {
    const eligible: { spr: SPR; originalIndex: number }[] = [];

    sprList.forEach((spr, idx) => {
      // 1. Cycle usage check
      if (!allowUsedInCycle && spr.usedInCurrentCycle) {
        debugLog.push({
          sprId: spr.id,
          sprName: spr.name,
          status: 'EXCLUDED_USED_IN_CYCLE',
          reason: `Already performed duty in Cycle #${currentCycle.id}`,
        });
        return;
      }

      // 2. Check explicit self-unavailability
      const isUnavailable = spr.unavailabilities?.some((un) => {
        const uFrom = new Date(un.fromDate).getTime();
        const uTo = new Date(un.toDate).getTime();
        const rDate = new Date(targetDate).getTime();
        return rDate >= uFrom && rDate <= uTo;
      });

      if (isUnavailable) {
        debugLog.push({
          sprId: spr.id,
          sprName: spr.name,
          status: 'EXCLUDED_UNAVAILABLE',
          reason: `Marked self as unavailable on calendar (Exam/Leave) on ${targetDate}`,
        });
        return;
      }

      // 3. Strict same-date conflict check across other processes & rounds
      const hasDateConflict = existingRounds.some((r) => {
        if (r.id === round.id || !r.assignedSprIds?.includes(spr.id)) return false;
        
        // Exact same date match -> STRICT CONFLICT: do not allot duty on same date
        if (r.date && targetDate && r.date.trim() === targetDate) {
          return true;
        }

        // Overlapping time window if dates overlap or match
        if (roundStartMs && roundEndMs && r.startTime && r.endTime) {
          const rStart = new Date(`${r.date}T${r.startTime}`).getTime();
          const rEnd = new Date(`${r.date}T${r.endTime}`).getTime();
          if (!isNaN(rStart) && !isNaN(rEnd) && !isNaN(roundStartMs) && !isNaN(roundEndMs)) {
            return roundStartMs < rEnd && roundEndMs > rStart;
          }
        }

        return false;
      });

      if (hasDateConflict) {
        debugLog.push({
          sprId: spr.id,
          sprName: spr.name,
          status: 'EXCLUDED_OVERLAP',
          reason: `Already allotted to another placement process round on ${targetDate}`,
        });
        return;
      }

      eligible.push({ spr, originalIndex: idx });
      debugLog.push({
        sprId: spr.id,
        sprName: spr.name,
        status: 'QUALIFIED',
        reason: `Eligible for duty on ${targetDate}. Total duties so far: ${spr.totalDuties}`,
      });
    });

    return eligible;
  };

  // Sort eligible candidates by fairness:
  // 1. SPRs with fewest totalDuties first (ascending)
  // 2. Used in cycle status (unused first)
  // 3. Original roster order (preserves orderly round-robin queue)
  const sortCandidates = (items: { spr: SPR; originalIndex: number }[]) => {
    return items.sort((a, b) => {
      // Fewest duties first
      if (a.spr.totalDuties !== b.spr.totalDuties) {
        return a.spr.totalDuties - b.spr.totalDuties;
      }
      // Unused in cycle first
      if (a.spr.usedInCurrentCycle !== b.spr.usedInCurrentCycle) {
        return a.spr.usedInCurrentCycle ? 1 : -1;
      }
      // Stable roster order
      return a.originalIndex - b.originalIndex;
    });
  };

  // Pass 1: Try with SPRs unused in the current cycle
  let eligiblePool = evaluateSprs(allSprs, false);
  let sortedPool = sortCandidates(eligiblePool);

  let selectedSprs = sortedPool.slice(0, countNeeded).map((item) => item.spr);
  let cycleClosed = false;

  // Pass 2: If available unused SPRs in this cycle are fewer than needed,
  // wrap/close the cycle and pick remaining from the remaining pool
  if (selectedSprs.length < countNeeded && allSprs.length > selectedSprs.length) {
    cycleClosed = true;
    const remainingNeeded = countNeeded - selectedSprs.length;
    const alreadySelectedIds = new Set(selectedSprs.map((s) => s.id));
    const unselectedSprs = allSprs.filter((s) => !alreadySelectedIds.has(s.id));

    const extraEligible = evaluateSprs(unselectedSprs, true);
    const sortedExtra = sortCandidates(extraEligible);

    const extraSelected = sortedExtra.slice(0, remainingNeeded).map((item) => item.spr);
    selectedSprs = [...selectedSprs, ...extraSelected];
  } else {
    // Check if remaining eligible SPRs in current cycle are now 0
    const remainingInCycle = allSprs.filter(
      (s) => !s.usedInCurrentCycle && !selectedSprs.some((sel) => sel.id === s.id)
    );
    cycleClosed = remainingInCycle.length === 0;
  }

  return {
    selectedSprs,
    debugLog,
    cycleClosed,
  };
}
