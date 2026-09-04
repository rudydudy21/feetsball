import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

export const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID || '', jwt);

const asString = (value: unknown) => String(value ?? '').trim();

const normalizeGameId = (value: unknown): string =>
  asString(value)
    .replace(/\.0$/, '')
    .replace(/^0+(?=\d)/, '');

export const CONFIG = {
  CFBD_KEY: process.env.CFBD_KEY || '',
  ODDS_KEY: process.env.ODDS_KEY || '',
  YEAR: Number(process.env.YEAR || new Date().getFullYear()),
};

const parseSpreadValue = (value: unknown) => {
  const raw = asString(value).trim();
  if (!raw || raw === 'PUSH') return 0;
  const cleaned = raw.replace(/[^0-9.+-]/g, '');
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getSpreadResultForPick = (game: { AwayTeam?: string; HomeTeam?: string; Spread?: string | number; AwayPoints?: number; HomePoints?: number }, selectedTeam: string) => {
  if (!game) return null;

  const selectedKey = normalizeTeamKey(selectedTeam);
  const awayKey = normalizeTeamKey(game.AwayTeam);
  const homeKey = normalizeTeamKey(game.HomeTeam);
  if (!selectedKey || (!awayKey && !homeKey)) return null;

  const spread = parseSpreadValue(game.Spread);
  const awayPoints = Number(game.AwayPoints ?? 0);
  const homePoints = Number(game.HomePoints ?? 0);

  const selectedSideMargin = selectedKey === awayKey
    ? awayPoints - homePoints
    : selectedKey === homeKey
      ? homePoints - awayPoints
      : 0;

  const selectedSideSpread = selectedKey === awayKey ? -spread : spread;
  const adjustedMargin = selectedSideMargin + selectedSideSpread;

  if (adjustedMargin > 0) return 'correct';
  if (adjustedMargin === 0) return 'push';
  return 'incorrect';
};

const normalizeTeamKey = (value: unknown) =>
  asString(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function normalizeUsername(value: unknown) {
  return asString(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_-]/g, '');
}

export function normalizePin(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return '';
  if (/^\d{1,4}$/.test(raw)) {
    return raw.padStart(4, '0');
  }
  return raw;
}

export function isValidUsername(value: unknown) {
  const normalized = normalizeUsername(value);
  return /^[a-z0-9][a-z0-9_-]{2,19}$/.test(normalized);
}

export async function getSheetByTitle(title: string) {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    throw new Error(`Google Sheet titled "${title}" was not found.`);
  }
  return sheet;
}

export async function getSettingsValue(cell: string) {
  const sheet = await getSheetByTitle('Settings');
  await sheet.loadCells(cell);
  return sheet.getCellByA1(cell).value;
}

export async function getCurrentWeek() {
  const currentWeek = await getSettingsValue('B2');
  if (currentWeek == null || asString(currentWeek) === '') {
    throw new Error('Current week is not defined in Settings!B2');
  }
  return asString(currentWeek);
}

export async function getCurrentYear() {
  const currentYear = await getSettingsValue('B4');
  const parsedYear = Number(currentYear ?? '');

  if (Number.isFinite(parsedYear) && parsedYear > 0) {
    return parsedYear;
  }

  if (Number.isFinite(CONFIG.YEAR) && CONFIG.YEAR > 0) {
    return CONFIG.YEAR;
  }

  return new Date().getFullYear();
}

export async function getWeeklySlate() {
  const sheet = await getSheetByTitle('Weekly_Slate');
  const rows = await sheet.getRows();

  return rows.map((row) => ({
    GameID: row.get('GameID'),
    AwayTeam: row.get('AwayTeam'),
    AwayLogo: row.get('AwayLogo'),
    AwayRank: row.get('AwayRank')?.toString() || null,
    HomeTeam: row.get('HomeTeam'),
    HomeLogo: row.get('HomeLogo'),
    HomeRank: row.get('HomeRank')?.toString() || null,
    Spread: row.get('Spread'),
    Kickoff_Time: row.get('Kickoff_Time'),
    AwayPoints: Number(row.get('AwayPoints') ?? 0),
    HomePoints: Number(row.get('HomePoints') ?? 0),
    Status: row.get('Status'),
  }));
}

