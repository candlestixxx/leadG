import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const snippets = await prisma.knowledgeBaseSnippet.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(snippets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { question, answer, category } = body;

    const snippet = await prisma.knowledgeBaseSnippet.create({
      data: {
        userId: session.user.id,
        question,
        answer,
        category: category || 'General'
      }
    });

    return NextResponse.json(snippet, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 });
  }
}
