import logging
import asyncio
from dotenv import load_dotenv
import requests

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, elevenlabs, deepgram
try:
    from .study_material import get_study_material
except ImportError:
    from study_material import get_study_material

load_dotenv()

async def entrypoint(ctx: JobContext, pdf_path: str = None):
    # Connect to the room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Get the "High Density" context from The Token Company logic
    study_material = get_study_material()

    # --- 2. DEFINE THE PROCTOR PERSONA ---
    # This is where the magic happens. We inject the compressed text 
    # into the System Prompt.
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            f"You are Studeo, a strict but fair oral exam proctor. "
            f"Your knowledge base is strictly limited to the following context: {study_material}. "
            "Do not answer questions outside of this material. "
            "Your goal is to test the user's understanding. "
            "Ask one question at a time. Wait for their answer. "
            "If they are wrong, correct them briefly and move to the next topic. "
            "Keep your responses concise and conversational."
        ),
    )

    # --- 3. CONFIGURE THE AGENT STACK ---
    # STT: Deepgram (Fastest for hearing the student)
    # LLM: OpenAI GPT-4o (Smartest for grading)
    # TTS: ElevenLabs (Best sounding for the proctor voice)
    agent = VoiceAssistant(
        vad=ctx.proc.userdata["vad"],
        context=initial_ctx,
        interruption_handling=True, # Critical for "Real" conversation
        stt=deepgram.STT(),
        llm=openai.LLM(model="gpt-4o"),
        tts=elevenlabs.TTS(), # Uses the default ElevenLabs voice, configurable
    )

    # Start the "Exam"
    agent.start(ctx.room)

    await asyncio.sleep(1)
    await agent.say("Hello. I am Studeo. I have ingested your study materials. Are you ready for your first question?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))