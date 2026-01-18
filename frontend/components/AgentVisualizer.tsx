"use client";

import {
  BarVisualizer,
  useConnectionState,
  useDataChannel,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useState } from "react";

export function AgentVisualizer() {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Microphone]);
  const agentTrack = tracks.find(
    (t) => t.participant.identity !== "me" && !t.participant.isLocal
  );

  // State for the visualizer
  const [agentState, setAgentState] = useState<"speaking" | "listening" | "thinking">("listening");
  const decoder = new TextDecoder();

  // Listen for state updates from Python
  useDataChannel((payload) => {
    if (payload.topic === "state") {
      const stateStr = decoder.decode(payload.payload).toLowerCase();
      if (stateStr.includes("speaking")) setAgentState("speaking");
      else if (stateStr.includes("thinking")) setAgentState("thinking");
      else setAgentState("listening");
    }
  });

  if (connectionState !== ConnectionState.Connected) {
    return (
      <div className="h-32 w-full max-w-sm bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
        <div className="flex gap-2 items-center text-blue-200/50 text-sm font-mono animate-pulse">
          <span className="h-2 w-2 rounded-full bg-blue-400"></span>
          CONNECTING...
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-32 w-full max-w-sm bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-colors duration-500">
      {/* State Label */}
      <div className="absolute -top-6 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold transition-all duration-300">
        {agentState === "speaking" ? (
          <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">Speaking</span>
        ) : agentState === "thinking" ? (
          <span className="text-purple-400 animate-pulse">Thinking</span>
        ) : (
          "Listening"
        )}
      </div>

      <BarVisualizer
        trackRef={agentTrack}
        state={agentState}
        barCount={7}
        className="h-16 gap-2"
        style={{ height: "60px" }}
        options={{ minHeight: 5 }}
      />
    </div>
  );
}