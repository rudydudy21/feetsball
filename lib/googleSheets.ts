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

export function normalizeUsername(value: unknown) {
  return asString(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_-]/g, '');
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
  const sheet = await getSheetByTitle('Picks');
  const rows = await sheet.getRows();
  const normalizedUsername = normalizeUsername(username);

  return rows
    .filter((row) => {
      const rowUsername = normalizeUsername(row.get('Username'));
      const rowPin = asString(row.get('PIN'));
      return rowUsername === normalizedUsername && rowPin === pin.trim();
    })
    .map((row) => ({
      gameId: asString(row.get('GameID')),
      team: asString(row.get('Selection')),
      wager: Number(row.get('Wager') ?? 0),
      week: asString(row.get('Week')),
    }))
    .filter((pick) => pick.gameId && pick.team);
}

export async function submitUserPicks(
  userInfo: { username: string; pin: string },
  picks: Array<{ gameId: string; team: string; wager: number }>,
) {
  const username = normalizeUsername(userInfo.username);
  const pin = userInfo.pin.trim();
  const week = await getCurrentWeek();
  const sheet = await getSheetByTitle('Picks');
  const rows = await sheet.getRows();

  for (const row of rows) {
    const rowUsername = normalizeUsername(row.get('Username'));
    const rowPin = asString(row.get('PIN'));
    const rowWeek = asString(row.get('Week'));

    if (rowUsername === username && rowPin === pin && rowWeek === week) {
      await row.delete();
    }
  }

  for (const pick of picks) {
    if (!pick.gameId || !pick.team) continue;
    await sheet.addRow({
      Username: username,
      PIN: pin,
      Week: week,
      GameID: pick.gameId,
      Selection: pick.team,
      Wager: Number(pick.wager) || 0,
      SubmittedAt: new Date().toISOString(),
    });
  }

  return { success: true, week, submitted: picks.length };
}

export async function getWeeklyResultsForWeek(week: string) {
  const weeklySlate = await getWeeklySlate();
  const slateByGameId = new Map(
    weeklySlate.map((game) => [asString(game.GameID), game]),
  );

  const picksSheet = await getSheetByTitle('Picks');
  const pickRows = await picksSheet.getRows();
  const weeklyPicks = pickRows.filter((row) => asString(row.get('Week')) === week);

  const byUser = new Map<string, { username: string; picks: Record<number, { selection: string; outcome: string }>; total: number }>();

  for (const row of weeklyPicks) {
    const username = asString(row.get('Username'));
    const gameId = asString(row.get('GameID'));
    const selection = asString(row.get('Selection'));
    const wager = Number(row.get('Wager') ?? 0);

    if (!username || !gameId || !selection) continue;

    const game = slateByGameId.get(gameId);
    const winner = game && asString(game.Status).toLowerCase() === 'final'
      ? (Number(game.AwayPoints) > Number(game.HomePoints) ? asString(game.AwayTeam) : asString(game.HomeTeam))
      : null;

    const outcome = winner && selection === winner ? 'correct' : 'incorrect';

    if (!byUser.has(username)) {
      byUser.set(username, { username, picks: {}, total: 0 });
    }

    const userEntry = byUser.get(username)!;
    const numericWager = Number.isFinite(wager) ? Math.max(1, Math.round(wager)) : 1;

    userEntry.picks[numericWager] = { selection, outcome };
    if (outcome === 'correct') {
      userEntry.total += numericWager;
    }
  }

  return Array.from(byUser.values()).sort((a, b) => b.total - a.total);
}

export async function getSeasonResults() {
  const picksSheet = await getSheetByTitle('Picks');
  const pickRows = await picksSheet.getRows();
  const weeklySlate = await getWeeklySlate();
  const slateByGameId = new Map(
    weeklySlate.map((game) => [asString(game.GameID), game]),
  );

  const userTotals = new Map<string, { username: string; weeks: Record<number, number>; total: number }>();

  for (const row of pickRows) {
    const username = asString(row.get('Username'));
    const week = Number(asString(row.get('Week')) || 0);
    const gameId = asString(row.get('GameID'));
    const selection = asString(row.get('Selection'));
    const wager = Number(row.get('Wager') ?? 0);

    if (!username || !week || !gameId || !selection) continue;

    const game = slateByGameId.get(gameId);
    const winner = game && asString(game.Status).toLowerCase() === 'final'
      ? (Number(game.AwayPoints) > Number(game.HomePoints) ? asString(game.AwayTeam) : asString(game.HomeTeam))
      : null;

    if (!userTotals.has(username)) {
      userTotals.set(username, { username, weeks: {}, total: 0 });
    }

    const entry = userTotals.get(username)!;
    const points = winner && selection === winner ? Math.max(1, Math.round(wager)) : 0;
    entry.weeks[week] = (entry.weeks[week] ?? 0) + points;
    entry.total += points;
  }

  return Array.from(userTotals.values()).sort((a, b) => b.total - a.total);
}

export async function getLeagueMasterCode() {
  const value = await getSettingsValue('B3');
  return asString(value).toUpperCase();
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
    PIN: user.pin.trim(),
    Created: new Date().toLocaleString(),
  });

  return { success: true };
}