"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  BarVisualizer,
  ControlBar,
  useConnectionState,
  useTracks,
  useDataChannel,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState } from "livekit-client";

import Transcript from "@/components/Transcript"; 

const HERO_TEXT = "Hi. I'm Studeo, your brand-new studying partner.";
const QUESTION_TEXT = "Thank you for the file. I'm ready to quiz you.";
const TYPING_INTERVAL_MS = 40;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI Animation State
  const [typedText, setTypedText] = useState("");
  const [isHeroDone, setIsHeroDone] = useState(false);
  const [phase, setPhase] = useState<"intro" | "transitioning" | "question">("intro");
  const [questionText, setQuestionText] = useState("");

  // LiveKit State
  const [token, setToken] = useState("");

  // --- ANIMATION EFFECTS ---
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setTypedText(HERO_TEXT.slice(0, index));
      if (index >= HERO_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setIsHeroDone(true), 150);
      }
    }, TYPING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase !== "transitioning") return;
    const timeout = setTimeout(() => setPhase("question"), 500);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "question") return;
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setQuestionText(QUESTION_TEXT.slice(0, index));
      if (index >= QUESTION_TEXT.length) clearInterval(interval);
    }, TYPING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase]);

  // --- HANDLERS ---
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // 1. Upload Success! Now get a LiveKit Token.
      // We use "default" as the agentId for now, but you could 
      // pass a unique ID returned from the upload if you wanted.
      const tokenResp = await fetch("/api/token?agentId=default");
      const tokenData = await tokenResp.json();
      setToken(tokenData.token);

      // 2. Move to the Exam Phase
      setPhase("transitioning");

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetExam = () => {
    setPhase("intro");
    setToken("");
    setFile(null);
    setIsHeroDone(true); // Keep the hero text visible so it doesn't re-type
    setQuestionText(""); // Clear the old question text
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="absolute left-0 -top-6 flex items-center gap-3 z-50">
        <Image src="/logo.png" alt="Studeo logo" width={240} height={80} className="h-auto w-auto" priority />
      </header>

      {/* BACKGROUND ORBITS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="studeo-orbit absolute -left-20 top-[-10rem] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(74,86,226,0.25),_transparent_65%)] blur-3xl" />
        <div className="studeo-orbit absolute bottom-[-5rem] right-[-5rem] h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(37,194,160,0.2),_transparent_65%)] blur-3xl" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-3xl px-4 sm:px-0">
          
          {/* PHASE 1: UPLOAD (Intro) */}
          {phase !== "question" && (
            <div className={`transition-all duration-500 ease-out ${phase === "transitioning" ? "animate-studeo-evaporate pointer-events-none" : ""}`}>
              <div className="mb-16 space-y-6 text-center sm:text-left">
                <h1 className="relative text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl tracking-tight drop-shadow-sm">
                  <span className="opacity-0">{HERO_TEXT}</span>
                  <span className="absolute left-0 top-0">
                    <span>{typedText}</span>
                    <span className="inline-block w-[1ch] animate-studeo-caret align-baseline">|</span>
                  </span>
                </h1>
              </div>

              <div className={`space-y-8 max-w-xl transition-all duration-500 ease-out ${isHeroDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                <div className="space-y-4">
                  <label htmlFor="pdf" className="block text-sm font-bold uppercase tracking-[0.2em] text-blue-200">Study material (PDF)</label>
                  <input id="pdf" type="file" accept="application/pdf" onChange={handleFileChange} className="block w-full cursor-pointer rounded-3xl border-2 border-dashed border-white/40 bg-background/20 px-8 py-10 text-base text-white hover:border-primary hover:bg-background/40 transition-all" />
                </div>
                <button type="button" onClick={handleUpload} disabled={!file || isLoading} className="relative mt-2 inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_0_50px_rgba(99,102,241,0.7)] hover:shadow-[0_0_80px_rgba(99,102,241,0.95)] transition-all">
                  {isLoading && <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-secondary border-t-transparent animate-spin" />}
                  <span>{isLoading ? "Ingesting..." : "Upload & Begin"}</span>
                </button>
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
            </div>
          )}

          {/* PHASE 2: EXAM (LiveKit Room) */}
          {phase === "question" && token && (
            <div className="w-full max-w-3xl flex flex-col gap-8 transition-opacity duration-500 animate-in fade-in">
              
              {/* 1. STATUS HEADER (Replaces the static "Thank you" text) */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-mono uppercase tracking-widest text-red-200/80">
                    Live Exam
                  </span>
                </div>
                <div className="text-xs text-white/40 font-mono">
                  Connected to Studeo
                </div>
              </div>

              {/* 2. LIVEKIT ROOM */}
              <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                onDisconnected={resetExam} // <--- FIX 1: RESET STATE ON LEAVE
                className="flex flex-col items-center justify-center w-full bg-background/5 backdrop-blur-sm rounded-3xl border border-white/10 p-2 shadow-2xl overflow-hidden"
              >
                <StartAudio label="Click to allow audio" />
                <RoomAudioRenderer />
                
                {/* 3. VISUALIZER & CONTROLS */}
                <div className="relative w-full h-[400px] flex flex-col">
                  
                  {/* REPLACE THE OLD PLACEHOLDER DIV WITH THIS: */}
                  <Transcript /> 

                  {/* BOTTOM CONTROLS AREA */}
                  <div className="p-6 bg-black/20 backdrop-blur-md border-t border-white/5 flex flex-col items-center gap-6">
                      
                      {/* The Visualizer will now be centered because of 'items-center' above */}
                      <AgentVisualizer />
                      
                      <div className="flex justify-center w-full">
                        <ControlBar 
                          controls={{ microphone: true, camera: false, screenShare: false, leave: true }} 
                          variation="minimal"
                        />
                      </div>
                  </div>
                </div>
              </LiveKitRoom>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AgentVisualizer() {
  const connectionState = useConnectionState();
  const tracks = useTracks([Track.Source.Microphone]);
  const agentTrack = tracks.find((t) => t.participant.identity !== "me" && !t.participant.isLocal);
  
  // State for the visualizer (default to 'listening')
  const [agentState, setAgentState] = useState<"speaking" | "listening" | "thinking">("listening");
  const decoder = new TextDecoder();

  // Listen for state updates from Python
  useDataChannel((payload) => {
    if (payload.topic === "state") {
      const stateStr = decoder.decode(payload.payload).toLowerCase();
      // Map raw strings to valid Visualizer states
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
    <div className="h-32 w-full max-w-sm bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-colors duration-500">
      {/* Optional: Add a text label for the state */}
      <div className="absolute -top-6 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
        {agentState === "speaking" ? "Speaking" : agentState === "thinking" ? "Thinking" : "Listening"}
      </div>

      <BarVisualizer
        trackRef={agentTrack} 
        state={agentState} // <--- NOW DYNAMIC
        barCount={7}
        className="h-16 gap-2"
        style={{ height: "60px" }}
        // Optional: Change color based on state
        options={{ minHeight: 5 }} 
      />
    </div>
  );
}