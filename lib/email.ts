import { Resend } from 'resend';

const normalizeSender = (value: string | undefined) =>
  (value ?? 'onboarding@resend.dev').trim().replace(/^['"]+|['"]+$/g, '');

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = normalizeSender(process.env.RESEND_FROM_EMAIL);

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface PickConfirmationItem {
  gameId?: string;
  team: string;
  wager: number;
  spread?: string | number | null;
  teamLogo?: string;
  teamRank?: string | number | null;
  opponent?: string;
  opponentLogo?: string;
  opponentRank?: string | number | null;
  isHome?: boolean;
}

export function formatPickSpread(spread: string | number | null | undefined): string {
  if (spread === null || spread === undefined) return '';
  const trimmed = String(spread).trim();
  if (!trimmed) return '';
  const num = Number(trimmed);
  if (!Number.isNaN(num)) {
    return num > 0 ? `+${num}` : `${num}`;
  }
  return trimmed;
}

export function renderRegistrationConfirmationHtml({
  username,
  email,
  appUrl = 'https://feetsball.win',
}: {
  username: string;
  email: string;
  appUrl?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Feetsball</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; border-collapse: separate;">
          
          <!-- Brand Header Banner -->
          <tr>
            <td style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); padding: 26px 20px; text-align: center; color: #ffffff;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0; line-height: 1;">
                FEETSBALL
              </div>
              <div style="display: inline-block; margin-top: 10px; background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 2px; padding: 5px 14px; border-radius: 999px;">
                🎉 REGISTRATION CONFIRMED
              </div>
            </td>
          </tr>

          <!-- Intro & Welcome Details -->
          <tr>
            <td style="padding: 24px 20px 16px;">
              <p style="margin: 0 0 10px; font-size: 17px; font-weight: 800; color: #0f172a;">
                Welcome to the League, ${username}!
              </p>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #475569;">
                Your registration for the <strong>2026 Feetsball College Football Challenge</strong> is complete. You are officially locked in and ready to compete for the season crown.
              </p>

              <!-- Account Summary Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: separate;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <div style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">
                      Your Account Details
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b; padding: 3px 0; font-weight: 600;">Username:</td>
                        <td align="right" style="font-size: 14px; font-weight: 800; color: #0f172a; padding: 3px 0;">${username}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; padding: 3px 0; font-weight: 600;">Email:</td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #0f172a; padding: 3px 0;">${email}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; padding: 3px 0; font-weight: 600;">Login PIN:</td>
                        <td align="right" style="font-size: 13px; font-weight: 800; color: #2563eb; padding: 3px 0;">4-Digit PIN Selected</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- How to Play Card -->
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                🏈 How To Play Each Week
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="28" style="vertical-align: top; padding-right: 10px; padding-bottom: 10px;">
                    <span style="display: inline-block; width: 22px; height: 22px; background-color: #2563eb; color: #ffffff; border-radius: 999px; text-align: center; line-height: 22px; font-size: 11px; font-weight: 900;">1</span>
                  </td>
                  <td style="font-size: 13px; color: #334155; line-height: 1.4; padding-bottom: 10px;">
                    <strong>Check the Slate:</strong> When weekly games and consensus spreads drop, review the Top 25 matchups.
                  </td>
                </tr>
                <tr>
                  <td width="28" style="vertical-align: top; padding-right: 10px; padding-bottom: 10px;">
                    <span style="display: inline-block; width: 22px; height: 22px; background-color: #2563eb; color: #ffffff; border-radius: 999px; text-align: center; line-height: 22px; font-size: 11px; font-weight: 900;">2</span>
                  </td>
                  <td style="font-size: 13px; color: #334155; line-height: 1.4; padding-bottom: 10px;">
                    <strong>Pick Your Top 5:</strong> Select 5 teams you believe will cover their point spread.
                  </td>
                </tr>
                <tr>
                  <td width="28" style="vertical-align: top; padding-right: 10px; padding-bottom: 10px;">
                    <span style="display: inline-block; width: 22px; height: 22px; background-color: #2563eb; color: #ffffff; border-radius: 999px; text-align: center; line-height: 22px; font-size: 11px; font-weight: 900;">3</span>
                  </td>
                  <td style="font-size: 13px; color: #334155; line-height: 1.4; padding-bottom: 10px;">
                    <strong>Assign Confidence Points:</strong> Rank your picks 5, 4, 3, 2, and 1 point before Saturday 12:00 PM ET.
                  </td>
                </tr>
              </table>

              <!-- Main CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 20px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); text-align: center;">
                      GO TO FEETSBALL &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Reminder Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: #64748b; font-weight: 600; text-align: center;">
                💡 Keep your 4-digit PIN handy each week to log in and submit picks quickly.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 800; color: #334155;">Feetsball College Football Challenge</p>
              <p style="margin: 0;">Good luck this season!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendRegistrationConfirmation({
  email,
  username,
  appUrl = 'https://feetsball.win',
}: {
  email: string;
  username: string;
  appUrl?: string;
}) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured; skipping confirmation email.');
    return { success: false, skipped: true };
  }

  console.log('Attempting registration email send', {
    from: emailFrom,
    to: email,
    username,
  });

  const html = renderRegistrationConfirmationHtml({
    username,
    email,
    appUrl,
  });

  const text = `Welcome to Feetsball, ${username}!\n\nYour registration is complete. You can now log in at ${appUrl} with your username and 4-digit PIN.\n\nGood luck this season!`;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: '🎉 Welcome to Feetsball - Registration Confirmed',
      html,
      text,
    });

    console.log('Resend registration email result', result);
    return { success: true, id: result.data?.id ?? null };
  } catch (error) {
    console.error('Resend registration email failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function renderPicksConfirmationHtml({
  username,
  week,
  picks,
  appUrl = 'https://feetsball.win',
}: {
  username: string;
  week: string;
  picks: PickConfirmationItem[];
  appUrl?: string;
}): string {
  const sortedPicks = [...picks].sort((a, b) => (Number(b.wager) || 0) - (Number(a.wager) || 0));
  const totalPoints = sortedPicks.reduce((acc, p) => acc + (Number(p.wager) || 0), 0);

  const pickCardsHtml = sortedPicks
    .map((pick, index) => {
      const wagerLabel = `${pick.wager} ${pick.wager === 1 ? 'POINT' : 'POINTS'}`;
      const formattedSpread = formatPickSpread(pick.spread);
      const rankBadge = pick.teamRank ? `<span style="color: #64748b; font-size: 11px; font-weight: 900; margin-right: 4px;">#${pick.teamRank}</span>` : '';
      const opponentText = pick.opponent ? `<div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">${pick.isHome ? 'vs' : '@'} ${pick.opponentRank ? '#' + pick.opponentRank + ' ' : ''}${pick.opponent}</div>` : '';

      return `
        <!-- Pick Card ${index + 1} -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: separate; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);">
          <tr>
            <td style="padding: 10px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Left: Logo & Team Info -->
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" style="vertical-align: middle;">
                          ${
                            pick.teamLogo
                              ? `<img src="${pick.teamLogo}" alt="${pick.team}" width="28" height="28" style="display: block; border-radius: 4px; object-fit: contain; width: 28px; height: 28px;" />`
                              : `<span style="display: inline-block; width: 28px; height: 28px; background-color: #e2e8f0; border-radius: 4px; text-align: center; line-height: 28px; font-size: 12px;">🏈</span>`
                          }
                        </td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                            ${rankBadge}${pick.team}
                          </div>
                          ${opponentText}
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: Badges Flush to the Right Margin -->
                  <td align="right" style="vertical-align: middle; text-align: right; white-space: nowrap; padding-left: 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" align="right" style="border-collapse: collapse; margin-left: auto;">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 6px;">
                          <span style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px; white-space: nowrap;">
                            ${wagerLabel}
                          </span>
                        </td>
                        ${
                          formattedSpread
                            ? `<td style="vertical-align: middle;">
                                <span style="display: inline-block; background-color: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; white-space: nowrap; min-width: 44px; text-align: center;">
                                  ${formattedSpread}
                                </span>
                              </td>`
                            : ''
                        }
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Feetsball Picks Confirmed - Week ${week}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; border-collapse: separate;">
          
          <!-- Brand Header Banner -->
          <tr>
            <td style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); padding: 26px 20px; text-align: center; color: #ffffff;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0; line-height: 1;">
                FEETSBALL
              </div>
              <div style="display: inline-block; margin-top: 10px; background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 2px; padding: 5px 14px; border-radius: 999px;">
                🏆 PICKS LOCKED IN &bull; WEEK ${week}
              </div>
            </td>
          </tr>

          <!-- Summary & Picks Cards -->
          <tr>
            <td style="padding: 24px 20px 16px;">
              <p style="margin: 0 0 8px; font-size: 17px; font-weight: 800; color: #0f172a;">
                Picks Locked In for ${username}!
              </p>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #475569;">
                Your selections for <strong>Week ${week}</strong> have been recorded in the league ledger.
              </p>

              <!-- Stats Summary Pill -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: separate; text-align: center;">
                <tr>
                  <td style="padding: 10px 8px; width: 50%; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">Picks Submitted</div>
                    <div style="font-size: 16px; font-weight: 900; color: #0f172a;">${sortedPicks.length} of 5</div>
                  </td>
                  <td style="padding: 10px 8px; width: 50%;">
                    <div style="font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">Total Wager Points</div>
                    <div style="font-size: 16px; font-weight: 900; color: #2563eb;">${totalPoints} Pts</div>
                  </td>
                </tr>
              </table>

              <!-- Picks List Section Header -->
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                Your Week ${week} Selections
              </div>

              <!-- List of Pick Cards -->
              ${pickCardsHtml}

              <!-- Main CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/leaderboard/weekly" target="_blank" style="display: inline-block; background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); text-align: center;">
                      VIEW WEEKLY LEADERBOARD &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Notice -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-align: center;">
                🔒 Submissions are final after Saturday 12:00 PM ET. Live scores update on the leaderboard throughout Saturday.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px; font-weight: 800; color: #334155;">Feetsball College Football Challenge</p>
              <p style="margin: 0;">Good luck this week!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendPicksConfirmation({
  email,
  username,
  week,
  picks,
  appUrl = 'https://feetsball.win',
}: {
  email: string;
  username: string;
  week: string;
  picks: PickConfirmationItem[];
  appUrl?: string;
}) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured; skipping picks confirmation email.');
    return { success: false, skipped: true };
  }

  const sortedPicks = [...picks].sort((a, b) => (Number(b.wager) || 0) - (Number(a.wager) || 0));

  const formatPickItem = (pick: PickConfirmationItem) => {
    const formattedSpread = formatPickSpread(pick.spread);
    const spreadBadge = formattedSpread ? ` (${formattedSpread})` : '';
    const pointsLabel = pick.wager === 1 ? 'point' : 'points';
    const rankPrefix = pick.teamRank ? `#${pick.teamRank} ` : '';
    return {
      text: `${pick.wager} ${pointsLabel} - ${rankPrefix}${pick.team}${spreadBadge}`,
    };
  };

  const formattedItems = sortedPicks.map(formatPickItem);
  const summaryText = formattedItems.map((item) => item.text).join('\n');

  console.log('Attempting picks email send', {
    from: emailFrom,
    to: email,
    username,
    week,
  });

  const html = renderPicksConfirmationHtml({
    username,
    week,
    picks: sortedPicks,
    appUrl,
  });

  const text = `Picks locked in for ${username} for Week ${week}.\n\n${summaryText}\n\nView live leaderboard at ${appUrl}/leaderboard/weekly\n\nGood luck this week.`;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: `🏆 Feetsball Picks Confirmed for Week ${week} (${username})`,
      html,
      text,
    });

    console.log('Resend picks email result', result);
    return { success: true, id: result.data?.id ?? null };
  } catch (error) {
    console.error('Resend picks email failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface SlateGameItem {
  GameID?: string;
  AwayTeam?: string;
  AwayLogo?: string;
  AwayRank?: string | number | null;
  HomeTeam?: string;
  HomeLogo?: string;
  HomeRank?: string | number | null;
  Spread?: string | number | null;
  Kickoff_Time?: string;
}

export function calculateGameSpreads(spreadRaw: string | number | null | undefined): { awaySpread: string; homeSpread: string } {
  if (spreadRaw === null || spreadRaw === undefined) return { awaySpread: '', homeSpread: '' };
  const raw = String(spreadRaw).trim();
  if (!raw) return { awaySpread: '', homeSpread: '' };
  if (raw === 'CHECK SPREAD' || raw === 'PUSH') return { awaySpread: raw, homeSpread: raw };

  const cleaned = raw.replace(/[^0-9.+-]/g, '');
  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    return { awaySpread: raw, homeSpread: raw };
  }

  const awayNum = -num;
  const awaySpread = awayNum > 0 ? `+${awayNum}` : `${awayNum}`;
  const homeSpread = num > 0 ? `+${num}` : `${num}`;
  return { awaySpread, homeSpread };
}

