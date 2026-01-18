"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  ControlBar,
  useDataChannel
} from "@livekit/components-react";
import "@livekit/components-styles";
import Transcript from "@/components/Transcript";
import { AgentVisualizer } from "@/components/AgentVisualizer";

type Agent = {
  id: string;
  name: string;
};

export default function Home() {
  const [phase, setPhase] = useState<"dashboard" | "exam">("dashboard");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("default");
  
  // Create New Agent State
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Exam State
  const [token, setToken] = useState("");

  // 1. Load Agents on Mount
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

  // 2. Handle Creating New Agent
  const handleCreateAgent = async () => {
    if (!file || !newAgentName) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", newAgentName);

    try {
      const res = await fetch("/api/create-agent", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        // Refresh list
        setAgents((prev) => [...prev, { id: data.agentId, name: newAgentName }]);
        setIsCreating(false);
        setNewAgentName("");
        setFile(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Start Exam
  const startExam = async (agentId: string) => {
    try {
      // Get Token with Unique Room Name
      const resp = await fetch(`/api/token?agentId=${agentId}`);
      const data = await resp.json();
      setToken(data.token);
      setSelectedAgentId(agentId);
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
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">S</div>
          <span className="text-xl font-bold tracking-tight">Studeo</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {/* DASHBOARD PHASE */}
        {phase === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">Select your Tutor</h1>
                <p className="text-white/40">Choose a subject to begin your oral exam.</p>
              </div>
              <button 
                onClick={() => setIsCreating(!isCreating)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                {isCreating ? "Cancel" : "+ New Subject"}
              </button>
            </div>

            {/* CREATE FORM */}
            {isCreating && (
              <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <input 
                  type="text" 
                  placeholder="Subject Name (e.g., Intro to Biology)"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
                <input 
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                />
                <button
                  onClick={handleCreateAgent}
                  disabled={isLoading || !file || !newAgentName}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing PDF..." : "Create Tutor"}
                </button>
              </div>
            )}

            {/* AGENT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => startExam(agent.id)}
                  className="group relative h-40 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/30"
                >
                  <div className="absolute top-6 right-6 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <h3 className="text-xl font-bold mb-2 group-hover:text-blue-200 transition-colors">{agent.name}</h3>
                  <p className="text-xs text-white/30 uppercase tracking-widest">Ready to Proctor</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EXAM PHASE */}
        {phase === "exam" && token && (
          <div className="w-full h-full min-h-[500px] flex flex-col gap-4">

             <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                // Removed data-lk-theme="default" to prevent style conflicts
                onDisconnected={resetExam}
                className="flex flex-col h-[600px] w-full bg-gray-900/50 border border-white/10 rounded-3xl overflow-hidden"
             >
                <StartAudio label="Click to Allow Audio" />
                <RoomAudioRenderer />
                
                {/* SPLIT VIEW LAYOUT */}
                <div className="flex flex-col md:flex-row h-full w-full">
                  
                  {/* LEFT: AGENT */}
                  <div className="w-full md:w-1/3 border-r border-white/10 bg-black/20 p-6 flex flex-col items-center justify-center gap-6">
                      <div className="relative">
                        <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full" />
                        <AgentVisualizer />
                      </div>
                      <div className="z-10">
                        <ControlBar 
                          controls={{ microphone: true, camera: false, screenShare: false, leave: true }} 
                          variation="minimal"
                        />
                      </div>
                  </div>

                  {/* RIGHT: TRANSCRIPT */}
                  <div className="w-full md:w-2/3 bg-black/40 h-full">
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