export async function getUserPicks(username: string, pin: string) {
  const normalizedUsername = normalizeUsername(username);
  const trimmedPin = normalizePin(pin);
  const currentWeek = await getCurrentWeek().catch(() => '');

  const loadRows = async (sheetName: string) => {
    try {
      const sheet = await getSheetByTitle(sheetName);
      const rows = await sheet.getRows();
      return rows;
    } catch {
      return [] as any[];
    }
  };

  const rowsBySheet = await Promise.all([
    loadRows('Picks'),
    loadRows('User_Picks'),
  ]);

  const allMatchingRows: Array<{ gameId: string; team: string; wager: number; week: string; submittedAt: number }> = [];

  for (const rows of rowsBySheet) {
    for (const row of rows) {
      const rowUsername = normalizeUsername(row.get('Username'));
      const rowPin = normalizePin(row.get('PIN'));
      const rowWeek = asString(row.get('Week'));
      if (rowUsername !== normalizedUsername || rowPin !== trimmedPin) continue;
      if (currentWeek && rowWeek && rowWeek !== currentWeek) continue;

      const gameId = asString(row.get('GameID'));
      const team = asString(row.get('Selection') || row.get('Team'));
      const wager = Number(row.get('Wager') ?? 0);
      const submittedAt = Date.parse(asString(row.get('SubmittedAt') || row.get('Timestamp') || '')) || 0;

      if (!gameId || !team) continue;

      const normalizedGameId = normalizeGameId(gameId);
      if (!normalizedGameId) continue;

      allMatchingRows.push({
        gameId: normalizedGameId,
        team,
        wager: Number.isFinite(wager) ? wager : 0,
        week: rowWeek,
        submittedAt,
      });
    }
  }

  const seenGameIds = new Set<string>();
  const seenWagers = new Set<number>();
  const newestFiveDistinct: Array<{ gameId: string; team: string; wager: number; week: string }> = [];

  for (const row of [...allMatchingRows].sort((a, b) => b.submittedAt - a.submittedAt)) {
    if (seenGameIds.has(row.gameId)) continue;
    if (row.wager > 0 && seenWagers.has(row.wager)) continue;

    seenGameIds.add(row.gameId);
    if (row.wager > 0) seenWagers.add(row.wager);

    newestFiveDistinct.push({
      gameId: row.gameId,
      team: row.team,
      wager: row.wager,
      week: row.week,
    });

    if (newestFiveDistinct.length >= 5) break;
  }

  return newestFiveDistinct;
}

export async function submitUserPicks(
  userInfo: { username: string; pin: string },
  picks: Array<{ gameId: string; team: string; wager: number; spread?: string | number | null }>,
) {
  const username = normalizeUsername(userInfo.username);
  const pin = normalizePin(userInfo.pin);
  const week = await getCurrentWeek();
  const sheet = await getSheetByTitle('Picks');
  const rows = await sheet.getRows();

  for (const row of rows) {
    const rowUsername = normalizeUsername(row.get('Username'));
    const rowPin = normalizePin(row.get('PIN'));
    const rowWeek = asString(row.get('Week'));

    if (rowUsername === username && rowPin === pin && rowWeek === week) {
      await row.delete();
    }
  }

  const timestamp = new Date().toISOString();

  for (const pick of picks) {
    if (!pick.gameId || !pick.team) continue;

    const spreadVal = pick.spread !== undefined && pick.spread !== null ? String(pick.spread) : '';

    await sheet.addRow({
      Username: username,
      PIN: pin,
      Week: week,
      GameID: pick.gameId,
      Selection: pick.team,
      Wager: Number(pick.wager) || 0,
      Spread: spreadVal,
      Timestamp: timestamp,
      SubmittedAt: timestamp,
    });
  }

  let logSheet = doc.sheetsByTitle['Submission_Log'];
  if (!logSheet) {
    logSheet = await doc.addSheet({ title: 'Submission_Log' });
    await logSheet.setHeaderRow([
      'SubmissionTimestamp',
      'Username',
      'PIN',
      'Week',
      'GameID',
      'Selection',
      'Spread',
      'Wager',
      'SubmittedAt',
      'SubmissionType',
      'Status',
      'Notes',
    ]);
  }

  for (const pick of picks) {
    if (!pick.gameId || !pick.team) continue;

    const spreadVal = pick.spread !== undefined && pick.spread !== null ? String(pick.spread) : '';

    await logSheet.addRow({
      SubmissionTimestamp: timestamp,
      Username: username,
      PIN: pin,
      Week: week,
      GameID: pick.gameId,
      Selection: pick.team,
      Spread: spreadVal,
      Wager: Number(pick.wager) || 0,
      SubmittedAt: timestamp,
      SubmissionType: 'Picks Submit',
      Status: 'Accepted',
      Notes: 'User submitted current week selection',
    });
  }

  return { success: true, week, submitted: picks.length };
}