export function formatKickoffET(kickoffTime: string | undefined): string {
  if (!kickoffTime) return 'Kickoff TBA';
  try {
    const date = new Date(kickoffTime);
    if (Number.isNaN(date.getTime())) return kickoffTime;
    return (
      date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) + ' ET'
    );
  } catch {
    return kickoffTime;
  }
}

export function renderSlateAnnouncementEmailHtml({
  week,
  games,
  username,
  appUrl = 'https://feetsball.com',
}: {
  week: string;
  games: SlateGameItem[];
  username?: string;
  appUrl?: string;
}): string {
  const greeting = username ? `Hey ${username},` : 'Hey Feetsballers,';

  const gameCardsHtml = games
    .map((game, index) => {
      const awayTeam = game.AwayTeam || 'Away Team';
      const homeTeam = game.HomeTeam || 'Home Team';
      const awayLogo = game.AwayLogo || '';
      const homeLogo = game.HomeLogo || '';
      const awayRank = game.AwayRank ? `#${game.AwayRank} ` : '';
      const homeRank = game.HomeRank ? `#${game.HomeRank} ` : '';
      const kickoff = formatKickoffET(game.Kickoff_Time);
      const { awaySpread, homeSpread } = calculateGameSpreads(game.Spread);

      return `
        <!-- Game Card ${index + 1} -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: separate;">
          <tr>
            <td style="padding: 8px 12px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">
              🏈 GAME ${index + 1} &bull; ${kickoff}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px;">
              <!-- Away Team Row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td width="32" style="vertical-align: middle;">
                    ${
                      awayLogo
                        ? `<img src="${awayLogo}" alt="${awayTeam}" width="26" height="26" style="display: block; border-radius: 4px; object-fit: contain; width: 26px; height: 26px;" />`
                        : `<span style="display: inline-block; width: 26px; height: 26px; background-color: #e2e8f0; border-radius: 4px; text-align: center; line-height: 26px; font-size: 10px; font-weight: 800;">🏈</span>`
                    }
                  </td>
                  <td style="padding-left: 8px; vertical-align: middle;">
                    <span style="font-size: 14px; font-weight: 800; color: #0f172a;">
                      ${awayRank ? `<span style="color: #64748b; font-size: 11px; font-weight: 900; margin-right: 2px;">${awayRank}</span>` : ''}${awayTeam}
                    </span>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    ${
                      awaySpread
                        ? `<span style="display: inline-block; background-color: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">${awaySpread}</span>`
                        : ''
                    }
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height: 1px; background-color: #f1f5f9; margin: 4px 0 8px 0;"></div>

              <!-- Home Team Row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32" style="vertical-align: middle;">
                    ${
                      homeLogo
                        ? `<img src="${homeLogo}" alt="${homeTeam}" width="26" height="26" style="display: block; border-radius: 4px; object-fit: contain; width: 26px; height: 26px;" />`
                        : `<span style="display: inline-block; width: 26px; height: 26px; background-color: #e2e8f0; border-radius: 4px; text-align: center; line-height: 26px; font-size: 10px; font-weight: 800;">🏈</span>`
                    }
                  </td>
                  <td style="padding-left: 8px; vertical-align: middle;">
                    <span style="font-size: 14px; font-weight: 800; color: #0f172a;">
                      ${homeRank ? `<span style="color: #64748b; font-size: 11px; font-weight: 900; margin-right: 2px;">${homeRank}</span>` : ''}${homeTeam}
                    </span>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    ${
                      homeSpread
                        ? `<span style="display: inline-block; background-color: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">${homeSpread}</span>`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Feetsball Week ${week} Slate & Spreads</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; border-collapse: separate;">
          
          <!-- Brand Header Banner -->
          <tr>
            <td style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); padding: 24px 20px; text-align: center; color: #ffffff;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0; line-height: 1;">
                FEETSBALL
              </div>
              <div style="display: inline-block; margin-top: 10px; background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 2px; padding: 5px 14px; border-radius: 999px;">
                WEEK ${week} SLATE IS LIVE
              </div>
            </td>
          </tr>

          <!-- Intro Message & Call to Action -->
          <tr>
            <td style="padding: 24px 20px 16px;">
              <p style="margin: 0 0 10px; font-size: 16px; font-weight: 800; color: #0f172a;">
                ${greeting}
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #475569;">
                The games and consensus spreads for <strong>Week ${week}</strong> have been loaded into Feetsball! Pick your top 5 winners against the spread and assign confidence wagers (5 to 1 points).
              </p>

              <!-- Main CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 20px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); text-align: center;">
                      LOCK IN YOUR PICKS &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Deadline Reminder Box -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #991b1b; font-weight: 700; text-align: center;">
                ⏰ <strong>Deadline:</strong> All picks must be locked before <strong>Saturday 12:00 PM ET</strong>!
              </div>

              <!-- Section Title -->
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                Week ${week} Matchups (${games.length} Games)
              </div>

              <!-- Matchups List -->
              ${gameCardsHtml}

              <!-- Bottom CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 10px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 12px 24px; border-radius: 10px; text-align: center;">
                      Go to Feetsball (${appUrl})
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-weight: 700; color: #334155;">Feetsball College Football Pick'em</p>
              <p style="margin: 0;">Good luck this week!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function renderSlateAnnouncementEmailText({
  week,
  games,
  username,
  appUrl = 'https://feetsball.com',
}: {
  week: string;
  games: SlateGameItem[];
  username?: string;
  appUrl?: string;
}): string {
  const greeting = username ? `Hey ${username},` : 'Hey Feetsballers,';

  const gamesSummary = games
    .map((game, index) => {
      const awayTeam = game.AwayTeam || 'Away Team';
      const homeTeam = game.HomeTeam || 'Home Team';
      const awayRank = game.AwayRank ? `#${game.AwayRank} ` : '';
      const homeRank = game.HomeRank ? `#${game.HomeRank} ` : '';
      const kickoff = formatKickoffET(game.Kickoff_Time);
      const { awaySpread, homeSpread } = calculateGameSpreads(game.Spread);

      return `${index + 1}. [${kickoff}]\n   ${awayRank}${awayTeam} (${awaySpread || '0'}) @ ${homeRank}${homeTeam} (${homeSpread || '0'})`;
    })
    .join('\n\n');

  return `
${greeting}

The games and consensus spreads for Week ${week} are now loaded in Feetsball!

Submit your top 5 picks (confidence points 5 to 1) at:
${appUrl}

DEADLINE: Saturday at 12:00 PM ET.

--- WEEK ${week} MATCHUPS (${games.length} GAMES) ---

${gamesSummary}

---
Good luck this week!
Feetsball Commissioner
  `.trim();
}

