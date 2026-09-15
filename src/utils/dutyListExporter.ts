import * as XLSX from 'xlsx';
import { Company, Round, SPR, SPRDutyAssignment } from '../types';

export interface VenueSprGroup {
  venue: string;
  sprs: SPR[];
}

function createFallbackSpr(id: string, name?: string): SPR {
  return {
    id,
    studentId: id,
    sapId: id,
    name: name || id,
    email: `${id}@stu.upes.ac.in`,
    phone: 'N/A',
    branch: 'B.Tech CSE',
    totalDuties: 0,
    usedInCurrentCycle: false,
    unavailabilities: [],
  };
}

/**
 * Returns structured venue breakdown for any round.
 * Guarantees equal distribution across venues if not explicitly pre-assigned.
 */
export function getRoundVenueBreakdown(
  round: Round,
  dutyAssignments: SPRDutyAssignment[] = [],
  allSprs: SPR[] = []
): VenueSprGroup[] {
  // 1. Determine list of venues
  let venues: string[] = [];
  if (round.venues && round.venues.length > 0) {
    venues = round.venues.filter(Boolean);
  } else if (round.venue) {
    venues = round.venue
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (venues.length === 0) {
    venues = ['Campus Venue'];
  }

  const assignedSprIds = round.assignedSprIds || [];
  const venueMap: Record<string, SPR[]> = {};
  venues.forEach((v) => {
    venueMap[v] = [];
  });

  const accountedSprIds = new Set<string>();

  // 2. If round has explicit venueAssignments stored, add those
  if (round.venueAssignments && round.venueAssignments.length > 0) {
    round.venueAssignments.forEach((va) => {
      const v = venues.includes(va.venue) ? va.venue : venues[0];
      (va.sprIds || []).forEach((id) => {
        if (assignedSprIds.includes(id) && !accountedSprIds.has(id)) {
          const spr = allSprs.find((s) => s.id === id) || createFallbackSpr(id);
          venueMap[v].push(spr);
          accountedSprIds.add(id);
        }
      });
    });
  }

  // 3. Check dutyAssignments for this round to recover any assigned SPRs
  const roundDuties = dutyAssignments.filter((d) => d.roundId === round.id);
  roundDuties.forEach((d) => {
    if (assignedSprIds.includes(d.sprId) && !accountedSprIds.has(d.sprId)) {
      const v = d.venue && venues.includes(d.venue.trim()) ? d.venue.trim() : venues[0];
      const spr = allSprs.find((s) => s.id === d.sprId) || createFallbackSpr(d.sprId, d.sprName);
      venueMap[v].push(spr);
      accountedSprIds.add(d.sprId);
    }
  });

  // 4. ANY remaining SPR in assignedSprIds MUST be distributed equally across all venues
  // This guarantees that if venueAssignments was partial or empty, ALL assigned SPRs are displayed!
  const remainingSprIds = assignedSprIds.filter((id) => !accountedSprIds.has(id));
  remainingSprIds.forEach((id) => {
    // Pick the venue that currently has the fewest assigned SPRs
    const targetVenue = venues.reduce((best, curr) => {
      return (venueMap[curr].length < venueMap[best].length) ? curr : best;
    }, venues[0]);

    const spr = allSprs.find((s) => s.id === id) || createFallbackSpr(id);
    venueMap[targetVenue].push(spr);
    accountedSprIds.add(id);
  });

  return venues.map((v) => ({
    venue: v,
    sprs: venueMap[v] || [],
  }));
}

/**
 * Downloads formatted Excel Duty List for a specific company process.
 */
export function exportCompanyDutyListExcel({
  company,
  rounds,
  dutyAssignments = [],
  sprs = [],
}: {
  company: Company;
  rounds: Round[];
  dutyAssignments?: SPRDutyAssignment[];
  sprs?: SPR[];
}): void {
  const compRounds = rounds
    .filter((r) => r.companyId === company.id || r.companyName === company.name)
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));

  const rows: any[] = [];
  let serial = 1;

  compRounds.forEach((rnd) => {
    const breakdown = getRoundVenueBreakdown(rnd, dutyAssignments, sprs);

    breakdown.forEach((bg) => {
      if (bg.sprs.length === 0) {
        rows.push({
          'S.No': serial++,
          Company: company.name,
          Date: rnd.date || 'TBD',
          'Round #': `Round ${rnd.roundNumber}`,
          'Round Name': rnd.name,
          'Assigned Venue': bg.venue,
          'Time / Shift': 'Full Day',
          'SPR Name': 'No SPR Assigned Yet',
          'SPR SAP ID': '-',
          Branch: '-',
          'Phone / Contact': '-',
          Email: '-',
          'Duty Status': 'PENDING',
          'Attendance / Signature': '',
        });
      } else {
        bg.sprs.forEach((spr) => {
          rows.push({
            'S.No': serial++,
            Company: company.name,
            Date: rnd.date || 'TBD',
            'Round #': `Round ${rnd.roundNumber}`,
            'Round Name': rnd.name,
            'Assigned Venue': bg.venue,
            'Time / Shift': 'Full Day',
            'SPR Name': spr.name,
            'SPR SAP ID': spr.sapId || spr.id,
            Branch: spr.branch || 'B.Tech CSE',
            'Phone / Contact': spr.phone || 'N/A',
            Email: spr.email || `${spr.sapId || 'spr'}@stu.upes.ac.in`,
            'Duty Status': 'CONFIRMED',
            'Attendance / Signature': '',
          });
        });
      }
    });
  });

  if (rows.length === 0) {
    rows.push({
      'S.No': 1,
      Company: company.name,
      Date: 'TBD',
      'Round #': '-',
      'Round Name': 'No rounds scheduled',
      'Assigned Venue': '-',
      'Time / Shift': '-',
      'SPR Name': 'None',
      'SPR SAP ID': '-',
      Branch: '-',
      'Phone / Contact': '-',
      Email: '-',
      'Duty Status': '-',
      'Attendance / Signature': '',
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for optimal printing and spreadsheet reading
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Company
    { wch: 12 }, // Date
    { wch: 10 }, // Round #
    { wch: 32 }, // Round Name
    { wch: 26 }, // Assigned Venue
    { wch: 14 }, // Time / Shift
    { wch: 22 }, // SPR Name
    { wch: 14 }, // SPR SAP ID
    { wch: 22 }, // Branch
    { wch: 16 }, // Phone
    { wch: 26 }, // Email
    { wch: 14 }, // Duty Status
    { wch: 24 }, // Signature
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SPR Duty Roster');

  const safeCompName = (company.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `UPES_SPR_Duty_List_${safeCompName}.xlsx`);
}

/**
 * Generates formatted WhatsApp announcement string for placement coordinators.
 * Sequenced by Round 1, Round 2, ...
 * Prints only the SPR names under each venue without SAP IDs and without time.
 */
export function generateWhatsAppDutyRoster({
  company,
  rounds,
  dutyAssignments = [],
  sprs = [],
}: {
  company: Company;
  rounds: Round[];
  dutyAssignments?: SPRDutyAssignment[];
  sprs?: SPR[];
}): string {
  const compRounds = rounds
    .filter((r) => r.companyId === company.id || r.companyName === company.name)
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));

  let text = `📢 *UPES CAREER SERVICES & PLACEMENT CELL*\n`;
  text += `📋 *SPR OFFICIAL DUTY ROSTER*\n`;
  text += `🏢 *Company:* ${company.name}\n`;
  text += `📅 *Drive Date:* ${compRounds[0]?.date || 'Placement Day'}\n`;
  text += `-----------------------------------------\n\n`;

  compRounds.forEach((rnd) => {
    const cleanName = rnd.name
      .replace(new RegExp(`^Round\\s*${rnd.roundNumber}\\s*[:\\-]?\\s*`, 'i'), '')
      .trim();
    text += `🔹 *Round ${rnd.roundNumber}: ${cleanName || rnd.name}*\n`;

    const breakdown = getRoundVenueBreakdown(rnd, dutyAssignments, sprs);
    breakdown.forEach((bg) => {
      text += `📍 *Venue:* ${bg.venue} (${bg.sprs.length} SPR${bg.sprs.length === 1 ? '' : 's'})\n`;
      if (bg.sprs.length === 0) {
        text += `   _(None assigned)_\n`;
      } else {
        bg.sprs.forEach((spr) => {
          text += `   • ${spr.name}\n`;
        });
      }
    });
    text += `\n`;
  });

  text += `⚠️ *Instructions for SPRs:*\n`;
  text += `1. Report at designated venue 30 minutes prior in formal attire with UPES ID card.\n`;
  text += `2. Ensure your mobile scanner is ready for candidate attendance.\n`;
  text += `3. Any emergency swaps must be approved by Career Services Officer.`;

  return text;
}
