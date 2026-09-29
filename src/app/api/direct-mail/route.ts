import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { inngest } from "@/inngest/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tasks = await prisma.directMailTask.findMany({
      where: {
        lead: {
          userId: user.id
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch direct mail tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { leadId, campaignType } = body;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.userId !== user.id) return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });

    // 1. Create task in Pending state
    const task = await prisma.directMailTask.create({
      data: {
        leadId,
        campaignType,
        status: 'Pending',
      }
    });

    // 2. Dispatch async Inngest event
    await inngest.send({
        name: 'direct-mail/dispatch',
        data: {
            leadId,
            campaignType,
            taskId: task.id
        }
    });

    await prisma.leadActivity.create({
      data: { leadId, type: 'Direct Mail', description: `Direct mail task queued for ${campaignType}` }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create direct mail task' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma.user.findUnique({ where: { email: session.user.email }});
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { taskId, status } = body;

        // Verify task ownership via the lead
        const existingTask = await prisma.directMailTask.findUnique({
            where: { id: taskId },
            include: { lead: true }
        });
        if (!existingTask || existingTask.lead.userId !== user.id) {
            return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
        }

        const updatedTask = await prisma.directMailTask.update({
            where: { id: taskId },
            data: { status }
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update direct mail task' }, { status: 500 });
    }
}
