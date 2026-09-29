import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCrmProvider } from '@/lib/adapters';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const p = await params;
    const leadId = p.id;
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        agent: true,
        activeWorkflow: true,
        activities: { orderBy: { createdAt: 'desc' } },
        scores: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!lead || lead.userId !== user.id) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const p = await params;
    const leadId = p.id;

    // Verify ownership before updating
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId }});
    if (!existingLead || existingLead.userId !== user.id) {
        return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    const body = await request.json();

    // Prevent Mass Assignment / IDOR: Strip out protected fields from the update payload
    const { id, userId, createdAt, updatedAt, ...safeUpdateData } = body;

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: safeUpdateData,
    });

    // Trigger CRM sync out of band
    getCrmProvider().updateLead(leadId, body).catch(e => {
        console.error("Failed async CRM push", e);
    });

    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
