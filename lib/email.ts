import { Resend } from 'resend';

const normalizeSender = (value: string | undefined) =>
  (value ?? 'onboarding@resend.dev').trim().replace(/^['"]+|['"]+$/g, '');

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = normalizeSender(process.env.RESEND_FROM_EMAIL);

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendRegistrationConfirmation({
  email,
  username,
}: {
  email: string;
  username: string;
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

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: 'Welcome to Feetsball',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Welcome to Feetsball, ${username}!</h2>
          <p>Your registration is complete.</p>
          <p>You can now log in with your username and 4-digit PIN.</p>
          <p style="margin-top: 20px;">Good luck this week.</p>
        </div>
      `,
      text: `Welcome to Feetsball, ${username}! Your registration is complete. You can now log in with your username and 4-digit PIN. Good luck this week.`,
    });

    console.log('Resend registration email result', result);
    return { success: true, id: result.data?.id ?? null };
  } catch (error) {
    console.error('Resend registration email failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface PickConfirmationItem {
  gameId?: string;
  team: string;
  wager: number;
  spread?: string | number | null;
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

export async function sendPicksConfirmation({
  email,
  username,
  week,
  picks,
}: {
  email: string;
  username: string;
  week: string;
  picks: PickConfirmationItem[];
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
    return {
      html: `<li><strong>${pick.wager} ${pointsLabel}</strong> - ${pick.team}${spreadBadge}</li>`,
      text: `${pick.wager} ${pointsLabel} - ${pick.team}${spreadBadge}`,
    };
  };

  const formattedItems = sortedPicks.map(formatPickItem);
  const summaryHtml = formattedItems.map((item) => item.html).join('');
  const summaryText = formattedItems.map((item) => item.text).join('\n');

  console.log('Attempting picks email send', {
    from: emailFrom,
    to: email,
    username,
    week,
  });

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: `Feetsball picks submitted for Week ${week}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Picks locked in for ${username}</h2>
          <p>Your picks for Week ${week} were submitted successfully.</p>
          <ul style="padding-left: 20px; margin: 12px 0 20px;">
            ${summaryHtml}
          </ul>
          <p>Good luck this week.</p>
        </div>
      `,
      text: `Picks locked in for ${username} for Week ${week}.\n\n${summaryText}\n\nGood luck this week.`,
    });

    console.log('Resend picks email result', result);
    return { success: true, id: result.data?.id ?? null };
  } catch (error) {
    console.error('Resend picks email failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

