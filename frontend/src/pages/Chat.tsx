/**
 * AI Chat Page
 * =============
 * ChatGPT-like interface: message list, input bar, typing indicator,
 * and dynamic source panel.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  UploadCloud,
  Bot,
  User,
  Sparkles,
  PanelRight,
  FileText,
} from 'lucide-react';
import { generateId } from '@/utils';
import type { Message } from '@/types';
import { post } from '@/services/api';

function ChatMessage({
  message,
  isSelected,
  onClick,
}: {
  message: Message;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#22d3ee)', marginTop: 2 }}
        >
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        onClick={onClick}
        className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm cursor-pointer transition-all ${
          !isUser && isSelected ? 'ring-1 ring-blue-500 bg-white/[0.06]' : ''
        }`}
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(34,211,238,0.15))',
                border: '1px solid rgba(59,130,246,0.35)',
                color: '#e2e8f0',
              }
            : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#cbd5e1',
              }
        }
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        
        {/* Render status */}
        {!isUser && message.status && (
          <p className="text-xs mt-2 font-medium text-blue-400 animate-pulse">{message.status}</p>
        )}
        
        {/* Render inline sources if assistant */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sources:</p>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src: any, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-white/5 border border-white/10 text-slate-300"
                >
                  <FileText size={10} className="text-blue-400 shrink-0" />
                  <span className="max-w-[150px] truncate">{src.document}</span>
                  {src.page && <span className="text-slate-500 font-medium">p. {src.page}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-1.5">
          {!isUser && message.timings && (
            <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>
              {message.timings.total_ms / 1000}s response
            </span>
          )}
          <p className="text-xs text-right" style={{ color: 'rgba(148,163,184,0.4)' }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {isUser && (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', marginTop: 2 }}
        >
          <User size={14} className="text-slate-300" />
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your offline AI assistant. Upload documents to your Knowledge Base first, then ask me anything about them. I'll provide answers with source references.",
  timestamp: new Date().toISOString(),
  sources: [],
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    
    const assistantMsgId = generateId();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'Searching knowledge base...',
    };
    
    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInput('');
    setIsTyping(true);
    setSelectedMessageId(assistantMsgId);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const response = await fetch(`${BASE_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let answerText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n').filter((l) => l.trim() !== '');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.chunk !== undefined) {
              answerText += data.chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: answerText, status: 'Streaming answer...' }
                    : m
                )
              );
            }
            
            if (data.sources) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, sources: data.sources, timings: data.timings, status: undefined }
                    : m
                )
              );
              if (data.sources.length > 0) {
                setIsSourceOpen(true);
              }
            }
          } catch (e) {
            console.error('Failed to parse stream line:', line, e);
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Error: ${err.message || 'Could not reach the AI model.'}`, status: undefined }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine active sources to display in the sidebar
  const activeMsgId = selectedMessageId || messages[messages.length - 1]?.id;
  const activeMsg = messages.find((m) => m.id === activeMsgId);
  const activeSources = activeMsg && activeMsg.role === 'assistant' ? activeMsg.sources || [] : [];

  return (
    <div className="flex h-full gap-4 max-w-7xl mx-auto">
      {/* Chat panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col flex-1 glass-card overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Chat header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">AI Chat</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}
            >
              llama3.2:3b
            </span>
          </div>
          <button
            onClick={() => setIsSourceOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <PanelRight size={13} />
            Sources
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ minHeight: 0 }}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSelected={msg.id === activeMsgId}
                onClick={() => msg.role === 'assistant' && setSelectedMessageId(msg.id)}
              />
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start animate-pulse"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#22d3ee)' }}
              >
                <Bot size={16} className="text-white" />
              </div>
              <div
                className="rounded-2xl px-4 py-3 text-sm flex items-center gap-1.5 bg-white/5 border border-white/10"
                style={{ color: '#cbd5e1' }}
              >
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex items-end gap-3 p-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Text area */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none resize-none leading-relaxed"
              style={{ maxHeight: 120, overflowY: 'auto' }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-all shrink-0"
              style={{
                background: input.trim() && !isTyping
                  ? 'linear-gradient(135deg, #3b82f6, #22d3ee)'
                  : 'rgba(255,255,255,0.05)',
                boxShadow: input.trim() && !isTyping ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
              }}
            >
              <Send size={15} className={input.trim() && !isTyping ? 'text-white' : 'text-slate-600'} />
            </button>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'rgba(148,163,184,0.35)' }}>
            <Sparkles size={10} className="inline mr-1" />
            AI responses are generated locally — fully offline
          </p>
        </div>
      </motion.div>

      {/* Source panel */}
      <AnimatePresence>
        {isSourceOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 280 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            className="glass-card overflow-hidden shrink-0 flex flex-col"
            style={{ minHeight: 0 }}
          >
            <div
              className="px-4 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h3 className="text-sm font-semibold text-white">Source References</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>
                Relevant chunks from your documents
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 h-48">
                  <MessageSquare size={28} style={{ color: 'rgba(148,163,184,0.15)' }} />
                  <p className="text-xs mt-3 text-center" style={{ color: 'rgba(148,163,184,0.4)' }}>
                    No sources referenced for this response
                  </p>
                </div>
              ) : (
                activeSources.map((src: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-start gap-1.5 text-xs text-blue-400 font-medium">
                      <FileText size={14} className="shrink-0 mt-0.5" />
                      <span className="break-all">{src.document}</span>
                    </div>
                    {src.page && (
                      <div className="text-[10px] text-slate-500">
                        Page: <span className="text-slate-300 font-semibold">{src.page}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
