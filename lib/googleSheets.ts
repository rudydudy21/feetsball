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

export async function getWeeklySlate() {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['Weekly_Slate'];
  const rows = await sheet.getRows();

  return rows.map(row => {
    // We fetch by the exact header strings you defined
    return {
      id: row.get('GameID'),
      // Use .toString() to ensure the UI doesn't choke on number types
      awayRank: row.get('AwayRank')?.toString() || null, 
      away: row.get('AwayTeam'),
      awayId: row.get('AwayID'),
      awayLogo: row.get('AwayLogo'),
      
      homeRank: row.get('HomeRank')?.toString() || null,
      home: row.get('HomeTeam'),
      homeId: row.get('HomeID'),
      homeLogo: row.get('HomeLogo'),
      
      spread: row.get('Spread'),
      date: row.get('Kickoff_Time'),
      awayScore: row.get('AwayPoints') || 0,
      homeScore: row.get('HomePoints') || 0,
      status: row.get('Status')
    };
  });
}