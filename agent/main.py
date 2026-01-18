import logging
import asyncio
import os
import requests
from dotenv import load_dotenv

# --- LIVEKIT v1.0 IMPORTS ---
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
# 'VoiceAssistant' is gone. We now use Agent + AgentSession.
from livekit.agents import Agent, AgentSession, inference
from livekit.plugins import silero, turn_detector
from livekit.plugins.turn_detector.multilingual import MultilingualModel

try:
    from .study_material import get_study_material
except ImportError:
    from study_material import get_study_material

load_dotenv()
logger = logging.getLogger("studeo-agent")

async def entrypoint(ctx: JobContext, pdf_path: str = None):
    # Connect to the room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Get Material (Hardcoded path for hackathon simplicity, or use env var)
    # Note: passing arguments directly to entrypoint via CLI is complex, 
    # so we usually read from ENV or a specific file.
    pdf_path = os.getenv("PDF_PATH", "study_guide.pdf")
    study_material = get_study_material(pdf_path)

    # A. DEFINE THE AGENT (Persona)

    proctor_agent = Agent(
        instructions=(
            f"You are Studeo, a strict but fair oral exam proctor. "
            f"Your knowledge base is strictly limited to: {study_material}. "
            "Do not answer or ask questions outside of this material. "
            "Ask one question at a time. Wait for their answer. "
            "If they are wrong, correct them briefly. Keep responses concise."
        )
    )

    # B. DEFINE THE SESSION (The Body)
    # Using String IDs ("openai/gpt-4o") tells LiveKit to use the HACKATHON FREE KEYS.
    session = AgentSession(
        # 1. VAD (Voice Activity Detection) - Required
        vad=silero.VAD.load(),
        
        # 2. Smart Turn Detection (Prevents interrupting the student)
        # This downloads a small model to analyze if the sentence is complete.
        turn_detection=MultilingualModel(),
        
        # 3. The "Free" Stack (LiveKit Inference)
        stt="deepgram/nova-2", 
        llm="openai/gpt-4o", 
        tts=inference.TTS(
        model="elevenlabs/eleven_turbo_v2_5", 
        voice="Xb7hH8MSUJpSbSDYk0k2", 
        language="en"
        ),
    )

    # C. START
    await session.start(room=ctx.room, agent=proctor_agent)

    # Send Greeting
    await asyncio.sleep(1)
    await session.generate_reply(instructions="Greet the student and say you have ingested their notes.")
    
    # Wait for the user to leave
    await ctx.wait_for_participant()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))