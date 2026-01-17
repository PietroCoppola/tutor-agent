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
from livekit.agents import Agent, AgentSession
from livekit.plugins import silero, turn_detector
from livekit.plugins.turn_detector.multilingual import MultilingualModel

try:
    from .pdf_utils import pdf_to_string
except ImportError:
    from pdf_utils import pdf_to_string

load_dotenv()
logger = logging.getLogger("studeo-agent")

# --- 1. THE TOKEN COMPANY LOGIC ---
def get_study_material(pdf_path: str = None):
    # 1. READ PDF (If provided)
    pdf_text = ""
    if pdf_path and os.path.exists(pdf_path):
        logger.info(f"Reading PDF from: {pdf_path}")
        pdf_text = pdf_to_string(pdf_path)
    else:
        # Fallback for hackathon demo if no PDF is found
        pdf_text = "History of the Internet. Key Concept: ARPANET (1969)."

    # 2. CALL TOKEN COMPANY
    # Only call if we have substantial text, otherwise mock it to save API calls
    if len(pdf_text) > 100: 
        logger.info("Compressing text with The Token Company...")
        try:
            response = requests.post(
                "https://api.thetokencompany.com/v1/compress",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": "Bearer ttc_sk_VLh1ccJqgS77Dl_R49vxWNSOgl-C4NoHo_rLS96xWYo"
                },
                json={
                    "model": "bear-1",
                    "compression_settings": {
                        "aggressiveness": 0.5
                    },
                    "input": pdf_text
                }
            )
            response.raise_for_status()
            return response.json()["output"]
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return pdf_text[:500] + "..." # Fallback
    
    return pdf_text

# --- 2. ENTRYPOINT ---
async def entrypoint(ctx: JobContext):
    # Connect
    logger.info(f"Connecting to room {ctx.room.name}...")
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
            "Do not answer questions outside of this material. "
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
        tts="elevenlabs/eleven_flash_v2_5",
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