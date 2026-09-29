import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processWorkflowTick, dispatchDirectMail, evaluateLeadPoolScoring } from "@/inngest/functions";

// Create an API that serves zero-config routing
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processWorkflowTick,
    dispatchDirectMail,
    evaluateLeadPoolScoring,
  ],
});
