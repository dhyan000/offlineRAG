/**
 * Global TypeScript Interfaces
 * ============================
 * Shared types used across the entire frontend application.
 */

import type { LucideIcon } from 'lucide-react';

// ── System ────────────────────────────────────────────────────────────────────

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

// ── Documents (Knowledge Base) ────────────────────────────────────────────────

export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'xlsx' | 'csv' | 'png' | 'jpg' | 'mp3' | 'mp4' | 'unknown';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size_bytes: number;
  status: DocumentStatus;
  uploaded_at: string;
  indexed_at?: string;
  chunk_count?: number;
  error_message?: string;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Source {
  document_id: string;
  document_name: string;
  chunk_index: number;
  relevance_score: number;
  excerpt: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  sources?: any[];
  is_streaming?: boolean;
  status?: string;
  timings?: any;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total_documents: number;
  total_chunks: number;
  total_queries: number;
  storage_used_bytes: number;
  active_model: string;
}

// ── Logs ──────────────────────────────────────────────────────────────────────

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

// ── Settings ──────────────────────────────────────────────────────────────────

export interface LLMSettings {
  model: string;
  temperature: number;
  max_tokens: number;
  ollama_url: string;
}

export interface EmbeddingSettings {
  model: string;
  chunk_size: number;
  chunk_overlap: number;
}

export interface DatabaseSettings {
  chroma_persist_dir: string;
  sqlite_path: string;
}

export interface AppSettings {
  llm: LLMSettings;
  embedding: EmbeddingSettings;
  database: DatabaseSettings;
  theme: 'dark' | 'light';
  language: string;
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Navigation ────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
