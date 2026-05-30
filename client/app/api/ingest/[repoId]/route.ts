/**
 * POST /api/ingest/[repoId]
 *
 * Manually triggers or re-triggers the RAG ingestion pipeline for a
 * specific repository. Useful for initial indexing, forced re-indexing
 * after a large push, and debugging.
 *
 * Body (optional):
 *   { force?: boolean }  — if true, re-indexes even if already indexed
 *
 * Returns:
 *   { message, filesIndexed, chunksIndexed, errors }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ingestRepository } from '@/lib/retrieval/ingestionService';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve the GitHub access token from the session
    const accessToken = (session as any).accessToken as string | undefined;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No GitHub access token found. Please sign out and sign in again.' },
        { status: 403 },
      );
    }

    const { repoId } = await params;
    const body = await req.json().catch(() => ({}));
    const force: boolean = body?.force === true;

    // Resolve the repository
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const repository = await prisma.repository.findFirst({
      where: { id: repoId, userId: user.id },
      select: { id: true, fullName: true, defaultBranch: true },
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Skip if already indexed (unless forced)
    if (!force) {
      const existingIndex = await prisma.repositoryIndex.findUnique({
        where: { repoFullName: repository.fullName },
        select: { status: true },
      });

      if (existingIndex?.status === 'indexed') {
        return NextResponse.json({
          message: 'Repository is already indexed. Use { force: true } to re-index.',
          repoFullName: repository.fullName,
          alreadyIndexed: true,
        });
      }
    }

    // Trigger ingestion (runs synchronously so the caller gets a result)
    const result = await ingestRepository(
      repository.fullName,
      accessToken,
      repository.defaultBranch ?? 'main',
    );

    return NextResponse.json({
      message: `Ingestion complete for ${repository.fullName}`,
      filesIndexed: result.filesIndexed,
      chunksIndexed: result.chunksIndexed,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('[Ingest API] Error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
