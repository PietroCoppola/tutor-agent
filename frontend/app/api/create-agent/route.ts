import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import os from "os";

type AgentData = {
  name: string;
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file || !name) {
      return NextResponse.json({ error: "File and Name required" }, { status: 400 });
    }

    // 1. Save temp PDF
    const bytes = await file.arrayBuffer();
    const tempFilePath = join(os.tmpdir(), `upload-${Date.now()}.pdf`);
    await writeFile(tempFilePath, Buffer.from(bytes));

    // 2. Parse PDF (Using your existing script)
    const scriptPath = join(process.cwd(), "..", "agent", "process_pdf.py");
    const pythonProcess = spawn("python", [scriptPath, tempFilePath]);

    let outputData = "";
    await new Promise<void>((resolve, reject) => {
      pythonProcess.stdout.on("data", (d) => outputData += d.toString());
      pythonProcess.on("close", (code) => code === 0 ? resolve() : reject());
    });

    // Clean up temp file
    await unlink(tempFilePath).catch(() => {});

    // 3. Extract Text
    let extractedText = "";
    try {
        // Try parsing as JSON first
        const json = JSON.parse(outputData);
        extractedText = json.text || json.data || outputData;
    } catch {
        // Fallback to raw string
        extractedText = outputData;
    }

    // 4. Save to JSON DB
    const dbPath = join(process.cwd(), "..", "agent", "agents.json");
    let db: Record<string, AgentData> = {};
    try {
        const existing = await readFile(dbPath, "utf-8");
        db = JSON.parse(existing);
    } catch { } // File might not exist yet

    // Create unique ID (e.g., "History 101" -> "history-101")
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    
    db[id] = {
        name: name,
        content: extractedText
    };

    await writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, agentId: id });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}