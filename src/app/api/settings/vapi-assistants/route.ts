import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;

    // Retrieve Vapi API Key
    const settings = await prisma.integrationSettings.findFirst({
        where: { provider: 'vapi', userId }
    });

    if (!settings || !settings.apiKey) {
        return NextResponse.json({ assistants: [] });
    }

    // Fetch Assistants from Vapi
    const response = await fetch('https://api.vapi.ai/assistant', {
        headers: {
            'Authorization': `Bearer ${settings.apiKey}`
        }
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch Vapi assistants' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ assistants: data });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
