"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Here you can handle the success state, e.g., navigate to the next page
      // or show a success message.
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="absolute left-0 top-0 flex items-center gap-3 z-50">
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
          <div className="mb-16 space-y-6 text-center sm:text-left">
            <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl tracking-tight drop-shadow-sm">
              Hi. I&apos;m Studeo, your brand-new studying partner.
            </h1>
          </div>

          <div className="space-y-8 max-w-xl">
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
      </main>
    </div>
  );
}
