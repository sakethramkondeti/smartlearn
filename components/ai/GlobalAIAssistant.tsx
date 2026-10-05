"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Flame,
} from "lucide-react";
import { mockUserProfile, mockCourses } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const GlobalAIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      sender: "ai",
      text: "Hello. I am your Cognix AI Assistant.\n\nAsk any question regarding concepts, formulas, code, derivations, or course schedules.",
      timestamp: "Just now",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "What should I study today?",
    "Explain my current course topic simply",
    "Help me prepare for my next quiz check",
    "How can I improve my mastery score?",
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: "Now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsTyping(true);

    const userContext = `Learner: ${mockUserProfile.name}
Role: Active Student on Cognix Platform
Goal: Systematic topic mastery, algorithmic derivations, and technical skill development.`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          userContext,
        }),
      });

      const data = await res.json();
      const aiReply =
        data.response ||
        data.error ||
        "I was unable to generate a response. Please check your connection.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReply,
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "Connection failed. Please check your network or API key in .env.local.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button in bottom-right corner (Sharp, Professional) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Assistant"
          className="p-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer border border-zinc-700"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </button>
      </div>

      {/* Slide-Over AI Chat Drawer (Sharp, Professional) */}
      {isOpen && (
        <div className="fixed bottom-16 right-5 z-40 w-[92vw] sm:w-[380px] h-[500px] max-h-[80vh] bg-white border border-zinc-300 rounded-md shadow-xl flex flex-col overflow-hidden animate-in fade-in duration-100">
          {/* Header */}
          <div className="p-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-xs bg-zinc-900 text-white flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-900">
                  Cognix AI Assistant
                </h3>
                <p className="text-[10px] font-mono text-zinc-500">
                  Curriculum & Concept Tutor
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Context Strip */}
          <div className="px-3 py-1 bg-zinc-100/80 border-b border-zinc-200 text-[10px] font-mono text-zinc-600 flex items-center justify-between">
            <span>Adaptive AI Learning Tutor</span>
            <span>Online</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[88%]",
                  m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "p-2.5 rounded-sm leading-relaxed whitespace-pre-wrap",
                    m.sender === "user"
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-900 border border-zinc-200"
                  )}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-zinc-400 mt-1 px-0.5 font-mono">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 p-2 rounded-sm bg-zinc-100 text-zinc-500 border border-zinc-200 text-[11px] w-24">
                <Loader2 className="w-3 h-3 animate-spin text-zinc-700" />
                <span className="font-mono">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Doubt Pills */}
          <div className="p-2 border-t border-zinc-200 bg-zinc-50 overflow-x-auto flex gap-1.5 no-scrollbar">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="px-2 py-0.5 rounded-xs bg-white border border-zinc-200 text-[11px] text-zinc-600 hover:text-zinc-950 hover:border-zinc-400 whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 border-t border-zinc-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about formulas, logic, doubts..."
              className="flex-1 px-3 py-1.5 text-xs rounded-sm bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="p-1.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