export const getEasternNow = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

export const isPastSaturdayNoonET = () => {
  const now = getEasternNow();
  const day = now.getDay();
  return (day === 6 && now.getHours() >= 12) || day === 0;
};

export async function getArchivedWeeks(): Promise<number[]> {
  try {
    await doc.loadInfo();
    const archiveSheet = doc.sheetsByTitle['Master_Archive'];
    if (!archiveSheet) return [];
    const rows = await archiveSheet.getRows();
    const weeks = new Set<number>();
    for (const r of rows) {
      const w = Number(r.get('Week') || (Array.isArray(r.get('values')) ? r.get('values')?.[0] : null) || 0);
      if (Number.isFinite(w) && w > 0) {
        weeks.add(w);
      }
    }
    return Array.from(weeks).sort((a, b) => a - b);
  } catch (error) {
    console.error('Failed to get archived weeks:', error);
    return [];
  }
}

export async function getMasterArchiveGames(): Promise<Array<{
  Week: string;
  GameID: string;
  AwayTeam: string;
  HomeTeam: string;
  Spread: string | number;
  AwayPoints: number;
  HomePoints: number;
  Status: string;
  Winner_Against_Spread?: string;
}>> {
  try {
    await doc.loadInfo();
    const archiveSheet = doc.sheetsByTitle['Master_Archive'];
    if (!archiveSheet) return [];
    const rows = await archiveSheet.getRows();
    return rows.map((row) => ({
      Week: asString(row.get('Week')),
      GameID: asString(row.get('GameID')),
      AwayTeam: asString(row.get('AwayTeam')),
      HomeTeam: asString(row.get('HomeTeam')),
      Spread: row.get('Spread') ?? '',
      AwayPoints: Number(row.get('AwayPoints') ?? 0),
      HomePoints: Number(row.get('HomePoints') ?? 0),
      Status: asString(row.get('Status')) || 'Final',
      Winner_Against_Spread: asString(row.get('Winner_Against_Spread') || row.get('Winner')),
    }));
  } catch (error) {
    console.error('Failed to get master archive games:', error);
    return [];
  }
}

export async function getWeeklyResultsForWeek(week: string) {
  const weekNum = Number(week);
  const isBowlWeek = weekNum >= 12 && weekNum <= 14;

  const currentWeek = await getCurrentWeek().catch(() => '1');
  const currentWeekNum = Number(currentWeek);

  const isPastSatNoon = isPastSaturdayNoonET();
  const shouldHidePicks =
    Number.isFinite(currentWeekNum) &&
    (weekNum > currentWeekNum || (weekNum === currentWeekNum && !isPastSatNoon));

  if (shouldHidePicks) {
    return {
      picksHidden: true,
      week,
      currentWeek,
      isArchived: false,
      data: [],
    };
  }

  const [weeklySlate, archivedGames, archivedWeeks] = await Promise.all([
    getWeeklySlate().catch(() => [] as Awaited<ReturnType<typeof getWeeklySlate>>),
    getMasterArchiveGames().catch(() => [] as Awaited<ReturnType<typeof getMasterArchiveGames>>),
    getArchivedWeeks().catch(() => [] as number[]),
  ]);

  const isArchived = archivedWeeks.includes(weekNum);

  const slateByGameId = new Map<string, any>();
  // Archived games first
  for (const game of archivedGames) {
    slateByGameId.set(asString(game.GameID), {
      ...game,
      Status: 'Final',
    });
  }
  // Active weekly slate overrides or adds
  for (const game of weeklySlate) {
    slateByGameId.set(asString(game.GameID), game);
  }

  // Get all registered users
  const usersSheet = await getSheetByTitle('Users');
  const usersRows = await usersSheet.getRows();

  const picksSheet = await getSheetByTitle('Picks');
  const pickRows = await picksSheet.getRows();
  const weeklyPicks = pickRows.filter((row) => asString(row.get('Week')) === week);

  // Track which users submitted picks for this week
  const usersWithPicks = new Set<string>();

  const byUser = new Map<string, { username: string; picks: Record<number, { selection: string; outcome: string }>; total: number }>();

  for (const row of weeklyPicks) {
    const username = asString(row.get('Username'));
    const gameId = asString(row.get('GameID'));
    const selection = asString(row.get('Selection'));
    const wager = Number(row.get('Wager') ?? 0);

    if (!username || !gameId || !selection) continue;

    usersWithPicks.add(username);

    const game = slateByGameId.get(gameId);
    const isFinal = game && asString(game.Status).toLowerCase() === 'final';
    const numericWager = Number.isFinite(wager) ? Math.max(1, Math.round(wager)) : 1;

    let outcome: 'correct' | 'incorrect' | 'push' | 'pending' = 'pending';
    let delta = 0;

    if (isFinal && game) {
      const spreadResult = getSpreadResultForPick(game, selection);
      if (spreadResult === 'correct') {
        outcome = 'correct';
        delta = numericWager;
      } else if (spreadResult === 'push') {
        outcome = 'push';
        delta = 0;
      } else if (spreadResult === 'incorrect') {
        outcome = 'incorrect';
        delta = -numericWager;
      }
    }

    if (!byUser.has(username)) {
      byUser.set(username, { username, picks: {}, total: 0 });
    }

    const userEntry = byUser.get(username)!;
    userEntry.picks[numericWager] = { selection, outcome };
    userEntry.total += delta;
  }

  // Add users who didn't submit picks with bye/penalty logic
  for (const userRow of usersRows) {
    const username = asString(userRow.get('Username'));
    if (usersWithPicks.has(username)) continue; // Already processed

    const byeWeekUsed = asString(userRow.get('ByeWeekUsed')).toUpperCase() === 'TRUE';
    let penalty = 0;

    if (isBowlWeek) {
      // Championship weeks (12-14): always -15, no bye
      penalty = -15;
    } else if (!byeWeekUsed) {
      // First missed week (non-championship): use bye week, 0 penalty
      penalty = 0;
      // Update user's ByeWeekUsed to TRUE
      userRow.set('ByeWeekUsed', 'TRUE');
      await userRow.save();
    } else {
      // Already used bye (non-championship): -5 penalty
      penalty = -5;
    }

    byUser.set(username, { username, picks: {}, total: penalty });
  }

  const sortedData = Array.from(byUser.values()).sort((a, b) => b.total - a.total);

  return {
    data: sortedData,
    isArchived,
    week,
    currentWeek,
  };
}

