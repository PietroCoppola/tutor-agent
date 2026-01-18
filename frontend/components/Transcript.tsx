"use client";

import { useDataChannel } from "@livekit/components-react";
import { useEffect, useState, useRef } from "react";

type Message = {
  sender: "agent" | "user";
  text: string;
  timestamp: number;
};

export default function Transcript() {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const decoder = new TextDecoder();

  useDataChannel((payload) => {
    const text = decoder.decode(payload.payload);
    if (payload.topic === "chat") {
      setMessages((prev) => [...prev, { sender: "agent", text, timestamp: Date.now() }]);
    }
    if (payload.topic === "chat_user") {
      setMessages((prev) => [...prev, { sender: "user", text, timestamp: Date.now() }]);
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    // 1. Force h-full and w-full here to fill the parent container
    <div className="h-full w-full flex flex-col bg-black/20 rounded-none md:rounded-r-2xl border-l border-white/5 overflow-hidden">
      
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-white/5 text-xs font-mono uppercase tracking-widest text-white/50 flex-none">
        Exam Transcript
      </div>

      {/* Message Log - flex-1 ensures this takes up all remaining space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/20 text-center italic text-sm">
            <div className="mb-2">Waiting for conversation...</div>
            <div className="text-xs">Say &quot;Hello&quot; to begin.</div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] uppercase tracking-widest text-white/30 mb-1 ml-1">
              {msg.sender === "agent" ? "Studeo" : "You"}
            </span>
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-blue-500/20 text-blue-100 rounded-tr-sm"
                  : "bg-white/10 text-gray-200 rounded-tl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}