import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCalendarProvider } from "@/lib/adapters";

// This endpoint receives mid-call function execution requests from Vapi.ai (Server URL)
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const message = payload.message;

    if (!message || message.type !== 'tool-calls') {
      return NextResponse.json({ success: true, note: "Ignored, not a tool-calls report." });
    }

    const toolCalls = message.toolCalls;
    const results: any[] = [];

    // The leadId should have been injected into the Vapi call as a variable
    const leadId = message.call?.assistantOverrides?.variableValues?.leadId;

    if (!leadId) {
        return NextResponse.json({ error: "Missing leadId in call payload context." }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    for (const call of toolCalls) {
      if (call.function.name === 'book_appointment') {
        const args = call.function.arguments;

        if (!lead) {
            results.push({
                toolCallId: call.id,
                result: "Error: Lead not found in CRM. Cannot book appointment."
            });
            continue;
        }

        try {
            // For MVP, parse the requested ISO date string
            const targetDate = new Date(args.datetime);

            // Execute Calendar Provider
            const success = await getCalendarProvider().createAppointment(lead.id, targetDate);

            if (success) {
                // Save to Database
                await prisma.appointment.create({
                    data: {
                        leadId: lead.id,
                        agentId: lead.assigned_agent_id || "unassigned",
                        date: targetDate,
                        notes: `Live AI Booking via Vapi Tool Call.`
                    }
                });

                if (lead.userId) {
                    await prisma.notification.create({
                        data: {
                            userId: lead.userId,
                            title: 'Appointment Booked!',
                            message: `Jules AI booked an appointment with ${lead.first_name} for ${targetDate.toLocaleString()}.`,
                            linkUrl: `/leads/${lead.id}`
                        }
                    });
                }

                results.push({
                    toolCallId: call.id,
                    result: `Success! The appointment has been booked for ${targetDate.toLocaleString()}. You can confirm this with the user.`
                });
            } else {
                results.push({
                    toolCallId: call.id,
                    result: `Failed to book the appointment due to a calendar API error. Ask the user to hold or try a different time.`
                });
            }

        } catch (e) {
            results.push({
                toolCallId: call.id,
                result: `System error occurred while trying to parse the date.`
            });
        }
      } else {
        // Unrecognized tool
        results.push({
            toolCallId: call.id,
            result: `Error: Unrecognized tool name ${call.function.name}`
        });
      }
    }

    // Return the results array required by Vapi to continue the conversation
    return NextResponse.json({ results });

  } catch (error) {
    console.error("[Vapi Tools Webhook] Error processing Tool Call:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