export async function getSeasonResults() {
  const [pickRows, weeklySlate, archivedGames, archivedWeeks, usersRows, currentWeek] = await Promise.all([
    getSheetByTitle('Picks').then((s) => s.getRows()).catch(() => [] as any[]),
    getWeeklySlate().catch(() => [] as Awaited<ReturnType<typeof getWeeklySlate>>),
    getMasterArchiveGames().catch(() => [] as Awaited<ReturnType<typeof getMasterArchiveGames>>),
    getArchivedWeeks().catch(() => [] as number[]),
    getSheetByTitle('Users').then((s) => s.getRows()).catch(() => [] as any[]),
    getCurrentWeek().catch(() => '1'),
  ]);

  const currentWeekNum = Number(currentWeek);

  const slateByGameId = new Map<string, any>();
  // Archived historical games
  for (const game of archivedGames) {
    slateByGameId.set(asString(game.GameID), {
      ...game,
      Status: 'Final',
    });
  }
  // Current active weekly slate
  for (const game of weeklySlate) {
    slateByGameId.set(asString(game.GameID), game);
  }

  const userTotals = new Map<string, { username: string; weeks: Record<number, number>; total: number }>();

  // Initialize all users
  for (const userRow of usersRows) {
    const username = asString(userRow.get('Username'));
    if (!userTotals.has(username)) {
      userTotals.set(username, { username, weeks: {}, total: 0 });
    }
  }

  // Track which users have submissions per week
  const userWeeksSubmitted = new Map<string, Set<number>>();
  for (const userRow of usersRows) {
    userWeeksSubmitted.set(asString(userRow.get('Username')), new Set());
  }

  // Process all picks
  for (const row of pickRows) {
    const username = asString(row.get('Username'));
    const week = Number(asString(row.get('Week')) || 0);
    const gameId = asString(row.get('GameID'));
    const selection = asString(row.get('Selection'));
    const wager = Number(row.get('Wager') ?? 0);

    if (!username || !week || !gameId || !selection) continue;

    if (!userTotals.has(username)) {
      userTotals.set(username, { username, weeks: {}, total: 0 });
    }

    userWeeksSubmitted.get(username)?.add(week);

    const game = slateByGameId.get(gameId);
    const points = game && asString(game.Status).toLowerCase() === 'final'
      ? (() => {
          const spreadResult = getSpreadResultForPick(game, selection);
          const numericWager = Number.isFinite(wager) ? Math.max(1, Math.round(wager)) : 1;
          if (spreadResult === 'correct') return numericWager;
          if (spreadResult === 'push') return 0;
          if (spreadResult === 'incorrect') return -numericWager;
          return 0;
        })()
      : 0;

    const entry = userTotals.get(username)!;
    entry.weeks[week] = (entry.weeks[week] ?? 0) + points;
    entry.total += points;
  }

  // Apply bye-week and missed-week penalties for weeks that have passed
  for (const userRow of usersRows) {
    const username = asString(userRow.get('Username'));
    const byeWeekUsed = asString(userRow.get('ByeWeekUsed')).toUpperCase() === 'TRUE';
    const userSubmittedWeeks = userWeeksSubmitted.get(username) || new Set();
    const entry = userTotals.get(username)!;

    let byeWeekUsedThisSeason = byeWeekUsed;

    // Check weeks 1 through currentWeek - 1 (completed weeks only)
    for (let w = 1; w < currentWeekNum; w++) {
      if (userSubmittedWeeks.has(w)) continue; // User submitted for this week

      const isBowlWeek = w >= 12 && w <= 14;

      if (isBowlWeek) {
        // Championship weeks: always -15, no bye applies
        entry.weeks[w] = -15;
        entry.total += -15;
      } else if (!byeWeekUsedThisSeason) {
        // First missed non-championship week: use bye, 0 penalty
        entry.weeks[w] = 0;
        byeWeekUsedThisSeason = true;
      } else {
        // Already used bye: -5 penalty for non-championship weeks
        entry.weeks[w] = -5;
        entry.total += -5;
      }
    }
  }

  const sortedData = Array.from(userTotals.values()).sort((a, b) => b.total - a.total);

  return {
    data: sortedData,
    archivedWeeks,
    currentWeek: currentWeekNum,
  };
}

