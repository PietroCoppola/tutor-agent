import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // We allow passing an agentId (or pdfId) to isolate rooms
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || "default";

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing API Keys" }, { status: 500 });
  }

  const uniqueRoomName = `exam-${agentId}-${Date.now()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: "student-" + Math.floor(Math.random() * 10000),
    ttl: "10m",
  });

  // Grant permissions to the room
  at.addGrant({
    roomJoin: true,
    room: uniqueRoomName, // Unique room for this study session
    canPublish: true,
    canSubscribe: true,
  });

  // Pass the agentId to the Python backend via metadata
  at.metadata = JSON.stringify({ agentId });

  return NextResponse.json({ token: await at.toJwt() });
}