import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageCircle, Send, ShieldCheck, X } from 'lucide-react';
import { askSpdAssistant, SPD_ASSISTANT_FALLBACK } from '../../services/spd-assistant.service';
import { useAuthStore } from '../../stores/auth.store';
import { roleLabels } from '../../types/roles';
import { cn } from '../../utils/cn';
import { useSpdAssistantContext } from './SpdAssistantProvider';
import { reportClientError } from '../../utils/errorHandling';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function createMessageId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${performance.now()}`;
}

const greeting = 'สวัสดีค่ะ ฉันคือ DSP Assistant สามารถตอบคำถามจากฐานความรู้ของระบบเท่านั้น';

function getInitialMessages(): ChatMessage[] {
  return [
    {
      id: 'greeting',
      role: 'assistant',
      content: greeting,
    },
  ];
}

export function SpdAssistantWidget() {
  const { user } = useAuthStore();
  const { route, pageNameTh, moduleNameTh, userRole, isContextLoading } = useSpdAssistantContext();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [isAsking, setIsAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
    }
  }, [user]);

  useEffect(() => {
    setQuestion('');
    setConversationId(null);
    setMessages(getInitialMessages());
  }, [route, user?.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking || !userRole) {
      return;
    }

    setQuestion('');
    setIsAsking(true);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        content: trimmedQuestion,
      },
    ]);

    try {
      const response = await askSpdAssistant({
        question: trimmedQuestion,
        route,
        pageNameTh,
        moduleNameTh,
        userRole,
        userId: user?.id ?? null,
        conversationId,
      });

      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: response.answer,
        },
      ]);
    } catch (error) {
      void reportClientError('DSP Assistant failed:', error);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: SPD_ASSISTANT_FALLBACK,
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <section
          className="w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
          aria-label="DSP Assistant"
        >
          <header className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  DSP Assistant
                </div>
                <div className="mt-1 truncate text-xs text-slate-300">
                  {pageNameTh} · {moduleNameTh}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="ปิด DSP Assistant"
                title="ปิด"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              ตอบจากฐานความรู้ภายในเท่านั้น
            </div>
            <div className="mt-1 truncate">
              Route: {route} · Role: {userRole ? roleLabels[userRole] : 'กำลังโหลดสิทธิ์'}
            </div>
            {isContextLoading ? <div className="mt-1">กำลังโหลดบริบทหน้านี้</div> : null}
          </div>

          <div className="max-h-[420px] min-h-72 space-y-3 overflow-y-auto bg-white p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6',
                    message.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-800',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isAsking ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  กำลังค้นฐานความรู้
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="ถามเกี่ยวกับหน้านี้หรือการใช้งานระบบ"
                disabled={!userRole || isAsking}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={isAsking || !question.trim() || !userRole}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="ส่งคำถาม"
                title="ส่งคำถาม"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800"
        aria-label={isOpen ? 'ย่อ DSP Assistant' : 'เปิด DSP Assistant'}
        title={isOpen ? 'ย่อ DSP Assistant' : 'เปิด DSP Assistant'}
      >
        {isOpen ? <ChevronDown className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
      </button>
    </div>
  );
}