export async function getLeagueMasterCode() {
  const value = await getSettingsValue('B3');
  return asString(value).toUpperCase();
}

export async function getAllRegisteredParticipants(): Promise<Array<{ username: string; email: string }>> {
  try {
    const usersSheet = await getSheetByTitle('Users');
    const rows = await usersSheet.getRows();
    const participants: Array<{ username: string; email: string }> = [];
    const seenEmails = new Set<string>();

    for (const row of rows) {
      const username = asString(row.get('Username'));
      const email = asString(row.get('Email')).toLowerCase();
      if (email && email.includes('@') && !seenEmails.has(email)) {
        seenEmails.add(email);
        participants.push({
          username: username || email.split('@')[0],
          email,
        });
      }
    }
    return participants;
  } catch (error) {
    console.error('Failed to get registered participants from Users sheet:', error);
    return [];
  }
}

export async function getUserByUsername(username: string) {
  const usersSheet = await getSheetByTitle('Users');
  const rows = await usersSheet.getRows();
  return rows.find((row) => asString(row.get('Username')).toLowerCase() === username.trim().toLowerCase());
}

export async function registerUser(user: { username: string; email: string; pin: string }) {
  const usersSheet = await getSheetByTitle('Users');
  const rows = await usersSheet.getRows();
  const normalizedUsername = normalizeUsername(user.username);

  if (!isValidUsername(normalizedUsername)) {
    return {
      success: false,
      error: 'Username must be 3-20 characters using letters, numbers, underscores, or hyphens.',
    };
  }

  const usernameExists = rows.some(
    (row) => normalizeUsername(row.get('Username')) === normalizedUsername,
  );

  if (usernameExists) {
    return { success: false, error: 'Username already taken' };
  }

  await usersSheet.addRow({
    Username: normalizedUsername,
    Email: user.email.trim().toLowerCase(),
    PIN: normalizePin(user.pin),
    Created: new Date().toLocaleString(),
    ByeWeekUsed: 'FALSE',
  });

  return { success: true };
}

