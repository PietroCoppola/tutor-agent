import logging
import asyncio
from dotenv import load_dotenv
import requests

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, elevenlabs, deepgram
try:
    from .pdf_utils import pdf_to_string
except ImportError:
    from pdf_utils import pdf_to_string

load_dotenv()

# --- 1. THE TOKEN COMPANY INTEGRATION (Mock) ---
# In production, you would fetch this from your backend where the 
# PDF was compressed.
def get_study_material(pdf_path: str = None):
    # Example: If a PDF path is provided, read it
    if pdf_path:
        #print(f"Reading PDF from: {pdf_path}")
        pdf_text = pdf_to_string(pdf_path)
        # You could then send this 'pdf_text' to the compression API
        # or use it directly if it's small enough.
        # For now, we'll continue with the mock flow below.

    # Placeholder for The Token Company's output
    response = requests.post(
        "https://api.thetokencompany.com/v1/compress",
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer ttc_sk_VLh1ccJqgS77Dl_R49vxWNSOgl-C4NoHo_rLS96xWYo"
        },
        json={
            "model": "bear-1",
            "compression_settings": {
                "aggressiveness": 0.5,
                "max_output_tokens": None,
                "min_output_tokens": None
            },
            "input": pdf_text
        }
    )
 
    result = response.json()
    

    return result["output"]
    
    # """
    # [COMPRESSED_CONTEXT_START]
    # Subject: History of the Internet.
    # Key Concept 1: ARPANET founded in 1969.
    # Key Concept 2: TCP/IP standardized in 1983.
    # Key Concept 3: The dot-com bubble burst in 2000.
    # [COMPRESSED_CONTEXT_END]
    # """

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