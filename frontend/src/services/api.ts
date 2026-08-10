/**
 * API Service Layer
 * ==================
 * Centralised Axios client with base URL, interceptors, and typed helpers.
 * Includes: documentsApi, chatApi (streaming), systemApi
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { Document } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Axios Instance ────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor ───────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ── Response Interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

// ── Typed Fetch Helpers ───────────────────────────────────────────────────────

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(url, body);
  return data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.put<T>(url, body);
  return data;
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<T>(url);
  return data;
}

// ── System API ────────────────────────────────────────────────────────────────

export const systemApi = {
  getHealth: () => get('/health'),
  getVersion: () => get('/version'),
  getWelcome: () => get('/'),
};

// ── Documents API ─────────────────────────────────────────────────────────────

export interface DocChunk {
  id: string;
  text: string;
  chunk_index: number;
  page?: number | null;
  timestamp?: string | null;
  type?: string;
  filename?: string;
}

export const documentsApi = {
  /** List all documents ordered by upload date desc */
  list: (): Promise<{ items: Document[] }> =>
    get('/api/v1/documents/'),

  /** Get a single document details */
  get: (id: string): Promise<Document> =>
    get(`/api/v1/documents/${id}`),

  /** Direct streaming URL for physical media/file */
  getFileUrl: (id: string): string =>
    `${BASE_URL}/api/v1/documents/${id}/file`,

  /** Fetch indexed text/transcript chunks for document from ChromaDB */
  getChunks: (id: string): Promise<{ document_id: string; filename: string; count: number; chunks: DocChunk[] }> =>
    get(`/api/v1/documents/${id}/chunks`),

  /** Upload a file. Returns basic document metadata. */
  upload: (file: File, onProgress?: (pct: number) => void): Promise<{ message: string; document: Document }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    }).then((r) => r.data);
  },

  /** Delete a document by ID (removes from DB, storage, and ChromaDB) */
  delete: (id: string): Promise<{ message: string; id: string }> =>
    del(`/api/v1/documents/${id}`),
};

// ── Stats API ─────────────────────────────────────────────────────────────────

export interface DocumentStats {
  total_documents: number;
  indexed: number;
  processing: number;
  failed: number;
  pdf_count: number;
  audio_count: number;
  video_count: number;
  total_chunks_sqlite: number;
  total_chunks_chromadb: number;
  embedding_dimensions: number;
  vector_metric: string;
}

export const statsApi = {
  get: (): Promise<DocumentStats> => get('/api/v1/documents/stats'),
};

// ── Vectors API ───────────────────────────────────────────────────────────────

export interface VectorNode {
  id: string;
  x: number;
  y: number;
  z: number;
  filename: string;
  type: string;
  chunk_idx: number;
  text: string;
}

export interface ProjectedVectors {
  nodes: VectorNode[];
  total_in_store: number;
}

export const vectorsApi = {
  getProjected: (limit = 200): Promise<ProjectedVectors> =>
    get('/api/v1/documents/vectors/projected', { limit }),
};


// ── Chat Streaming API ────────────────────────────────────────────────────────

export interface ChatStreamCallbacks {
  onMetadata?: (meta: {
    sources: Array<{ filename: string; type: string; location?: string; confidence?: number }>;
    retrieved_chunks: Array<{ chunk_id: string; filename: string; type: string; location?: string; text: string; confidence: number; similarity: number }>;
    chunks_retrieved_count: number;
    max_confidence: number;
    retrieval_ms: number;
    embedding_ms: number;
  }) => void;
  onChunk?: (text: string) => void;
  onTimings?: (timings: {
    embedding_ms: number;
    retrieval_ms: number;
    prompt_ms: number;
    ollama_ms: number;
    total_ms: number;
    chunks_retrieved: number;
  }) => void;
  onError?: (err: string) => void;
  onDone?: () => void;
}

/**
 * Streams a chat response from the backend using fetch (Axios doesn't stream easily).
 * Calls callbacks as NDJSON lines arrive.
 */
export async function streamChat(
  question: string,
  source_type: string = 'all',
  top_k: number = 5,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, source_type, top_k }),
    });
  } catch (e: any) {
    callbacks.onError?.(`Network error: ${e.message}`);
    callbacks.onDone?.();
    return;
  }

  if (!response.ok) {
    callbacks.onError?.(`HTTP ${response.status}: ${response.statusText}`);
    callbacks.onDone?.();
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.('No readable stream in response');
    callbacks.onDone?.();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.metadata) callbacks.onMetadata?.(parsed.metadata);
        else if (parsed.chunk !== undefined) callbacks.onChunk?.(parsed.chunk);
        else if (parsed.timings) callbacks.onTimings?.(parsed.timings);
        else if (parsed.error) callbacks.onError?.(parsed.error);
      } catch {
        // ignore malformed lines
      }
    }
  }

  callbacks.onDone?.();
}

export default apiClient;