export async function fetchTop25Games(week: string | number) {
  const year = await getCurrentYear();
  const url = `https://api.collegefootballdata.com/games?year=${year}&week=${week}&seasonType=regular`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CONFIG.CFBD_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`CFBD games request failed: ${response.status} ${response.statusText}`);
  }

  const allGames = (await response.json()) as Array<Record<string, any>>;
  const rankMap: Record<string, number> = {};

  try {
    const rankUrl = `https://api.collegefootballdata.com/rankings?year=${year}&week=${week}`;
    const rankResponse = await fetch(rankUrl, {
      headers: {
        Authorization: `Bearer ${CONFIG.CFBD_KEY}`,
      },
    });

    if (!rankResponse.ok) {
      console.warn(`AP rankings fetch failed for year ${year}, week ${week}: ${rankResponse.status} ${rankResponse.statusText}. No games loaded.`);
      return { games: [], rankMap: {} };
    }

    const rankData = (await rankResponse.json()) as Array<Record<string, any>>;
    const poll = rankData[0]?.polls?.find(
      (entry: Record<string, any>) =>
        entry?.poll === 'AP Top 25' || entry?.poll === 'Playoff Committee Rankings',
    );

    if (!poll || !Array.isArray(poll.ranks) || poll.ranks.length === 0) {
      console.warn(`No AP Top 25 rankings available for year ${year}, week ${week}. No games loaded.`);
      return { games: [], rankMap: {} };
    }

    poll.ranks.forEach((rank: Record<string, any>) => {
      if (rank?.school) {
        rankMap[rank.school] = Number(rank.rank || 0);
      }
    });

    const topTeams = Object.keys(rankMap);
    const filteredGames = allGames.filter(
      (game) =>
        (topTeams.includes(game.homeTeam || game.home_team || '') ||
          topTeams.includes(game.awayTeam || game.away_team || '')) &&
        !game.completed,
    );

    return { games: filteredGames, rankMap };
  } catch (error) {
    console.warn(`Rankings fetch failed for year ${year}, week ${week}. No games loaded.`, error);
    return { games: [], rankMap: {} };
  }
}

export async function populateWeeklySlate(
  games: Array<Record<string, any>>,
  rankMap: Record<string, number> = {},
  spreadMap: OddsMatchup[] | Record<string, string | number> = [],
) {
  if (!games || !Array.isArray(games) || games.length === 0) {
    return { games: 0, created: false };
  }

  let sheet = doc.sheetsByTitle['Weekly_Slate'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'Weekly_Slate' });
  }

  await sheet.clear();

  const headers = [
    'GameID',
    'AwayRank',
    'AwayTeam',
    'AwayID',
    'AwayLogo',
    'HomeRank',
    'HomeTeam',
    'HomeID',
    'HomeLogo',
    'Spread',
    'Kickoff_Time',
    'AwayPoints',
    'HomePoints',
    'Status',
  ];

  await sheet.setHeaderRow(headers);

  const rows = games.map((game) => {
    const aId = game.AwayID || game.awayId || game.away_id || '';
    const hId = game.HomeID || game.homeId || game.home_id || '';
    const aTeam = game.AwayTeam || game.awayTeam || game.away_team || 'Unknown';
    const hTeam = game.HomeTeam || game.homeTeam || game.home_team || 'Unknown';
    const kickoff = game.Kickoff_Time || game.kickoffTime || game.startDate || game.start_date || '';

    // Match against Odds API spreads
    const matchedSpread = findConsensusSpread(hTeam, aTeam, spreadMap);
    let lockedSpread: string | number = matchedSpread !== null ? matchedSpread : (game.Spread !== undefined ? game.Spread : 'CHECK SPREAD');

    if (lockedSpread === null || lockedSpread === undefined || lockedSpread === '') {
      lockedSpread = 'CHECK SPREAD';
    }

    return {
      GameID: game.id,
      AwayRank: rankMap[aTeam] || '',
      AwayTeam: aTeam,
      AwayID: aId,
      AwayLogo: `https://raw.githubusercontent.com/CFBD/cfb-web/master/public/logos/${aId}.png`,
      HomeRank: rankMap[hTeam] || '',
      HomeTeam: hTeam,
      HomeID: hId,
      HomeLogo: `https://raw.githubusercontent.com/CFBD/cfb-web/master/public/logos/${hId}.png`,
      Spread: lockedSpread,
      Kickoff_Time: kickoff,
      AwayPoints: game.awayPoints ?? 0,
      HomePoints: game.homePoints ?? 0,
      Status: game.completed ? 'Final' : 'Upcoming',
    };
  });

  await sheet.addRows(rows);
  return { games: rows.length, created: true };
}

export async function runWeeklySetup() {
  const week = await getCurrentWeek();
  const data = await fetchTop25Games(week);
  const spreadMap = await getConsensusSpreads();
  const result = await populateWeeklySlate(data.games, data.rankMap, spreadMap);
  return { week, ...result };
}

