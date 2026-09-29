export const SCRIPTS = {
  buyerFirstCall: "Hi {{first_name}}, this is Jules with {{agent_name}}'s real estate team. I saw you were looking at homes in {{area}} and wanted to quickly help you get the right information. Are you still interested in homes around there?",
  sellerFirstCall: "Hi {{first_name}}, this is Jules with {{agent_name}}'s real estate team. I saw you may be interested in the value of your property at {{property_address}}. I just wanted to confirm a couple details so {{agent_name}} can give you a more accurate local number.",
  circleProspecting: "Hi {{first_name}}, this is Jules with {{agent_name}}'s real estate team. I'm calling because there has been recent activity around {{neighborhood}}, and we may have buyers looking in the area. Have you heard of anyone nearby thinking about selling?",
  warmTransferBridge: "That's great, {{first_name}}. I have {{agent_name}} available now. Let me connect you so they can help with the exact next step.",
  agentWhisper: "You have a hot {{lead_type}} lead. Name: {{first_name}} {{last_name}}. Area: {{area}}. Timeline: {{timeline}}. Motivation: {{motivation}}. Press 1 to connect."
};

export function compileScript(scriptTemplate: string, data: Record<string, string | null | undefined>): string {
  let compiled = scriptTemplate;
  const matches = compiled.match(/{{(.*?)}}/g);

  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, '').trim();
      const value = data[key] || 'N/A';
      compiled = compiled.replaceAll(match, value);
    });
  }

  return compiled;
}

export function generateMockSummary(leadData: Record<string, string | null | undefined>, outcome: string): string {
  return `
Lead Name: ${leadData.first_name} ${leadData.last_name}
Lead Type: ${leadData.lead_type}
Phone: ${leadData.phone || 'N/A'}
Email: ${leadData.email || 'N/A'}
Conversation Outcome: ${outcome}
Motivation: ${leadData.motivation || 'Just looking'}
Timeline: ${leadData.timeline || '3-6 months'}
Budget: ${leadData.budget || 'Not specified'}
Urgency Score: ${outcome.includes('Transferred') ? 90 : 50}
Recommended Next Action: ${outcome.includes('Transferred') ? 'Agent follow up' : 'Continue 10-Day Blitz'}
  `.trim();
}
