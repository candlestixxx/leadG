export interface VoiceProvider {
  callLead(leadId: string): Promise<boolean>;
  warmTransfer(leadId: string, agentPhone: string): Promise<boolean>;
}

export interface SmsProvider {
  sendText(leadId: string, message: string, channel?: 'sms' | 'whatsapp'): Promise<boolean>;
}

export interface EmailProvider {
  sendEmail(leadId: string, subject: string, body: string): Promise<boolean>;
}

import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { Lead } from '@prisma/client';

export interface CrmProvider {
  updateLead(leadId: string, data: Partial<Lead>): Promise<boolean>;
}

export interface DirectMailProvider {
  createMailTask(leadId: string, campaignType: string): Promise<boolean>;
}

export interface CalendarProvider {
  createAppointment(leadId: string, date: Date): Promise<boolean>;
}

export interface SocialMessagingProvider {
  sendSocialMessage(leadId: string, platform: string, message: string): Promise<boolean>;
}

export class MockVoiceProvider implements VoiceProvider {
  async callLead(leadId: string) {
    console.log(`Mock: Calling lead ${leadId}`);
    return true;
  }
  async warmTransfer(leadId: string, agentPhone: string) {
    console.log(`Mock: Warm transferring lead ${leadId} to agent ${agentPhone}`);
    return true;
  }
}

export class GoogleCalendarProvider implements CalendarProvider {
  async createAppointment(leadId: string, date: Date) {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new Error('Lead not found');

      const settings = await prisma.integrationSettings.findFirst({
        where: { provider: 'google_calendar_token', userId: lead.userId || undefined }
      });
      const token = settings?.apiKey;

      if (!token) {
        console.warn('Google Calendar token missing, falling back to mock provider');
        return new MockCalendarProvider().createAppointment(leadId, date);
      }

      // Mock integration for Google Calendar (would use googleapis package in production)
      // e.g. calendar.events.insert({ ... })
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `Showing / Meeting with ${lead.first_name} ${lead.last_name}`,
          description: `Automatically scheduled by Jules AI.\nPhone: ${lead.phone}\nEmail: ${lead.email}`,
          start: {
            dateTime: date.toISOString(),
          },
          end: {
            // Assume 1 hour meeting duration
            dateTime: new Date(date.getTime() + 60 * 60 * 1000).toISOString()
          }
        }),
      });

      if (!response.ok) {
        console.error(`Google Calendar API error: ${response.statusText}`);
        return false;
      }

      console.log(`Google Calendar: Successfully created appointment for ${lead.first_name} at ${date}`);
      return true;
    } catch (e) {
      console.error('Google Calendar Error:', e);
      return false;
    }
  }
}

export function getCalendarProvider(): CalendarProvider {
  return new GoogleCalendarProvider();
}

export class LobDirectMailProvider implements DirectMailProvider {
  async createMailTask(leadId: string, campaignType: string) {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || !lead.property_address || !lead.city || !lead.state || !lead.zip) {
        throw new Error('Lead missing complete mailing address fields');
      }

      const settings = await prisma.integrationSettings.findFirst({
        where: { provider: 'lob_api_key', userId: lead.userId || undefined }
      });
      const lobKey = settings?.apiKey;

      if (!lobKey) {
        console.warn('Lob API key missing, falling back to mock provider');
        return new MockDirectMailProvider().createMailTask(leadId, campaignType);
      }

      const authHeader = 'Basic ' + Buffer.from(`${lobKey}:`).toString('base64');

      const response = await fetch('https://api.lob.com/v1/postcards', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Campaign: ${campaignType}`,
          to: {
            name: `${lead.first_name} ${lead.last_name}`,
            address_line1: lead.property_address,
            address_city: lead.city,
            address_state: lead.state,
            address_zip: lead.zip
          },
          // Mock HTML template for Lob
          front: "<html><body><h1>Exclusive Home Value Report for {{name}}</h1></body></html>",
          back: "<html><body><h1>Contact Jules Real Estate today!</h1></body></html>",
          merge_variables: {
            name: lead.first_name
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Lob API error: ${response.status} ${response.statusText}`);
      }

      console.log(`Lob: Successfully dispatched ${campaignType} postcard to ${lead.property_address}`);
      return true;
    } catch (e) {
      console.error('Lob Direct Mail Error:', e);
      return false;
    }
  }
}

