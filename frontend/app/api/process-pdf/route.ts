import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = join(tempDir, `upload-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    // Path to the Python script
    // Assuming the structure is:
    // /project/frontend/app/api/process-pdf/route.ts
    // /project/agent/process_pdf.py
    // process.cwd() in Next.js usually points to the root of the project (frontend folder)
    // So we need to go up one level to reach 'agent'
    const scriptPath = join(process.cwd(), "..", "agent", "process_pdf.py");

    // Spawn Python process
    const pythonProcess = spawn("python", [scriptPath, tempFilePath]);

    let outputData = "";
    let errorData = "";

    await new Promise<void>((resolve, reject) => {
      pythonProcess.stdout.on("data", (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python process exited with code ${code}. Error: ${errorData}`));
        }
      });
    });

    // Clean up temp file
    await unlink(tempFilePath);

    type ProcessorResult = {
      success?: boolean;
      error?: string;
      data?: unknown;
    };

    // Parse the output from Python
    let result: ProcessorResult | null = null;
    try {
      result = JSON.parse(outputData);
    } catch {
      const lines = outputData
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (line.startsWith("{") && line.endsWith("}")) {
          try {
            result = JSON.parse(line);
            break;
          } catch {
            // Ignore and keep searching
          }
        }
      }

      if (!result) {
        return NextResponse.json(
          { error: "Invalid response from processor" },
          { status: 500 }
        );
      }
    }

    if (result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    if (result && result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unexpected processor response" },
      { status: 500 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
