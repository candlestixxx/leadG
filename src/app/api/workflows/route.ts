import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // No tenant isolation explicitly required on workflows because they are global templates for the MVP.
    // If user-specific templates are desired later, add `userId` to `FollowUpWorkflow`.

    const workflows = await prisma.followUpWorkflow.findMany({
      include: {
        steps: {
          orderBy: { day: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(workflows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;
    const workflow = await prisma.followUpWorkflow.create({
      data: { name, description }
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, steps } = body;

    // Delete existing steps for this workflow to replace with reordered steps
    await prisma.followUpStep.deleteMany({
      where: { workflowId }
    });

    // Re-create the steps based on the new array order
    // Note: 'day' mapping could be re-calculated based on index or preserved from the front end.
    const newSteps = steps.map((step: any, index: number) => ({
      workflowId,
      day: step.day || index, // fallback to index if day is somehow stripped
      channel: step.channel,
      message: step.message || null,
      script: step.script || null,
    }));

    await prisma.followUpStep.createMany({
      data: newSteps
    });

    const updatedWorkflow = await prisma.followUpWorkflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { day: 'asc' } } }
    });

    return NextResponse.json({ message: 'Workflow updated successfully', workflow: updatedWorkflow });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}
