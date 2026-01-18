import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 1. Capture the agentId from the URL (e.g., ?agentId=history-101)
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || "default"; 

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing API Keys" }, { status: 500 });
  }

  const roomName = `exam-${agentId}-${Date.now()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: "student-" + Math.floor(Math.random() * 10000),
    ttl: "10m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  // 2. CRITICAL: Bake the ID into the token metadata
  // If this line is missing, Python will always see "default"
  at.metadata = JSON.stringify({ agentId: agentId });

  return NextResponse.json({ 
    token: await at.toJwt(), 
    roomName 
  });
}