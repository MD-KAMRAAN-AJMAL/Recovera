/**
 * Repository Ingestion Service
 *
 * Fetches source files from a GitHub repository, chunks them into
 * manageable pieces, generates vector embeddings, and stores them
 * in the SimpleVectorStore for semantic code search during RCA.
 *
 * Flow:
 *   ingestRepository()
 *     → GitHub API: list all files (git tree)
 *     → Filter to supported source file extensions
 *     → Fetch each file's content via GitHub Contents API
 *     → chunkFile() → 50-line overlapping chunks
 *     → generateEmbeddings() → Google text-embedding-004
 *     → vectorStore.add() + vectorStore.save()
 *     → Persist RepositoryIndex record to DB
 */

import { prisma } from '../prisma';
import { chunkFile, getLanguageFromExtension } from './chunker';
import { generateEmbeddings } from './embeddings';
import { vectorStore, VectorEntry } from './vectorStore';
import { randomUUID } from 'crypto';

// File extensions to include in the index
const SUPPORTED_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'go', 'java', 'rb', 'rs', 'cs',
]);

// GitHub API batch size — how many files to embed in one call
const EMBEDDING_BATCH_SIZE = 20;

// Max file size to index (100 KB) — skip large generated/minified files
const MAX_FILE_BYTES = 100_000;

export interface IngestionResult {
  repoFullName: string;
  filesIndexed: number;
  chunksIndexed: number;
  errors: string[];
  skipped: number;
}

interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
  url: string;
}

interface GitHubFileContent {
  content: string;   // base64-encoded
  encoding: string;
  size: number;
}

/**
 * Lists all files in a GitHub repository using the Git Trees API.
 * Returns a flat, recursive list of blobs (files).
 */
async function fetchRepoTree(
  repoFullName: string,
  branch: string,
  githubToken: string,
): Promise<GitHubTreeItem[]> {
  const url = `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub Trees API failed for ${repoFullName}: ${response.status} — ${(err as any).message ?? 'unknown error'}`,
    );
  }

  const data = await response.json();
  return (data.tree as GitHubTreeItem[]).filter((item) => item.type === 'blob');
}

/**
 * Fetches the decoded text content of a single file from GitHub.
 * Returns null if the file cannot be fetched or decoded.
 */
async function fetchFileContent(
  repoFullName: string,
  filePath: string,
  githubToken: string,
): Promise<string | null> {
  const url = `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(filePath)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as GitHubFileContent;
  if (data.encoding !== 'base64') return null;

  try {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Returns true if a file path should be included in the index.
 * Excludes node_modules, build artifacts, and non-source files.
 */
function isIndexable(filePath: string, sizeBytes?: number): boolean {
  // Skip oversized files
  if (sizeBytes && sizeBytes > MAX_FILE_BYTES) return false;

  // Skip common non-source directories
  const blocklist = [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    '.git/',
    'generated/',
    '__pycache__/',
    '.cache/',
    'coverage/',
    'vendor/',
  ];
  if (blocklist.some((blocked) => filePath.includes(blocked))) return false;

  // Check extension
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Main entry point. Ingests all source files from a GitHub repository
 * into the vector store for semantic retrieval.
 *
 * @param repoFullName - e.g. "Priyanshu8023/Recovera"
 * @param githubToken  - OAuth access token with `repo` (or `public_repo`) scope
 * @param branch       - Default branch to index (default: "main")
 * @returns IngestionResult with counts and any errors encountered
 */
export async function ingestRepository(
  repoFullName: string,
  githubToken: string,
  branch = 'main',
): Promise<IngestionResult> {
  console.log(`[Ingestion] Starting ingestion for ${repoFullName} (branch: ${branch})...`);

  const result: IngestionResult = {
    repoFullName,
    filesIndexed: 0,
    chunksIndexed: 0,
    errors: [],
    skipped: 0,
  };

  // 1. Mark ingestion as in-progress in the DB
  await prisma.repositoryIndex.upsert({
    where: { repoFullName },
    update: { status: 'pending', errorMessage: null, updatedAt: new Date() },
    create: {
      repoFullName,
      status: 'pending',
      filesIndexed: 0,
      chunksIndexed: 0,
    },
  });

  try {
    // 2. Load the current vector store state
    await vectorStore.load();

    // 3. Fetch the full file tree from GitHub
    console.log(`[Ingestion] Fetching file tree for ${repoFullName}...`);
    const tree = await fetchRepoTree(repoFullName, branch, githubToken);
    const indexableFiles = tree.filter((f) => isIndexable(f.path, f.size));

    console.log(
      `[Ingestion] ${tree.length} total files, ${indexableFiles.length} eligible for indexing.`,
    );

    // 4. Fetch content, chunk, and embed in batches
    let pendingChunks: { chunk: ReturnType<typeof chunkFile>[0] }[] = [];
    let pendingTexts: string[] = [];

    const flushBatch = async () => {
      if (pendingTexts.length === 0) return;

      try {
        const embeddings = await generateEmbeddings(pendingTexts);
        for (let i = 0; i < pendingChunks.length; i++) {
          const { chunk } = pendingChunks[i];
          const entry: VectorEntry = {
            id: randomUUID(),
            vector: embeddings[i],
            metadata: {
              content: chunk.content,
              filePath: chunk.filePath,
              startLine: chunk.startLine,
              endLine: chunk.endLine,
              repoFullName,
            },
          };
          await vectorStore.add(entry);
          result.chunksIndexed++;
        }
      } catch (embeddingError) {
        const message =
          embeddingError instanceof Error ? embeddingError.message : 'Embedding error';
        result.errors.push(`Batch embedding failed: ${message}`);
      }

      // Reset batch
      pendingChunks = [];
      pendingTexts = [];
    };

    for (const file of indexableFiles) {
      const content = await fetchFileContent(repoFullName, file.path, githubToken);

      if (!content) {
        result.skipped++;
        continue;
      }

      const language = getLanguageFromExtension(file.path);
      const chunks = chunkFile(file.path, content, language);

      for (const chunk of chunks) {
        pendingChunks.push({ chunk });
        pendingTexts.push(
          `File: ${chunk.filePath}\nLines: ${chunk.startLine}-${chunk.endLine}\n\n${chunk.content}`,
        );

        if (pendingTexts.length >= EMBEDDING_BATCH_SIZE) {
          await flushBatch();
        }
      }

      result.filesIndexed++;
    }

    // Flush any remaining chunks
    await flushBatch();

    // 5. Persist the vector store to disk
    console.log(`[Ingestion] Saving vector store...`);
    await vectorStore.save();

    // 6. Update the DB record to reflect success
    await prisma.repositoryIndex.update({
      where: { repoFullName },
      data: {
        status: 'indexed',
        filesIndexed: result.filesIndexed,
        chunksIndexed: result.chunksIndexed,
        indexedAt: new Date(),
      },
    });

    console.log(
      `[Ingestion] Done. Files: ${result.filesIndexed}, Chunks: ${result.chunksIndexed}, Errors: ${result.errors.length}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion error';
    result.errors.push(message);

    // Mark as failed in DB
    await prisma.repositoryIndex.update({
      where: { repoFullName },
      data: { status: 'failed', errorMessage: message },
    }).catch(() => {});

    console.error(`[Ingestion] Failed for ${repoFullName}:`, error);
  }

  return result;
}
