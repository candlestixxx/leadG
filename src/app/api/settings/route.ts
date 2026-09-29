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

    const settings = await prisma.integrationSettings.findMany({
      where: { userId: user.id }
    });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
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
    const { provider, apiKey } = body;

    const existingSetting = await prisma.integrationSettings.findFirst({
      where: { provider, userId: user.id }
    });

    let setting;
    if (existingSetting) {
      setting = await prisma.integrationSettings.update({
        where: { id: existingSetting.id },
        data: { apiKey }
      });
    } else {
      setting = await prisma.integrationSettings.create({
        data: { provider, apiKey, userId: user.id }
      });
    }

    return NextResponse.json({ message: "Settings saved successfully.", setting });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
