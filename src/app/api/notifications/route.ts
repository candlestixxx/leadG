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

    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        isRead: false
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.id) {
        return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const existing = await prisma.notification.findUnique({
      where: { id: body.id }
    });

    if (!existing || existing.userId !== user.id) {
        return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const notification = await prisma.notification.update({
      where: { id: body.id },
      data: { isRead: true }
    });

    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark notification read' }, { status: 500 });
  }
}
