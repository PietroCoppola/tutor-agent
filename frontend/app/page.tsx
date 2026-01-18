"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import Transcript from "@/components/Transcript";
import { AgentVisualizer } from "@/components/AgentVisualizer";

// --- CONFIG ---
const HERO_TEXT = "Hi. I'm Studeo, your brand-new studying partner.";
const TYPING_INTERVAL_MS = 40;

// --- TYPES ---
type Agent = {
  id: string;
  name: string;
};

type Phase = "hero" | "dashboard" | "exam";

export default function Home() {
  // --- STATE ---
  const [phase, setPhase] = useState<Phase>("hero");
  
  // Hero State
  const [typedText, setTypedText] = useState("");
  const [isHeroDone, setIsHeroDone] = useState(false);

  // Dashboard State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Exam State
  const [token, setToken] = useState("");

  // --- 1. HERO ANIMATION ---
  useEffect(() => {
    if (phase !== "hero") return;
    
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
  }, [phase]);

  // --- 2. LOAD AGENTS ---
  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        const list = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].name,
        }));
        setAgents(list);
      });
  }, []);

  // --- 3. ACTIONS ---
  
  const handleCreateAgent = async () => {
    if (!file || !newAgentName) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", newAgentName);

    try {
      const res = await fetch("/api/create-agent", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setAgents((prev) => [...prev, { id: data.agentId, name: newAgentName }]);
        setIsCreating(false);
        setNewAgentName("");
        setFile(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const startExam = async (agentId: string) => {
    try {
      const resp = await fetch(`/api/token?agentId=${agentId}`);
      const data = await resp.json();
      setToken(data.token);
      setPhase("exam");
    } catch (e) {
      console.error(e);
    }
  };

  const resetExam = () => {
    setPhase("dashboard");
    setToken("");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a] text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="absolute left-0 top-6 w-full flex justify-center z-50 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
           {/* Logo Placeholder or Image */}
           <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-[0_0_15px_rgba(37,99,235,0.5)]">S</div>
           <span className="text-xl font-bold tracking-tight text-white/90">Studeo</span>
        </div>
      </header>

      {/* BACKGROUND ORBITS (Preserved from your original file) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-[-10rem] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(74,86,226,0.15),_transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-5rem] right-[-5rem] h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(37,194,160,0.15),_transparent_65%)] blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-col min-h-screen items-center justify-center px-6 w-full max-w-6xl mx-auto">
        
        {/* === PHASE 1: HERO === */}
        {phase === "hero" && (
          <div className="text-center space-y-12">
            <h1 className="relative text-5xl font-bold leading-tight text-white sm:text-7xl tracking-tight drop-shadow-lg h-[3ch]">
              <span>{typedText}</span>
              <span className="inline-block w-[1ch] animate-pulse text-blue-400">|</span>
            </h1>

            <div className={`transition-all duration-700 ${isHeroDone ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <button 
                onClick={() => setPhase("dashboard")}
                className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-blue-600 px-10 font-medium text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(37,99,235,0.6)]"
              >
                <span className="relative z-10 text-lg">Get Started</span>
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </div>
          </div>
        )}

        {/* === PHASE 2: DASHBOARD === */}
        {phase === "dashboard" && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex justify-between items-end mb-10 border-b border-white/10 pb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Select a Subject</h2>
                <p className="text-white/40">Choose an existing tutor or upload a new PDF.</p>
              </div>
              <button 
                onClick={() => setIsCreating(!isCreating)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors border border-white/5"
              >
                {isCreating ? "Cancel" : "+ New Subject"}
              </button>
            </div>

            {/* Create Form */}
            {isCreating && (
              <div className="mb-10 p-8 bg-white/5 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-blue-200/70">Subject Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. History 101"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-blue-200/70">Study Material (PDF)</label>
                    <input 
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateAgent}
                  disabled={isUploading || !file || !newAgentName}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Ingesting Knowledge Base...
                    </span>
                  ) : "Create Tutor Agent"}
                </button>
              </div>
            )}

            {/* Agent Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => startExam(agent.id)}
                  className="group relative h-48 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-blue-500/30 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                  </div>
                  <div className="flex flex-col justify-end h-full relative z-10">
                     <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-300 transition-colors">{agent.name}</h3>
                     <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Tap to Start Exam</p>
                  </div>
                  {/* Hover Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              
              {/* Empty State */}
              {agents.length === 0 && !isCreating && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                  <p className="text-white/40">No tutors found. Create one above to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === PHASE 3: EXAM === */}
        {phase === "exam" && token && (
          <div className="w-full h-full min-h-[600px] flex flex-col animate-in fade-in zoom-in-95 duration-500">
             
             {/* Header */}
             <div className="flex items-center justify-between mb-4 px-2">
                <button 
                  onClick={resetExam}
                  className="text-white/50 hover:text-white text-sm font-mono flex items-center gap-2 transition-colors"
                >
                  ← Back to Dashboard
                </button>
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                   <span className="text-xs font-bold uppercase tracking-widest text-red-400">Live Session</span>
                </div>
             </div>

             <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                onDisconnected={resetExam}
                className="flex flex-col h-[600px] w-full bg-gray-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
             >
                <StartAudio label="Click to Allow Audio" />
                <RoomAudioRenderer />
                
                <div className="flex flex-col md:flex-row h-full w-full">
                  {/* LEFT: AGENT */}
                  <div className="w-full md:w-1/3 border-r border-white/10 bg-black/20 p-8 flex flex-col items-center justify-center gap-8 relative group">
                      <div className="absolute inset-0 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
                      <div className="relative z-10 w-full flex flex-col items-center gap-8">
                         <div className="scale-125">
                            <AgentVisualizer />
                         </div>
                         <div className="w-full flex justify-center">
                            <ControlBar 
                              controls={{ microphone: true, camera: false, screenShare: false, leave: true }} 
                              variation="minimal"
                            />
                         </div>
                      </div>
                  </div>

                  {/* RIGHT: TRANSCRIPT */}
                  <div className="w-full md:w-2/3 bg-black/40 h-full relative">
                      <Transcript />
                  </div>
                </div>
             </LiveKitRoom>
          </div>
        )}

      </main>
    </div>
  );
}