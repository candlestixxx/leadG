import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Initialize the MCP Server globally
const server = new Server(
  {
    name: "jules-mls-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_mls_inventory",
        description: "Query the local MLS (Multiple Listing Service) database for available properties based on neighborhood or zipcode.",
        inputSchema: {
          type: "object",
          properties: {
            neighborhood: { type: "string", description: "The neighborhood name (e.g., 'Downtown')" },
            zipcode: { type: "string", description: "The 5-digit zipcode" },
          }
        },
      },
      {
        name: "check_agent_availability",
        description: "Query the human real estate agent's calendar to check for available time slots before attempting to set a showing or appointment.",
        inputSchema: {
          type: "object",
          properties: {
            date: { type: "string", description: "The requested date in YYYY-MM-DD format (e.g., '2026-05-25')" },
            userId: { type: "string", description: "The internal ID of the agent whose calendar we are querying." }
          }
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query_mls_inventory") {
    // Phase 10 Expanded Mock MLS response logic
    const neighborhood = request.params.arguments?.neighborhood as string;
    const zipcode = request.params.arguments?.zipcode as string;

    let resultText = "No listings found for that criteria.";

    if (neighborhood && neighborhood.toLowerCase() === "downtown") {
        resultText = "Found 2 active listings in Downtown: 1: The Lofts at 1st St ($650k, 2bd/2ba). 2: Skyview Penthouse ($1.2M, 3bd/3ba).";
    } else if (zipcode === "48044" || (neighborhood && neighborhood.toLowerCase().includes("macomb"))) {
        resultText = "Found 3 active listings in Macomb (48044): 1: 123 Main St ($450k, 3bd/2ba). 2: 456 Elm St ($520k, 4bd/3ba). 3: 789 Oak Ave ($390k, 3bd/1ba).";
    } else {
        resultText = `Found 1 generic active listing in ${neighborhood || zipcode || 'the area'}: 999 Default Blvd ($350k, 2bd/1ba).`;
    }

    return {
      content: [
        {
          type: "text",
          text: resultText
        }
      ]
    };
  }

  if (request.params.name === "check_agent_availability") {
    const date = request.params.arguments?.date as string || "today";
    const userId = request.params.arguments?.userId as string;

    if (!userId) {
        return {
            content: [{ type: "text", text: "Error: Missing agent userId required to check calendar." }]
        };
    }

    try {
        const settings = await prisma.integrationSettings.findFirst({
            where: { provider: 'google_calendar_token', userId }
        });

        const token = settings?.apiKey;

        if (!token) {
            // Fallback to mock logic if no real integration exists
            return {
                content: [{ type: "text", text: `On ${date}, the agent has the following open slots: 10:00 AM, 1:30 PM, and 4:15 PM.` }]
            };
        }

        // Parse date for start/end of day constraints
        const targetDate = new Date(date === "today" ? Date.now() : date);
        const timeMin = new Date(targetDate.setHours(8, 0, 0, 0)).toISOString(); // 8 AM
        const timeMax = new Date(targetDate.setHours(18, 0, 0, 0)).toISOString(); // 6 PM

        // Real Google API Free/Busy Query
        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeMin,
              timeMax,
              items: [{ id: 'primary' }]
            }),
        });

        if (!response.ok) {
             return {
                content: [{ type: "text", text: `Error: Unable to access calendar at this time. (API returned ${response.status})` }]
            };
        }

        const data = await response.json();
        const busySlots = data.calendars?.primary?.busy || [];

        if (busySlots.length === 0) {
             return {
                content: [{ type: "text", text: `The agent is completely free on ${date} between 8 AM and 6 PM.` }]
            };
        }

        const busyText = busySlots.map((slot: any) => `- ${new Date(slot.start).toLocaleTimeString()} to ${new Date(slot.end).toLocaleTimeString()}`).join("\n");

        return {
            content: [
                {
                    type: "text",
                    text: `On ${date}, the agent is currently busy during these times:\n${busyText}\n\nYou may offer any other time slot between 8 AM and 6 PM.`
                }
            ]
        };

    } catch (e) {
        return {
            content: [{ type: "text", text: `Error checking calendar.` }]
        };
    }
  }

  throw new Error("Tool not found");
});

// Store global transport instances (in memory - ephemeral for dev)
let globalTransport: SSEServerTransport | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Initialize SSE Transport
    globalTransport = new SSEServerTransport("/api/mcp", res as any);
    await server.connect(globalTransport);

    // SSEServerTransport will take over the response and keep it open
    return;
  } else if (req.method === 'POST') {
    if (!globalTransport) {
      res.status(400).json({ error: "SSE connection not established" });
      return;
    }

    try {
      // Pages API already parses the body
      await globalTransport.handlePostMessage(req as any, res as any, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
