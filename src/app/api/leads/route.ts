import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GeocodingAdapter } from '@/lib/adapters/geocoding';
import { broadcastEvent } from '@/lib/sse/emitter';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.leadType = type;
    }

    // Apply tenant isolation
    whereClause.userId = user.id;

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { agent: true, activeWorkflow: true }
    });
    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
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

    let lat: number | null = null;
    let lon: number | null = null;

    if (body.propertyAddress && body.city && body.state && body.zip) {
      const coords = await GeocodingAdapter.geocode(body.propertyAddress, body.city, body.state, body.zip);
      if (coords) {
        lat = coords.latitude;
        lon = coords.longitude;
      }
    }

    // Determine the workflow to assign based on lead type
    let targetWorkflow = null;
    if (body.leadType === 'Buyer') {
      targetWorkflow = await prisma.followUpWorkflow.findFirst({ where: { name: 'Buyer 10-Day Blitz' } });
    } else if (body.leadType === 'Seller') {
      targetWorkflow = await prisma.followUpWorkflow.findFirst({ where: { name: 'Seller 14-Day Follow-Up' } });
    }

    const lead = await prisma.lead.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        propertyAddress: body.propertyAddress,
        city: body.city,
        state: body.state,
        zip: body.zip,
        latitude: lat,
        longitude: lon,
        leadType: body.leadType || 'Buyer',
        status: 'New',
        userId: user.id,
        activeWorkflowId: targetWorkflow ? targetWorkflow.id : undefined,
        currentWorkflowDay: targetWorkflow ? 0 : undefined,
        nextFollowUpAt: targetWorkflow ? new Date() : undefined, // Schedule immediately
      },
    });

    if (targetWorkflow) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'Workflow Started',
          description: `Assigned to ${targetWorkflow.name}`
        }
      });
    }

    // Broadcast creation to the map UI
    broadcastEvent('new_lead', lead);

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
