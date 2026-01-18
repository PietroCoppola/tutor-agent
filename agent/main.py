import logging
import asyncio
import os
import requests
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.agents import Agent, AgentSession, inference
from livekit.plugins import silero, turn_detector
from livekit.plugins.turn_detector.multilingual import MultilingualModel

try:
    from .study_material import get_study_material, load_study_material_cache
except ImportError:
    from study_material import get_study_material, load_study_material_cache

load_dotenv()
logger = logging.getLogger("studeo-agent")


def load_material_for_agent() -> str:
    cached = load_study_material_cache()
    if cached:
        return cached
    pdf_path = os.getenv("PDF_PATH", "study_guide.pdf")
    return get_study_material(pdf_path)


async def entrypoint(ctx: JobContext, pdf_path: str = None):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    study_material = load_material_for_agent()

    proctor_agent = Agent(
        instructions=(
            f"You are Studeo, a strict but fair oral exam proctor. "
            f"Your knowledge base is strictly limited to: {study_material}. "
            "Do not answer or ask questions outside of this material. "
            "Ask one question at a time. Wait for their answer. "
            "If they are wrong, correct them briefly. Keep responses concise."
        )
    )

    session = AgentSession(
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
        stt="deepgram/nova-2",
        llm="google/gemini-3-flash", #was openai/gpt-4o
        tts=inference.TTS(
            model="elevenlabs/eleven_turbo_v2_5",
            voice="Xb7hH8MSUJpSbSDYk0k2",
            language="en",
        ),
    )

    await session.start(room=ctx.room, agent=proctor_agent)

    await asyncio.sleep(1)
    await session.generate_reply(instructions="Greet the student and say you have ingested their notes.")

    await ctx.wait_for_participant()


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