export { getCrmProvider } from './crmOutbound';

export class VapiVoiceProvider implements VoiceProvider {
  async callLead(leadId: string) {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || !lead.phone) throw new Error('Lead phone number missing');

      const settings = await prisma.integrationSettings.findMany({
        where: { provider: { in: ['vapi', 'vapi_assistant_id'] }, userId: lead.userId || undefined }
      });
      const vapiKey = settings.find(s => s.provider === 'vapi')?.apiKey;
      const vapiAssistantId = settings.find(s => s.provider === 'vapi_assistant_id')?.apiKey;

      if (!vapiKey) {
        console.warn('Vapi credentials missing, falling back to mock provider');
        return new MockVoiceProvider().callLead(leadId);
      }

      if (!vapiAssistantId) {
        console.warn('Vapi Assistant ID missing, falling back to mock provider');
        return new MockVoiceProvider().callLead(leadId);
      }

      // Fetch knowledge base snippets to inject into the AI
      const snippets = await prisma.knowledgeBaseSnippet.findMany({
        where: { userId: lead.userId || undefined }
      });

      let knowledgeContext = "";
      if (snippets.length > 0) {
        knowledgeContext = "\n\nKNOWLEDGE BASE (Use these facts to answer questions):\n" +
          snippets.map(s => `Q: ${s.question}\nA: ${s.answer}`).join("\n\n");
      }

      const response = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumberId: 'your-vapi-phone-number-id', // Assuming static or from settings in a real app
          customer: {
            number: lead.phone,
            name: `${lead.first_name} ${lead.last_name}`,
          },
          assistantOverrides: {
            systemPrompt: `You are Jules, an AI real estate assistant. ${knowledgeContext}`,
            variableValues: {
              leadId: lead.id,
              userId: lead.userId || "mock_user"
            },
            clientMessages: ["tool-calls"],
            serverMessages: ["tool-calls", "end-of-call-report"],
            serverUrl: "https://your-production-url.com/api/webhooks/vapi-tools",
            tools: [
              {
                type: "function",
                function: {
                  name: "book_appointment",
                  description: "Book an appointment or showing on the agent's calendar. Call this ONLY after checking agent availability and agreeing on a time with the user.",
                  parameters: {
                    type: "object",
                    properties: {
                      datetime: {
                        type: "string",
                        description: "The ISO 8601 string of the date and time to book (e.g., '2026-05-25T14:30:00Z')"
                      }
                    },
                    required: ["datetime"]
                  }
                }
              }
            ]
          },
          assistantId: vapiAssistantId,
        }),
      });

      if (!response.ok) throw new Error(`Vapi API error: ${response.statusText}`);

      console.log(`Vapi: Successfully initiated call to ${lead.phone}`);
      return true;
    } catch (e) {
      console.error('Vapi Error:', e);
      return false;
    }
  }

  async warmTransfer(leadId: string, agentPhone: string) {
    console.log(`Vapi Mock: Warm transferring lead ${leadId} to agent ${agentPhone}`);
    // Note: Warm transfers in Vapi typically require handling mid-call functions
    // via a Server URL. For MVP outbound, we mock this specific step.
    return true;
  }
}

export function getVoiceProvider(): VoiceProvider {
  return new VapiVoiceProvider();
}

export class SendGridEmailProvider implements EmailProvider {
  async sendEmail(leadId: string, subject: string, body: string) {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || !lead.email) throw new Error('Lead email address missing');

      const settings = await prisma.integrationSettings.findMany({
        where: {
          provider: { in: ['sendgrid_api_key', 'sendgrid_from_email'] },
          userId: lead.userId || undefined
        }
      });

      const apiKey = settings.find(s => s.provider === 'sendgrid_api_key')?.apiKey;
      const fromEmail = settings.find(s => s.provider === 'sendgrid_from_email')?.apiKey;

