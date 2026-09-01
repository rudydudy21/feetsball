import { getCurrentWeek, getWeeklySlate, getAllRegisteredParticipants } from '@/lib/googleSheets';
import { sendSlateAnnouncementEmail, renderSlateAnnouncementEmailHtml, SlateGameItem } from '@/lib/email';
import { isAuthorized } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getAppUrl = (request: NextRequest): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  const host = request.headers.get('host') || 'feetsball.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const week = await getCurrentWeek().catch(() => '1');
    const rawSlate = await getWeeklySlate().catch(() => []);
    const participants = await getAllRegisteredParticipants().catch(() => []);
    const appUrl = getAppUrl(request);

    const slateGames: SlateGameItem[] = rawSlate.map((game) => ({
      GameID: String(game.GameID ?? ''),
      AwayTeam: String(game.AwayTeam ?? ''),
      AwayLogo: String(game.AwayLogo ?? ''),
      AwayRank: game.AwayRank ?? null,
      HomeTeam: String(game.HomeTeam ?? ''),
      HomeLogo: String(game.HomeLogo ?? ''),
      HomeRank: game.HomeRank ?? null,
      Spread: game.Spread ?? null,
      Kickoff_Time: String(game.Kickoff_Time ?? ''),
    }));

    const previewHtml = renderSlateAnnouncementEmailHtml({
      week,
      games: slateGames,
      username: 'SamplePlayer',
      appUrl,
    });

    return NextResponse.json({
      success: true,
      week,
      gamesCount: slateGames.length,
      participantsCount: participants.length,
      participants: participants.map((p) => ({ username: p.username, email: p.email })),
      previewHtml,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch slate email metadata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { testEmail, broadcast, previewOnly } = body as {
      testEmail?: string;
      broadcast?: boolean;
      previewOnly?: boolean;
    };

    const week = await getCurrentWeek().catch(() => '1');
    const rawSlate = await getWeeklySlate().catch(() => []);
    const appUrl = getAppUrl(request);

    const slateGames: SlateGameItem[] = rawSlate.map((game) => ({
      GameID: String(game.GameID ?? ''),
      AwayTeam: String(game.AwayTeam ?? ''),
      AwayLogo: String(game.AwayLogo ?? ''),
      AwayRank: game.AwayRank ?? null,
      HomeTeam: String(game.HomeTeam ?? ''),
      HomeLogo: String(game.HomeLogo ?? ''),
      HomeRank: game.HomeRank ?? null,
      Spread: game.Spread ?? null,
      Kickoff_Time: String(game.Kickoff_Time ?? ''),
    }));

    if (slateGames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No games found in the Weekly_Slate for Week ${week}. Please run Weekly Setup first before sending emails.`,
        },
        { status: 400 },
      );
    }

    if (previewOnly) {
      const previewHtml = renderSlateAnnouncementEmailHtml({
        week,
        games: slateGames,
        username: 'SamplePlayer',
        appUrl,
      });
      return NextResponse.json({
        success: true,
        week,
        gamesCount: slateGames.length,
        previewHtml,
      });
    }

    // Handle sending test email
    if (testEmail) {
      const trimmedTest = String(testEmail).trim().toLowerCase();
      if (!trimmedTest.includes('@')) {
        return NextResponse.json({ success: false, error: 'Invalid test email address' }, { status: 400 });
      }

      const sendResult = await sendSlateAnnouncementEmail({
        recipients: [{ email: trimmedTest, username: 'Admin Tester' }],
        week,
        games: slateGames,
        appUrl,
      });

      return NextResponse.json({
        mode: 'test',
        recipient: trimmedTest,
        week,
        gamesCount: slateGames.length,
        ...sendResult,
      });
    }

    // Handle mass broadcast to all registered participants
    if (broadcast) {
      const participants = await getAllRegisteredParticipants();

      if (participants.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No registered participants with valid email addresses were found in the Users sheet.',
          },
          { status: 400 },
        );
      }

      const sendResult = await sendSlateAnnouncementEmail({
        recipients: participants,
        week,
        games: slateGames,
        appUrl,
      });

      return NextResponse.json({
        mode: 'broadcast',
        week,
        gamesCount: slateGames.length,
        ...sendResult,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Please specify either testEmail or broadcast: true' },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send slate announcement email';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
