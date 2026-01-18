"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

const HERO_TEXT = "Hi. I'm Studeo, your brand-new studying partner.";
const QUESTION_TEXT = "Thank you for the file. Can you explain this subject to me?";
const TYPING_INTERVAL_MS = 40;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [isHeroDone, setIsHeroDone] = useState(false);
  const [phase, setPhase] = useState<"intro" | "transitioning" | "question">("intro");
  const [questionText, setQuestionText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setTypedText(HERO_TEXT.slice(0, index));
      if (index >= HERO_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsHeroDone(true);
        }, 150);
      }
    }, TYPING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase !== "transitioning") {
      return;
    }
    const timeout = setTimeout(() => {
      setPhase("question");
    }, 500);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "question") {
      return;
    }
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setQuestionText(QUESTION_TEXT.slice(0, index));
      if (index >= QUESTION_TEXT.length) {
        clearInterval(interval);
      }
    }, TYPING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setError(null);
  };

  const prepareFormData = () => {
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    return formData;
  };

  const handleUpload = async () => {
    if (!file || isLoading) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const formData = prepareFormData();
      
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      await response.json();
      setPhase("transitioning");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        void blob;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not access microphone.";
      setError(message);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="absolute left-0 -top-6 flex items-center gap-3 z-50">
        <Image
          src="/logo.png"
          alt="Studeo logo"
          width={240}
          height={80}
          className="h-auto w-auto"
          priority
        />
      </header>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="studeo-orbit absolute -left-20 top-[-10rem] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(74,86,226,0.25),_transparent_65%)] blur-3xl" />
        <div className="studeo-orbit absolute bottom-[-5rem] right-[-5rem] h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(37,194,160,0.2),_transparent_65%)] blur-3xl" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-3xl px-4 sm:px-0">
          {phase !== "question" && (
            <div
              className={`transition-all duration-500 ease-out ${
                phase === "transitioning"
                  ? "animate-studeo-evaporate pointer-events-none"
                  : ""
              }`}
            >
              <div className="mb-16 space-y-6 text-center sm:text-left">
                <h1 className="relative text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl tracking-tight drop-shadow-sm">
                  <span className="opacity-0">
                    {HERO_TEXT}
                  </span>
                  <span className="absolute left-0 top-0">
                    <span>{typedText}</span>
                    <span className="inline-block w-[1ch] animate-studeo-caret align-baseline">
                      |
                    </span>
                  </span>
                </h1>
              </div>

              <div
                className={`space-y-8 max-w-xl transition-all duration-500 ease-out ${
                  isHeroDone
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="space-y-4">
                  <label
                    htmlFor="pdf"
                    className="block text-sm font-bold uppercase tracking-[0.2em] text-blue-200"
                  >
                    Study material (PDF)
                  </label>
                  <input
                    id="pdf"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="block w-full cursor-pointer rounded-3xl border-2 border-dashed border-white/40 bg-background/20 px-8 py-10 text-base text-white transition-all duration-300 file:mr-6 file:cursor-pointer file:rounded-xl file:border-0 file:bg-primary file:px-6 file:py-3 file:text-sm file:font-bold file:uppercase file:tracking-wide file:text-white hover:border-primary hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || isLoading}
                  className="relative mt-2 inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_0_50px_rgba(99,102,241,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_80px_rgba(99,102,241,0.95)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && (
                    <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
                  )}
                  <span>{isLoading ? "Uploading..." : "Upload"}</span>
                </button>

                {error && (
                  <p className="text-xs text-red-400">
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}

          {phase === "question" && (
            <div className="space-y-8 max-w-xl">
              <div className="mb-16 space-y-6 text-center sm:text-left">
                <h1 className="relative text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl tracking-tight drop-shadow-sm">
                  <span className="opacity-0">
                    {QUESTION_TEXT}
                  </span>
                  <span className="absolute left-0 top-0">
                    <span>{questionText}</span>
                    <span className="inline-block w-[1ch] animate-studeo-caret align-baseline">
                      |
                    </span>
                  </span>
                </h1>
              </div>

              <div className="space-y-3">
                {isRecording && (
                  <p className="text-xs font-medium text-blue-200">
                    Listening...
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleRecordToggle}
                  className={`relative inline-flex h-11 min-w-[8rem] items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-sm font-medium shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_70px_rgba(99,102,241,0.85)] ${
                    isRecording
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <span>{isRecording ? "Finish" : "Speak"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
