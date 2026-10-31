import React, { useState, useRef, useEffect } from 'react';
import { useRetailData } from '../../context/RetailDataContext';
import { SUGGESTED_COMMANDS, QUERY_EXAMPLES } from '../../data/constants';
import { api } from '../../api';
import { ChatMessage as ChatMessageType } from '../../types/retail';
import {
  Trash2,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { VoiceChatComposer } from './VoiceChatComposer';

const INITIAL_GREETING_MESSAGE: ChatMessageType = {
  id: 'msg-init',
  sender: 'assistant',
  text: 'Vanakkam! 👋 I am your Kirana shop assistant. Ask me anything about stock, prices, today\'s sales, or credit balances in Tamil or English.\n\n(வணக்கம்! உங்கள் கடையின் சரக்கு இருப்பு, இன்றைய விற்பனை, கடன் பாக்கிகளை என்னிடம் கேட்கலாம்!)',
  timestamp: new Date().toISOString(),
};

export const AIAssistantView: React.FC = () => {
  const {
    refresh,
    setActivePage,
    setInventoryFilterStatus,
    openAddProductModal,
  } = useRetailData();

  const [messages, setMessages] = useState<ChatMessageType[]>([INITIAL_GREETING_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    const query = text.trim();
    if (!query || isTyping) return;

    const history = messages
      .filter((m) => m.id !== 'msg-init')
      .slice(-6)
      .map((m) => ({ sender: m.sender, text: m.text }));

    const userMsg: ChatMessageType = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let assistantMsg: ChatMessageType;
    try {
      // The backend runs Gemini (with a rule-based fallback) against the live database.
      const reply = await api.chat(query, history);
      assistantMsg = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: reply.text,
        timestamp: new Date().toISOString(),
        quickAction: reply.quickAction ?? undefined,
        dataPayload: reply.dataPayload ?? undefined,
        source: reply.source,
        fallbackReason: reply.fallbackReason ?? undefined,
      };
      refresh(); // keep the other pages in sync with anything the assistant touched
    } catch (err) {
      assistantMsg = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
    }
    setMessages((prev) => [...prev, assistantMsg]);
    setIsTyping(false);
  };

  const handleQuickAction = (action?: ChatMessageType['quickAction']) => {
    if (!action) return;
    if (action.actionType === 'navigate_inventory') {
      setActivePage('inventory');
    } else if (action.actionType === 'filter_low_stock') {
      setInventoryFilterStatus('low_stock');
      setActivePage('inventory');
    } else if (action.actionType === 'navigate_sales') {
      setActivePage('sales');
    } else if (action.actionType === 'open_add_product') {
      openAddProductModal();
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING_MESSAGE]);
  };

  return (
    <div className="relative flex flex-col h-full space-y-4 isolate">
      {/* Subtle backdrop scrim to preserve chat readability over the MoltenMetal background */}
      <div className="absolute inset-0 -z-10 rounded-2xl overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 bg-[#F7F5F5]/40 backdrop-blur-[2px] rounded-2xl" />
      </div>

      {/* Top Welcome / Header Banner */}
      <div className="relative bg-[#10121C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Foreground Content */}
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-500/40 shadow-[0_0_15px_rgba(249,115,22,0.3)] bg-black/40">
            <img
              src="/src/assets/images/kirana_mascot_1792956010875.jpg"
              alt="Kirana Assistant Mascot"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Vanakkam! 👋
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-gradient-to-r from-[#9333EA]/30 to-[#F97316]/30 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-xs">
                <Sparkles className="w-3 h-3 text-[#FBBF24]" />
                Store Assistant
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-medium text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/10">
                <Flame className="w-2.5 h-2.5 text-amber-400" />
                Molten Ambient
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Your AI assistant for everyday shop work · <span className="text-amber-400 font-semibold">Tamil & English enabled</span>
            </p>
          </div>
        </div>

        {/* Clear Chat Action */}
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10 bg-white/[0.04] backdrop-blur-xs shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggested Commands Grid */}
      <div className="bg-[#10121C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Suggested Shop Commands
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any command to run
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {SUGGESTED_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => handleSendMessage(cmd.prompt)}
              className="group p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-500/40 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
            >
              <div>
                <p className="text-xs font-bold text-white group-hover:text-amber-300 leading-tight">
                  {cmd.label}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {cmd.tamil}
                </p>
              </div>
              <div className="mt-2.5 flex items-center justify-end">
                <span className="p-1 rounded-md bg-white/[0.06] text-amber-400 group-hover:bg-gradient-to-r group-hover:from-[#9333EA] group-hover:to-[#F97316] group-hover:text-white transition-all">
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-[#10121C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 overflow-y-auto flex flex-col space-y-4 min-h-[280px] shadow-xl">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-[85%] sm:max-w-[75%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs border ${
                  isUser
                    ? 'bg-gradient-to-br from-[#9333EA] to-[#F97316] text-white border-white/20'
                    : 'bg-black/50 text-white border-amber-500/40'
                }`}
              >
                {isUser ? (
                  <User className="w-4 h-4" />
                ) : (
                  <img
                    src="/src/assets/images/kirana_mascot_1792956010875.jpg"
                    alt="Mascot"
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col space-y-1.5">
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm whitespace-pre-line leading-relaxed shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white rounded-tr-xs shadow-[0_0_15px_rgba(249,115,22,0.3)] font-medium'
                      : 'bg-white/[0.06] backdrop-blur-md text-slate-100 border border-white/10 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Optional Quick Action Button */}
                {msg.quickAction && (
                  <div>
                    <button
                      onClick={() => handleQuickAction(msg.quickAction)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white transition-all shadow-[0_0_12px_rgba(249,115,22,0.3)] cursor-pointer border border-white/20"
                    >
                      <span>{msg.quickAction.label}</span>
                      <ArrowRight className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-amber-500/40 bg-black/40">
              <img
                src="/src/assets/images/kirana_mascot_1792956010875.jpg"
                alt="Typing"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 rounded-tl-xs flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#9333EA] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Chat 8 Voice Composer with Live Transcript */}
      <VoiceChatComposer
        onSendMessage={handleSendMessage}
        isGenerating={isTyping}
        queryExamples={QUERY_EXAMPLES}
      />
    </div>
  );
};
