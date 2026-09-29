import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const p = await params;
    const snippetId = p.id;

    // Verify ownership
    const snippet = await prisma.knowledgeBaseSnippet.findUnique({
      where: { id: snippetId }
    });

    if (!snippet || snippet.userId !== session.user.id) {
      return NextResponse.json({ error: 'Snippet not found or unauthorized' }, { status: 404 });
    }

    await prisma.knowledgeBaseSnippet.delete({
      where: { id: snippetId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete snippet' }, { status: 500 });
  }
}
