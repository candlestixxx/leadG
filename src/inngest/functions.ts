import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { getVoiceProvider, getSmsProvider, getEmailProvider, getCrmProvider, LobDirectMailProvider } from "@/lib/adapters";
import { compileScript } from "@/lib/scripts";

import { Lead, Agent, User, FollowUpWorkflow, FollowUpStep } from "@prisma/client";

// The inngest handler expects a single generic function argument, not strict structural overriding here
// We'll let inngest infer the arguments.
export const processWorkflowTick = inngest.createFunction(
  { id: "process-workflow-tick", triggers: [{ event: "workflow/tick" }] },
  async ({ event, step }: any) => {

    // 1. Fetch overdue leads (same logic as the old tick endpoint)
    const overdueLeads = await step.run("fetch-overdue-leads", async () => {
        const now = new Date();
        return await prisma.lead.findMany({
            where: {
                activeWorkflowId: { not: null },
                next_follow_up_at: { lte: now }
            },
            include: {
                activeWorkflow: { include: { steps: true } },
                agent: true,
                user: true
            },
            take: 50 // process in batches of 50 to prevent timeout blocks
        });
    });

    let processedCount = 0;

    // 2. Process each lead in parallel steps
    type OverdueLead = Lead & { activeWorkflow: (FollowUpWorkflow & { steps: FollowUpStep[] }) | null, agent: Agent | null, user: User | null };

    const processPromises = overdueLeads.map((lead: OverdueLead) => {
        return step.run(`process-lead-${lead.id}`, async () => {
            if (!lead.activeWorkflow) return;

            const currentDay = lead.currentWorkflowDay || 0;

            const nextSteps = lead.activeWorkflow.steps
              .filter((s: FollowUpStep) => s.day >= currentDay)
              .sort((a: FollowUpStep, b: FollowUpStep) => a.day - b.day);

            if (nextSteps.length === 0) {
                // Workflow complete
                await prisma.lead.update({
                  where: { id: lead.id },
                  data: {
                    activeWorkflowId: null,
                    status: "Nurture" // Or some other completion state
                  }
                });
                return;
            }

            const activeStep = nextSteps[0];

            // Execute Action
            let stepExecuted = false;

            if (activeStep.channel === "sms" && activeStep.message) {
              const compiled = compileScript(activeStep.message, { ...lead, agent_name: lead.agent?.name || 'an agent' } as any);
              await getSmsProvider().sendText(lead.id, compiled);

              await prisma.leadActivity.create({
                data: { leadId: lead.id, type: "OUTBOUND_SMS", description: `Sent: ${compiled}` }
              });
              stepExecuted = true;
            }
            else if (activeStep.channel === "email" && activeStep.message) {
              const compiled = compileScript(activeStep.message, { ...lead, agent_name: lead.agent?.name || 'an agent' } as any);
              await getEmailProvider().sendEmail(lead.id, "Follow Up", compiled);

              await prisma.leadActivity.create({
                data: { leadId: lead.id, type: "OUTBOUND_EMAIL", description: `Sent: ${compiled}` }
              });
              stepExecuted = true;
            }
            else if (activeStep.channel === "call") {
               // Initiate AI Voice Call
               await getVoiceProvider().callLead(lead.id);
               // Note: Post-call intelligence happens via the Vapi Webhook later.
               stepExecuted = true;
            }

            // Calculate next follow up date based on the *next* available step
            const upcomingSteps = lead.activeWorkflow.steps
              .filter((s: FollowUpStep) => s.day > activeStep.day)
              .sort((a: FollowUpStep, b: FollowUpStep) => a.day - b.day);

            let nextFollowUpDate = null;
            if (upcomingSteps.length > 0) {
               const daysUntilNext = upcomingSteps[0].day - activeStep.day;
               nextFollowUpDate = new Date();
               nextFollowUpDate.setDate(nextFollowUpDate.getDate() + daysUntilNext);
            }

            const leadUpdates = {
                currentWorkflowDay: activeStep.day + 1,
                next_follow_up_at: nextFollowUpDate,
                status: "Contacted"
            };

            await prisma.lead.update({
                where: { id: lead.id },
                data: leadUpdates
            });

            // Trigger Outbound CRM Hook
            await getCrmProvider().updateLead(lead.id, leadUpdates);

            return lead.id;
        });
    });

    // Wait for all lead-processing steps to resolve
    const results = await Promise.all(processPromises);
    processedCount = results.filter(r => !!r).length;

    return { message: `Processed ${processedCount} leads.` };
  }
);

export const evaluateLeadPoolScoring = inngest.createFunction(
  { id: "evaluate-lead-pool-scoring", triggers: [{ event: "scoring/evaluate-pool" }] },
  async ({ event, step }: any) => {
    // This background job runs periodically to predict ML scores for all active leads across the entire pool
    const activeLeads = await step.run("fetch-active-leads", async () => {
       return await prisma.lead.findMany({
         where: { status: { notIn: ["Closed/Archived", "Do Not Contact", "Nurture"] } },
         include: { activities: { orderBy: { createdAt: 'desc' }, take: 10 } },
       });
    });

    let updatedCount = 0;
    const batchSize = 10;

    for (let i = 0; i < activeLeads.length; i += batchSize) {
        const batch = activeLeads.slice(i, i + batchSize);
        await step.run(`process-scoring-batch-${i}`, async () => {
            for (const lead of batch) {
                const { SentimentAnalyzer } = await import('@/lib/adapters/sentiment');
                const newScore = await SentimentAnalyzer.predictLeadScore(lead, lead.activities, lead.userId || undefined);

                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { urgency_score: newScore }
                });
            }
        });
        updatedCount += batch.length;
    }

    return { message: `Re-evaluated predictive ML scoring for ${updatedCount} leads.` };
  }
);


export const dispatchDirectMail = inngest.createFunction(
  { id: "dispatch-direct-mail", triggers: [{ event: "direct-mail/dispatch" }] },
  async ({ event, step }: any) => {
    const { leadId, campaignType, taskId } = event.data;

    return await step.run("execute-lob-api", async () => {
      const directMail = new LobDirectMailProvider();
      const success = await directMail.createMailTask(leadId, campaignType);

      await prisma.directMailTask.update({
        where: { id: taskId },
        data: {
          status: success ? 'Dispatched' : 'Failed'
        }
      });

      return { success, taskId };
    });
  }
);
