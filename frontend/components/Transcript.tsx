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

  // 1. Listen for data packets from Python
  useDataChannel((payload) => {
    const text = decoder.decode(payload.payload);
    const topic = payload.topic;

    if (topic === "chat") {
      setMessages((prev) => [...prev, { sender: "agent", text, timestamp: Date.now() }]);
    }
    if (topic === "chat_user") {
      setMessages((prev) => [...prev, { sender: "user", text, timestamp: Date.now() }]);
    }
  });

  // 2. Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2">
      {messages.length === 0 && (
        <div className="text-white/30 text-center italic mt-10 text-sm font-mono">
          Waiting for conversation to start...
        </div>
      )}
      
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex flex-col max-w-[85%] ${
            msg.sender === "user" ? "self-end items-end" : "self-start items-start"
          }`}
        >
          <span className="text-[10px] uppercase tracking-widest text-white/30 mb-1 ml-1">
            {msg.sender === "agent" ? "Studeo" : "You"}
          </span>
          <div
            className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.sender === "user"
                ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-none"
                : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}