import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST() {
  try {
    // We now decouple the chron logic. Instead of processing synchronously,
    // we fire an event into the background queue to be handled by Inngest.
    await inngest.send({
      name: 'workflow/tick',
      data: {}
    });

    return NextResponse.json({
        success: true,
        message: 'Engine tick successfully queued for background processing.'
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/event key|signing key|ECONNREFUSED|fetch failed|ENOTFOUND/i.test(msg)) {
      return NextResponse.json({
        success: false,
        queued: false,
        message: 'Engine tick not queued — Inngest is not configured. Set INNGEST_EVENT_KEY to enable.'
      }, { status: 202 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to queue engine tick' }, { status: 500 });
  }
}
