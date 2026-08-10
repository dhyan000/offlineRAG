import type { LucideIcon } from 'lucide-react';

export type ServiceStatus = 'operational' | 'degraded' | 'not_configured' | 'error';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  version: string;
  environment: string;
  timestamp: string;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    vector_store: ServiceStatus;
    llm: ServiceStatus;
  };
}

export interface VersionInfo {
  app_name: string;
  version: string;
  description: string;
  environment: string;
  python_version: string;
  framework: string;
  build_date: string;
}

export type DocumentStatus = 'uploaded' | 'queued' | 'processing' | 'transcribing' | 'embedding' | 'indexed' | 'failed';
export type DocumentType = 'pdf' | 'audio' | 'video' | 'txt' | 'doc' | 'docx' | 'xlsx' | 'csv' | 'png' | 'jpg' | 'mp3' | 'wav' | 'm4a' | 'flac' | 'mp4' | 'mov' | 'mkv' | 'unknown';
export type SourceFilterType = 'all' | 'pdf' | 'audio' | 'video';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size_bytes: number;
  status: DocumentStatus;
  uploaded_at: string;
  indexed_at?: string;
  duration?: string;
  file_hash?: string;
  chunk_count?: number;
  error_message?: string;
}

export interface ChatSource {
  filename: string;
  type: string;
  location?: string;
  confidence?: number;
}

export interface RetrievedChunk {
  chunk_id: string;
  filename: string;
  type: string;
  location?: string;
  text: string;
  confidence: number;
  similarity: number;
}

export interface RetrievalMetrics {
  embedding_ms: number;
  retrieval_ms: number;
  prompt_ms?: number;
  ollama_ms?: number;
  total_ms: number;
  chunks_retrieved: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: ChatSource[];
  retrieved_chunks?: RetrievedChunk[];
  max_confidence?: number;
  timings?: RetrievalMetrics;
  is_streaming?: boolean;
  status?: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  function: string;
  line: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}
