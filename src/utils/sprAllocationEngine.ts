import { SPR, SPRCycle, Round } from '../types';

export interface AllocationDebugStep {
  sprId: string;
  sprName: string;
  status: 'QUALIFIED' | 'EXCLUDED_USED_IN_CYCLE' | 'EXCLUDED_UNAVAILABLE' | 'EXCLUDED_OVERLAP';
  reason: string;
  score?: number;
}

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
  const activeCyclePool = allSprs;

  const candidatePool: { spr: SPR; score: number }[] = [];

  const roundStartMs = new Date(`${round.date}T${round.startTime}`).getTime();
  const roundEndMs = new Date(`${round.date}T${round.endTime}`).getTime();

  for (const spr of activeCyclePool) {
    // Rule 1: Check if already used in current cycle
    if (spr.usedInCurrentCycle) {
      debugLog.push({
        sprId: spr.id,
        sprName: spr.name,
        status: 'EXCLUDED_USED_IN_CYCLE',
        reason: `Already performed duty in Cycle #${currentCycle.id}`,
      });
      continue;
    }

    // Rule 2: Check explicit self-unavailability
    const isUnavailable = spr.unavailabilities.some((un) => {
      const uFrom = new Date(un.fromDate).getTime();
      const uTo = new Date(un.toDate).getTime();
      const rDate = new Date(round.date).getTime();
      return rDate >= uFrom && rDate <= uTo;
    });

    if (isUnavailable) {
      debugLog.push({
        sprId: spr.id,
        sprName: spr.name,
        status: 'EXCLUDED_UNAVAILABLE',
        reason: 'Marked self as unavailable on calendar (Exam/Leave)',
      });
      continue;
    }

    // Rule 3: Check overlapping round assignments
    const hasOverlap = existingRounds.some((r) => {
      if (r.id === round.id || !r.assignedSprIds.includes(spr.id)) return false;
      const rStart = new Date(`${r.date}T${r.startTime}`).getTime();
      const rEnd = new Date(`${r.date}T${r.endTime}`).getTime();
      return (roundStartMs < rEnd && roundEndMs > rStart);
    });

    if (hasOverlap) {
      debugLog.push({
        sprId: spr.id,
        sprName: spr.name,
        status: 'EXCLUDED_OVERLAP',
        reason: 'Assigned to another overlapping round at this venue/time',
      });
      continue;
    }

    // Soft ranking score: lower total duties = higher score priority
    const score = 100 - spr.totalDuties * 5 + Math.random() * 2;
    candidatePool.push({ spr, score });
    debugLog.push({
      sprId: spr.id,
      sprName: spr.name,
      status: 'QUALIFIED',
      reason: `Eligible. Total duties so far: ${spr.totalDuties}. Score: ${score.toFixed(1)}`,
      score,
    });
  }

  // Sort candidate pool descending by score
  candidatePool.sort((a, b) => b.score - a.score);

  const selectedSprs = candidatePool.slice(0, countNeeded).map((item) => item.spr);

  // Check if current cycle pool exhausted
  const remainingInCycle = allSprs.filter(
    (s) => !s.usedInCurrentCycle && !selectedSprs.some((sel) => sel.id === s.id)
  );

  const cycleClosed = remainingInCycle.length === 0;

  return {
    selectedSprs,
    debugLog,
    cycleClosed,
  };
}
