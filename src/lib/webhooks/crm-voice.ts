/**
 * CRM Webhook Sender
 *
 * Posts call events from VoiceForge AI (leadG) to the main CRM's
 * activity timeline via the Voice → CRM webhook.
 */

interface VoiceCallEvent {
  callId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  status: string;
  duration?: number;
  transcript?: string;
  summary?: string;
  sentiment?: number;
  outcome?: string;
  leadEmail?: string;
  leadPhone?: string;
  workspaceId?: string;
}

const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/voice';
const CRM_WEBHOOK_TOKEN = process.env.VOICE_WEBHOOK_TOKEN || '';

/**
 * Send a call completion event to the main CRM.
 * Fire-and-forget — logs errors but doesn't block call processing.
 */
export async function sendVoiceEventToCRM(event: VoiceCallEvent): Promise<boolean> {
  if (!CRM_WEBHOOK_TOKEN) {
    console.warn('[CRM Webhook] VOICE_WEBHOOK_TOKEN not set — skipping CRM sync');
    return false;
  }

  try {
    const res = await fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRM_WEBHOOK_TOKEN}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[CRM Webhook] Failed with status ${res.status}:`, await res.text());
      return false;
    }

    console.log(`[CRM Webhook] Call ${event.callId} synced to CRM`);
    return true;
  } catch (err) {
    console.error('[CRM Webhook] Error sending voice event:', err instanceof Error ? err.message : err);
    return false;
  }
}