      if (!apiKey || !fromEmail) {
        console.warn('SendGrid credentials incomplete, falling back to mock provider');
        return new MockEmailProvider().sendEmail(leadId, subject, body);
      }

      sgMail.setApiKey(apiKey);

      const msg = {
        to: lead.email,
        from: fromEmail,
        subject: subject,
        text: body,
      };

      await sgMail.send(msg);
      console.log(`SendGrid: Successfully sent email to ${lead.email}`);
      return true;
    } catch (e) {
      console.error('SendGrid Error:', e);
      return false;
    }
  }
}

export function getEmailProvider(): EmailProvider {
  return new SendGridEmailProvider();
}

export class MockCalendarProvider implements CalendarProvider {
  async createAppointment(leadId: string, date: Date) {
    console.log(`Mock: Setting up calendar appointment for lead ${leadId} at ${date}`);
    return true;
  }
}

export class MockSocialMessagingProvider implements SocialMessagingProvider {
  async sendSocialMessage(leadId: string, platform: string, message: string) {
    console.log(`Mock: Sending ${platform} message to lead ${leadId}: ${message}`);
    return true;
  }
}

export class MockDirectMailProvider implements DirectMailProvider {
  async createMailTask(leadId: string, campaignType: string) {
    console.log(`Mock: Creating Direct Mail Task for lead ${leadId} - Campaign: ${campaignType}`);
    return true;
  }
}

export class MockSmsProvider implements SmsProvider {
  async sendText(leadId: string, message: string, channel: 'sms' | 'whatsapp' = 'sms') {
    console.log(`Mock: Sending ${channel.toUpperCase()} to lead ${leadId}: ${message}`);
    return true;
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async sendText(leadId: string, message: string, channel: 'sms' | 'whatsapp' = 'sms') {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead || !lead.phone) throw new Error('Lead phone number missing');

      const settings = await prisma.integrationSettings.findMany({
        where: {
          provider: { in: ['twilio_sid', 'twilio_token', 'twilio_from_number', 'preferred_messaging_channel'] },
          userId: lead.userId || undefined
        }
      });

      const sid = settings.find(s => s.provider === 'twilio_sid')?.apiKey;
      const token = settings.find(s => s.provider === 'twilio_token')?.apiKey;
      const from = settings.find(s => s.provider === 'twilio_from_number')?.apiKey;
      const preferredChannel = settings.find(s => s.provider === 'preferred_messaging_channel')?.apiKey || channel;

      if (!sid || !token || !from) {
        console.warn('Twilio credentials incomplete, falling back to mock provider');
        return new MockSmsProvider().sendText(leadId, message, preferredChannel as 'sms' | 'whatsapp');
      }

      const client = twilio(sid, token);

      // Twilio requires "whatsapp:" prefix for WhatsApp routing
      const isWhatsApp = preferredChannel.toLowerCase() === 'whatsapp';
      const toStr = isWhatsApp ? `whatsapp:${lead.phone}` : lead.phone;
      const fromStr = isWhatsApp ? `whatsapp:${from}` : from;

      await client.messages.create({
        body: message,
        from: fromStr,
        to: toStr
      });

      console.log(`Twilio: Successfully sent ${isWhatsApp ? 'WhatsApp message' : 'SMS'} to ${toStr}`);
      return true;
    } catch (e) {
      console.error('Twilio Error:', e);
      return false;
    }
  }
}

export function getSmsProvider(): SmsProvider {
  // Can be configured to switch dynamically based on environment or settings
  return new TwilioSmsProvider();
}

export class MockEmailProvider implements EmailProvider {
  async sendEmail(leadId: string, subject: string, body: string) {
    console.log(`Mock: Sending Email to lead ${leadId} - ${subject}`);
    return true;
  }
}

export class MockCrmProvider implements CrmProvider {
  async updateLead(leadId: string, data: Partial<Lead>) {
    console.log(`Mock: Updating lead ${leadId} in CRM with data:`, data);
    return true;
  }
}
