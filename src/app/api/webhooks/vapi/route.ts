import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmProvider, getCalendarProvider } from "@/lib/adapters";

// This endpoint receives EndOfCall webhooks from Vapi.ai
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Vapi wraps webhook events in a `message` object
    const message = payload.message;
    if (!message || message.type !== 'end-of-call-report') {
      // Return 200 to acknowledge receipt of non-EOC webhooks without processing
      return NextResponse.json({ success: true, note: "Ignored, not an end-of-call report." });
    }

    const callId = message.call?.id;
    const durationSeconds = message.duration || 0;
    const transcript = message.transcript || "";
    const summary = message.summary || "";

    // Extract custom variables injected during the call dispatch
    // We expect `leadId` to be passed in assistantOverrides.variableValues
    const leadId = message.call?.assistantOverrides?.variableValues?.leadId;

    if (!leadId) {
      console.error(`[Vapi Webhook] Missing leadId in call payload. Call ID: ${callId}`);
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    console.log(`[Vapi Webhook] Processing EOC for Lead ${leadId}. Duration: ${durationSeconds}s`);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
       return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 1. Save the CallLog for analytics tracking
    await prisma.callLog.create({
      data: {
        leadId: lead.id,
        duration: durationSeconds,
        outcome: summary ? "Completed" : "No Answer / Voicemail"
      }
    });

    // 2. Save the full Transcript to Conversation
    const conversation = await prisma.conversation.create({
        data: {
            leadId: lead.id,
            transcript: transcript
        }
    });

    // 3. Save the AI Summary
    await prisma.aIConversationSummary.create({
        data: {
            conversationId: conversation.id,
            summary: summary || "No summary provided by Vapi."
        }
    });

    // 4. Log the activity on the Lead Profile
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "OUTBOUND_CALL",
        description: `Call Connected (${durationSeconds}s)\n\nSummary: ${summary.substring(0, 200)}...`
      }
    });

    // 5. Basic Sentiment/Outcome parsing on the summary
    const summaryLower = summary.toLowerCase();
    let newStatus = lead.status;
    let urgencyBump = 0;

    if (summaryLower.includes('do not call') || summaryLower.includes('dnc') || summaryLower.includes('angry')) {
        newStatus = 'Do Not Contact';
    } else if (summaryLower.includes('interested') || summaryLower.includes('appointment') || summaryLower.includes('hot')) {
        newStatus = 'Hot Lead';
        urgencyBump = 50;
    }

    // 6. Check for appointments
    if (summaryLower.includes('tomorrow') || summaryLower.includes('today') || summaryLower.includes('monday') || summaryLower.includes('tuesday') || summaryLower.includes('wednesday') || summaryLower.includes('thursday') || summaryLower.includes('friday') || summaryLower.includes('saturday') || summaryLower.includes('sunday')) {
       if (summaryLower.includes('appointment') || summaryLower.includes('meet') || summaryLower.includes('showing')) {
          // Trigger Appointment booking adapter
          // For MVP, we extract a mock future date since parsing absolute time from natural language requires an LLM call.
          const mockAppointmentDate = new Date();
          mockAppointmentDate.setDate(mockAppointmentDate.getDate() + 1); // Tomorrow

          await getCalendarProvider().createAppointment(lead.id, mockAppointmentDate);

          await prisma.appointment.create({
              data: {
                  leadId: lead.id,
                  agentId: lead.assigned_agent_id || "unassigned",
                  date: mockAppointmentDate,
                  notes: `AI Scheduled Meeting. Summary: ${summary.substring(0, 100)}`
              }
          });
       }
    }

    // 7. Update Lead
    const updatedLeadData = {
        status: newStatus,
        urgency_score: Math.min((lead.urgency_score || 0) + urgencyBump, 100),
        // If they talked for more than 30 seconds, auto-pause automated text workflows
        activeWorkflowId: durationSeconds > 30 ? null : lead.activeWorkflowId
    };

    await prisma.lead.update({
      where: { id: lead.id },
      data: updatedLeadData
    });

    // 8. Sync Outbound CRM
    const crmProvider = getCrmProvider();
    await crmProvider.updateLead(lead.id, updatedLeadData as any);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Vapi Webhook] Error processing EndOfCallReport:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
