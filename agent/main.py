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
    #UserInputTranscribedEvent,
    #ConversationItemAddedEvent,
    AgentStateChangedEvent,
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
    
    """# 1. USER SPEECH (STT)
    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event: UserInputTranscribedEvent):
        if event.is_final:
            asyncio.create_task(ctx.room.local_participant.publish_data(
                payload=event.transcript.encode('utf-8'),
                topic="chat_user"
            ))

    # 2. AGENT RESPONSE (LLM)
    @session.on("conversation_item_added")
    def on_conversation_item_added(event: ConversationItemAddedEvent):
        if event.item.role == "agent":
            # Safely extract text content
            text = ""
            if hasattr(event.item, "content"):
                for content in event.item.content:
                    if hasattr(content, "text"):
                        text += content.text
                    elif isinstance(content, str):
                        text += content
            
            if text:
                asyncio.create_task(ctx.room.local_participant.publish_data(
                    payload=text.encode('utf-8'),
                    topic="chat"
                ))"""

    # 3. AGENT STATE (Sync with Visualizer)
    @session.on("agent_state_changed")
    def on_agent_state_changed(event: AgentStateChangedEvent):
        # Convert the Enum to a simple string (e.g. "speaking", "listening")
        state_str = str(event.new_state).lower()
        
        # If it comes as "agentstate.speaking", clean it
        if "." in state_str:
            state_str = state_str.split(".")[-1]

        logger.info(f"🧠 Agent State: {state_str}")
        
        asyncio.create_task(ctx.room.local_participant.publish_data(
            payload=state_str.encode('utf-8'),
            topic="state"
        ))

    await session.start(room=ctx.room, agent=proctor_agent)

    await asyncio.sleep(1)
    await session.generate_reply(instructions="Greet the student and say you have ingested their notes.")

    await ctx.wait_for_participant()


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