export async function archiveCurrentWeek() {
  const currentWeek = await getCurrentWeek();
  const slateSheet = await getSheetByTitle('Weekly_Slate');
  const rows = await slateSheet.getRows();

  let archiveSheet = doc.sheetsByTitle['Master_Archive'];
  if (!archiveSheet) {
    archiveSheet = await doc.addSheet({
      title: 'Master_Archive',
      headerValues: [
        'Week',
        'GameID',
        'AwayTeam',
        'HomeTeam',
        'Spread',
        'AwayPoints',
        'HomePoints',
        'Status',
        'Winner_Against_Spread',
      ],
    });
  }

  // Delete existing rows for this week to prevent duplicates if re-archived
  try {
    const existingRows = await archiveSheet.getRows();
    for (const existingRow of existingRows) {
      if (asString(existingRow.get('Week')) === currentWeek) {
        await existingRow.delete();
      }
    }
  } catch (error) {
    console.warn('Could not inspect/clear existing rows in Master_Archive:', error);
  }

  const archiveRows: Array<Record<string, any>> = [];

  for (const row of rows) {
    const status = asString(row.get('Status')).toLowerCase();
    if (status !== 'final') continue;

    const awayPoints = Number(row.get('AwayPoints') ?? 0);
    const homePoints = Number(row.get('HomePoints') ?? 0);
    const spread = parseSpreadValue(row.get('Spread'));
    const gameId = asString(row.get('GameID'));
    const awayTeam = asString(row.get('AwayTeam'));
    const homeTeam = asString(row.get('HomeTeam'));

    const margin = (homePoints - awayPoints) + spread;
    let winner = '';
    if (margin > 0) winner = homeTeam;
    else if (margin < 0) winner = awayTeam;
    else winner = 'PUSH';

    archiveRows.push({
      Week: currentWeek,
      GameID: gameId,
      AwayTeam: awayTeam,
      HomeTeam: homeTeam,
      Spread: row.get('Spread') ?? '',
      AwayPoints: awayPoints,
      HomePoints: homePoints,
      Status: 'Final',
      Winner_Against_Spread: winner,
    });
  }

  if (archiveRows.length > 0) {
    await archiveSheet.addRows(archiveRows);
  }

  return archiveRows.length;
}

export async function updateLiveScores() {
  const settingsSheet = await getSheetByTitle('Settings');
  const year = Number(await getSettingsValue('B4')) || CONFIG.YEAR || new Date().getFullYear();
  const week = await getCurrentWeek();

  const url = `https://api.collegefootballdata.com/games?year=${year}&week=${week}&seasonType=regular`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CONFIG.CFBD_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`CFBD scores request failed: ${response.status} ${response.statusText}`);
  }

  const apiGames = (await response.json()) as Array<Record<string, any>>;
  const scoreMap: Record<string, { awayPoints: number; homePoints: number; completed: boolean; isStarted: boolean }> = {};

  apiGames.forEach((game) => {
    const gameId = game.id;
    const kickoff = game.start_date || game.startDate;
    const isStarted = kickoff ? new Date(kickoff) <= new Date() : false;

    scoreMap[gameId] = {
      awayPoints: Number(game.away_points ?? game.awayPoints ?? 0),
      homePoints: Number(game.home_points ?? game.homePoints ?? 0),
      completed: Boolean(game.completed),
      isStarted,
    };
  });

  const sheet = await getSheetByTitle('Weekly_Slate');
  const rows = await sheet.getRows();

  for (const row of rows) {
    const gameId = asString(row.get('GameID'));
    const liveData = scoreMap[gameId];
    if (!liveData) continue;

    const rowKickoff = asString(row.get('Kickoff_Time'));
    const isStarted = liveData.isStarted || (rowKickoff ? new Date(rowKickoff) <= new Date() : false);

    let status = 'Upcoming';
    if (liveData.completed) {
      status = 'Final';
    } else if (isStarted) {
      status = 'Live';
    } else {
      status = 'Upcoming';
    }

    row.set('AwayPoints', liveData.awayPoints);
    row.set('HomePoints', liveData.homePoints);
    row.set('Status', status);
    await row.save();
  }

  return rows.length;
}

export interface OddsMatchup {
  homeTeam: string;
  awayTeam: string;
  homeSpread: number | null;
  awaySpread: number | null;
  bookmaker: string;
}

const TEAM_ALIASES: Record<string, string[]> = {
  'miami': ['miami fl', 'miami hurricanes', 'miami florida'],
  'miami oh': ['miami ohio', 'miami oh redhawks'],
  'ole miss': ['mississippi', 'ole miss rebels', 'mississippi rebels'],
  'ul monroe': ['louisiana monroe', 'ulm warhawks', 'la monroe'],
  'louisiana': ['louisiana lafayette', 'ragin cajuns', 'louisiana ragin cajuns'],
  'hawaii': ['hawai i', 'hawaii rainbow warriors'],
  'san jose state': ['san jose state', 'san josé state', 'sjsu'],
  'utep': ['utep miners', 'texas el paso'],
  'utsa': ['utsa roadrunners', 'texas san antonio'],
  'byu': ['byu cougars', 'brigham young'],
  'lsu': ['lsu tigers', 'louisiana state'],
  'smu': ['smu mustangs', 'southern methodist'],
  'usc': ['usc trojans', 'southern california'],
  'ucf': ['ucf knights', 'central florida'],
  'tcu': ['tcu horned frogs', 'texas christian'],
  'unc': ['north carolina', 'unc tar heels'],
  'pitt': ['pittsburgh', 'pitt panthers'],
  'nc state': ['nc state wolfpack', 'north carolina state'],
};

