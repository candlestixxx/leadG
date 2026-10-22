import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/vapi/call — start an AI outbound call (assistant dials the lead).
 *
 * Why server-side: the Vapi private key never reaches the browser. The
 * dashboard's NativeDialer posts { leadId } and Vapi places the call through
 * the configured phone number with the configured assistant (Riley).
 *
 * Body: { leadId, phoneNumber? } — phoneNumber overrides the lead's stored
 * number (useful for testing to your own handset).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey || !assistantId || !phoneNumberId) {
    return NextResponse.json(
      { error: 'Vapi is not configured (VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID required).' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { leadId, phoneNumber } = body;

    let target = phoneNumber as string | undefined;
    let leadName = 'the contact';

    if (leadId && !target) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      target = (lead as any).phone || undefined;
      leadName = `${(lead as any).firstName || ''} ${(lead as any).lastName || ''}`.trim() || 'the contact';
      if (!target) {
        return NextResponse.json({ error: 'Lead has no phone number on file.' }, { status: 400 });
      }
    }

    if (!target) {
      return NextResponse.json({ error: 'phoneNumber or leadId is required' }, { status: 400 });
    }

    // Start the call via Vapi REST — assistant talks to the lead on the
    // configured line. Metadata identifies the CRM lead for call reports.
    const resp = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: {
          number: target,
          name: leadName,
        },
        assistantOverrides: {
          variableValues: {
            leadId: leadId || '',
            leadName,
          },
          serverUrl: `${process.env.NEXTAUTH_URL || 'https://excellegacyrealtygroup.site'}/api/webhooks/vapi`,
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error('[Vapi call] API error:', resp.status, JSON.stringify(data).slice(0, 300));
      return NextResponse.json(
        { error: `Vapi call failed (${resp.status}): ${data?.message || data?.error || 'unknown error'}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      callId: data.id,
      status: data.status,
      to: target,
      message: `Riley is calling ${leadName} at ${target}.`,
    });
  } catch (error: any) {
    console.error('[Vapi call] error:', error);
    return NextResponse.json({ error: 'Failed to start the Vapi call.' }, { status: 500 });
  }
}
