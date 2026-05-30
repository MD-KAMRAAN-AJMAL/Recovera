import { embed } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Generates an embedding for a given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // If AGENT_MOCK is true, return a mocked 768-dimensional vector (size of text-embedding-004)
  if (process.env.AGENT_MOCK === 'true') {
    return Array(768).fill(0).map(() => Math.random() - 0.5);
  }

  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: text,
  });
  return embedding;
}

/**
 * Generates embeddings for a batch of texts.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
  return embeddings;
}