export function isTeamMatch(cfbdName: string, oddsName: string): boolean {
  const cNorm = normalizeTeamKey(cfbdName);
  const oNorm = normalizeTeamKey(oddsName);

  if (!cNorm || !oNorm) return false;
  if (cNorm === oNorm) return true;

  // Check aliases
  for (const [key, aliases] of Object.entries(TEAM_ALIASES)) {
    if (cNorm === key || aliases.includes(cNorm)) {
      if (oNorm.includes(key) || aliases.some((a) => oNorm.includes(a) || a.includes(oNorm))) {
        return true;
      }
    }
  }

  // Exact word boundary checks to avoid false positive prefix matches
  if (!cNorm.includes('tech') && oNorm.includes('tech')) return false;
  if (!cNorm.includes('state') && oNorm.includes('state')) return false;
  if (!cNorm.includes('a and m') && !cNorm.includes('am') && (oNorm.includes('a and m') || oNorm.includes('am') || oNorm.includes('aggies'))) {
    if (cNorm === 'texas' || cNorm === 'florida' || cNorm === 'alabama') return false;
  }

  const wordsC = cNorm.split(' ');
  const wordsO = oNorm.split(' ');

  // Check if odds name starts with the exact school words
  if (wordsO.slice(0, wordsC.length).join(' ') === cNorm) {
    return true;
  }

  return false;
}

export function findConsensusSpread(
  homeTeam: string,
  awayTeam: string,
  matchups: OddsMatchup[] | Record<string, string | number>,
): number | null {
  if (!matchups) return null;

  if (Array.isArray(matchups)) {
    for (const m of matchups) {
      if (isTeamMatch(homeTeam, m.homeTeam) && isTeamMatch(awayTeam, m.awayTeam)) {
        return m.homeSpread;
      }
    }
    return null;
  }

  // Fallback for object map
  const direct = matchups[homeTeam];
  if (direct !== undefined && direct !== null) {
    const num = Number(direct);
    return Number.isFinite(num) ? num : null;
  }

  return null;
}

export async function getConsensusSpreads(): Promise<OddsMatchup[]> {
  if (!CONFIG.ODDS_KEY) {
    throw new Error('ODDS_KEY is not configured.');
  }

  const sport = 'americanfootball_ncaaf';
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${CONFIG.ODDS_KEY}&regions=us&markets=spreads&oddsFormat=american`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Odds API request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Array<Record<string, any>>;
  const matchups: OddsMatchup[] = [];

  data.forEach((game) => {
    const bookmaker = game?.bookmakers?.find((entry: Record<string, any>) => entry.key === 'draftkings') || game?.bookmakers?.[0];
    if (!bookmaker) return;

    const marketData = bookmaker.markets?.find((market: Record<string, any>) => market.key === 'spreads');
    if (!marketData) return;

    const homeOutcome = marketData.outcomes?.find((outcome: Record<string, any>) => outcome.name === game.home_team);
    const awayOutcome = marketData.outcomes?.find((outcome: Record<string, any>) => outcome.name === game.away_team);

    matchups.push({
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      homeSpread: homeOutcome && homeOutcome.point !== undefined ? Number(homeOutcome.point) : null,
      awaySpread: awayOutcome && awayOutcome.point !== undefined ? Number(awayOutcome.point) : null,
      bookmaker: bookmaker.title || 'DraftKings',
    });
  });

  return matchups;
}

export async function exportOddsAPITeamNames() {
  if (!CONFIG.ODDS_KEY) {
    throw new Error('ODDS_KEY is not configured.');
  }

  const sport = 'americanfootball_ncaaf';
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${CONFIG.ODDS_KEY}&regions=us&markets=spreads`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Odds API team list request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Array<Record<string, any>>;
  const teamNames = new Set<string>();

  data.forEach((game) => {
    if (game.home_team) teamNames.add(game.home_team);
    if (game.away_team) teamNames.add(game.away_team);
  });

  return Array.from(teamNames).sort();
}