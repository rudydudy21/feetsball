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

    const timestamp = new Date().toISOString();

    await sheet.addRow({
      Username: username,
      PIN: pin,
      Week: week,
      GameID: pick.gameId,
      Selection: pick.team,
      Wager: Number(pick.wager) || 0,
      Timestamp: timestamp,
      SubmittedAt: timestamp,
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
    const isFinal = game && asString(game.Status).toLowerCase() === 'final';
    const winner = isFinal
      ? (Number(game.AwayPoints) > Number(game.HomePoints) ? asString(game.AwayTeam) : asString(game.HomeTeam))
      : null;

    let outcome: 'correct' | 'incorrect' | 'pending' = 'pending';
    if (winner) {
      outcome = selection === winner ? 'correct' : 'incorrect';
    }

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

export async function fetchTop25Games(week: string | number) {
  const year = CONFIG.YEAR || new Date().getFullYear();
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
  let filteredGames = allGames;

  try {
    const rankUrl = `https://api.collegefootballdata.com/rankings?year=${year}&week=${week}`;
    const rankResponse = await fetch(rankUrl, {
      headers: {
        Authorization: `Bearer ${CONFIG.CFBD_KEY}`,
      },
    });

    if (rankResponse.ok) {
      const rankData = (await rankResponse.json()) as Array<Record<string, any>>;
      const poll = rankData[0]?.polls?.find(
        (entry: Record<string, any>) =>
          entry?.poll === 'AP Top 25' || entry?.poll === 'Playoff Committee Rankings',
      );

      if (poll) {
        poll.ranks.forEach((rank: Record<string, any>) => {
          if (rank?.school) {
            rankMap[rank.school] = Number(rank.rank || 0);
          }
        });

        const topTeams = Object.keys(rankMap);
        filteredGames = allGames.filter(
          (game) =>
            topTeams.includes(game.homeTeam || game.home_team || '') ||
            topTeams.includes(game.awayTeam || game.away_team || ''),
        );
      }
    }
  } catch (error) {
    console.warn('Rankings fetch failed. Showing all games.', error);
  }

  return { games: filteredGames, rankMap };
}

export async function populateWeeklySlate(
  games: Array<Record<string, any>>,
  rankMap: Record<string, number> = {},
  spreadMap: Record<string, string | number> = {},
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
    const spread = game.Spread !== undefined ? game.Spread : 'CHECK SPREAD';
    const kickoff = game.Kickoff_Time || game.kickoffTime || game.startDate || game.start_date || '';

    const nameOverrides: Record<string, string> = {
      Florida: 'Florida Gators',
      Michigan: 'Michigan Wolverines',
      'New Mexico': 'New Mexico Lobos',
      Louisiana: 'Louisiana Ragin Cajuns',
      Texas: 'Texas Longhorns',
      Miami: 'Miami Hurricanes',
    };

    let lockedSpread: string | number = spread;

    if (nameOverrides[hTeam]) {
      lockedSpread = spreadMap[nameOverrides[hTeam]] ?? 'CHECK SPREAD';
    } else if (spreadMap[hTeam] !== undefined) {
      lockedSpread = spreadMap[hTeam];
    } else {
      const hTeamLower = normalizeTeamKey(hTeam);
      for (const apiName of Object.keys(spreadMap)) {
        if (normalizeTeamKey(apiName) === hTeamLower || normalizeTeamKey(apiName).startsWith(`${hTeamLower} `)) {
          lockedSpread = spreadMap[apiName] ?? 'CHECK SPREAD';
          break;
        }
      }
    }

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
    archiveSheet = await doc.addSheet({ title: 'Master_Archive' });
  }

  const archiveRows: Array<Array<any>> = [];

  rows.forEach((row) => {
    const status = asString(row.get('Status')).toLowerCase();
    if (status !== 'final') return;

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

    archiveRows.push([
      currentWeek,
      gameId,
      awayTeam,
      homeTeam,
      row.get('Spread'),
      awayPoints,
      homePoints,
      'Final',
      winner,
    ]);
  });

  if (archiveRows.length > 0) {
    await archiveSheet.addRows(archiveRows.map((row) => ({ values: row })) as any);
  }

  return archiveRows.length;
}

export async function updateLiveScores() {
  const settingsSheet = await getSheetByTitle('Settings');
  const year = Number(await getSettingsValue('B1')) || CONFIG.YEAR || new Date().getFullYear();
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
  const scoreMap: Record<string, { awayPoints: number; homePoints: number; completed: boolean }> = {};

  apiGames.forEach((game) => {
    const gameId = game.id;
    scoreMap[gameId] = {
      awayPoints: Number(game.away_points ?? game.awayPoints ?? 0),
      homePoints: Number(game.home_points ?? game.homePoints ?? 0),
      completed: Boolean(game.completed),
    };
  });

  const sheet = await getSheetByTitle('Weekly_Slate');
  const rows = await sheet.getRows();

  for (const row of rows) {
    const gameId = asString(row.get('GameID'));
    const liveData = scoreMap[gameId];
    if (!liveData) continue;

    row.set('AwayPoints', liveData.awayPoints);
    row.set('HomePoints', liveData.homePoints);
    row.set('Status', liveData.completed ? 'Final' : 'Live');
    await row.save();
  }

  return rows.length;
}

export async function getConsensusSpreads() {
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
  const spreadMap: Record<string, string | number> = {};

  data.forEach((game) => {
    const bookmaker = game?.bookmakers?.find((entry: Record<string, any>) => entry.key === 'draftkings') || game?.bookmakers?.[0];
    if (!bookmaker) return;

    const marketData = bookmaker.markets?.find((market: Record<string, any>) => market.key === 'spreads');
    if (!marketData) return;

    const homeOutcome = marketData.outcomes?.find((outcome: Record<string, any>) => outcome.name === game.home_team);
    if (homeOutcome) {
      spreadMap[game.home_team] = homeOutcome.point;
    }
  });

  return spreadMap;
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