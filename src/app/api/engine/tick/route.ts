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
    console.error(error);
    return NextResponse.json({ error: 'Failed to queue engine tick' }, { status: 500 });
  }
}
