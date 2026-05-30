import { generateEmbedding } from './embeddings';
import { vectorStore } from './vectorStore';

export interface SearchResult {
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  /** Cosine similarity score in the range [0, 1]. Higher = more relevant. */
  score?: number;
}

/**
 * Searches for relevant code snippets across all indexed repositories.
 * Returns results ordered by descending cosine similarity score.
 */
export async function searchCode(
  query: string,
  repoFullName?: string,
  limit: number = 10,
): Promise<SearchResult[]> {
  await vectorStore.load();
  const queryVector = await generateEmbedding(query);

  const entries = await vectorStore.search(queryVector, limit, (e) => {
    if (repoFullName && e.metadata.repoFullName !== repoFullName) return false;
    return true;
  });

  return entries.map((e) => ({
    content: e.metadata.content,
    filePath: e.metadata.filePath,
    startLine: e.metadata.startLine,
    endLine: e.metadata.endLine,
  }));
}
