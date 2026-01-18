import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    // Point to the JSON file in the 'agent' folder
    const dbPath = join(process.cwd(), "..", "agent", "agents.json");
    const data = await readFile(dbPath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({});
  }
}