export async function sendSlateAnnouncementEmail({
  recipients,
  week,
  games,
  appUrl = 'https://feetsball.com',
}: {
  recipients: Array<{ email: string; username?: string }>;
  week: string;
  games: SlateGameItem[];
  appUrl?: string;
}): Promise<{
  success: boolean;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skipped?: boolean;
  errors?: string[];
}> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured; skipping slate announcement email.');
    return {
      success: false,
      skipped: true,
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: recipients.length,
      errors: ['RESEND_API_KEY is not configured in environment.'],
    };
  }

  if (!recipients || recipients.length === 0) {
    return {
      success: true,
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
    };
  }

  console.log(`Starting slate announcement email broadcast for Week ${week} to ${recipients.length} recipients.`);

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Group recipients into batches of 50 to avoid any API payload limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);

    const emailItems = chunk.map((recipient) => {
      const html = renderSlateAnnouncementEmailHtml({
        week,
        games,
        username: recipient.username,
        appUrl,
      });
      const text = renderSlateAnnouncementEmailText({
        week,
        games,
        username: recipient.username,
        appUrl,
      });

      return {
        from: emailFrom,
        to: [recipient.email.trim().toLowerCase()],
        subject: `🏈 Feetsball Week ${week} Slate & Spreads are Live!`,
        html,
        text,
      };
    });

    try {
      if (resend.batch && typeof resend.batch.send === 'function') {
        const batchResult = await resend.batch.send(emailItems);
        if (batchResult.data && Array.isArray(batchResult.data.data)) {
          sentCount += batchResult.data.data.length;
        } else {
          sentCount += emailItems.length;
        }
      } else {
        // Fallback to individual sends
        for (const item of emailItems) {
          try {
            await resend.emails.send(item);
            sentCount++;
          } catch (err) {
            failedCount++;
            errors.push(`Failed for ${item.to.join(',')}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    } catch (chunkError) {
      console.error(`Batch send failed for chunk starting at ${i}, falling back to individual sends:`, chunkError);
      // Fallback for this chunk
      for (const item of emailItems) {
        try {
          await resend.emails.send(item);
          sentCount++;
        } catch (singleErr) {
          failedCount++;
          errors.push(`Failed for ${item.to.join(',')}: ${singleErr instanceof Error ? singleErr.message : String(singleErr)}`);
        }
      }
    }
  }

  return {
    success: sentCount > 0,
    totalRecipients: recipients.length,
    sentCount,
    failedCount,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  };
}


