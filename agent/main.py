import logging
import asyncio
import os
import json
import requests
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    UserInputTranscribedEvent,
    ConversationItemAddedEvent,
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

# Helper: Load specific agent content from the JSON DB
def load_agent_content(agent_id: str) -> str:
    try:
        # Construct path to agents.json relative to this script
        db_path = os.path.join(os.path.dirname(__file__), "agents.json")
        
        if not os.path.exists(db_path):
            # Fallback if DB doesn't exist yet
            return "Error: No agent database found. Please create an agent first."
            
        with open(db_path, "r") as f:
            data = json.load(f)
            # Look up the agent by ID, return its content or a default message
            return data.get(agent_id, {}).get("content", "No content found for this agent.")
            
    except Exception as e:
        logger.error(f"Failed to load agent content: {e}")
        return "System error loading exam content."


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 1. WAIT FOR USER TO JOIN (Critical for getting metadata)
    participant = await ctx.wait_for_participant()
    
    # 2. EXTRACT AGENT ID FROM METADATA
    agent_id = "default"
    if participant.metadata:
        try:
            import json
            meta = json.loads(participant.metadata)
            agent_id = meta.get("agentId", "default")
            logger.info(f"📚 Student requested Agent ID: {agent_id}")
        except:
            logger.warning("Could not parse metadata, defaulting to 'default' agent.")

    # 3. LOAD THE SPECIFIC CONTENT
    study_material = load_agent_content(agent_id)

    # 4. START THE AGENT
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

    # ... inside entrypoint ...

    # 1. USER SPEECH (Keep this, it works)
    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event: UserInputTranscribedEvent):
        if event.is_final:
            print(f"🎤 User: {event.transcript}")
            asyncio.create_task(ctx.room.local_participant.publish_data(
                payload=event.transcript.encode('utf-8'),
                topic="chat_user"
            ))

    @session.on("conversation_item_added")
    def on_conversation_item_added(event: ConversationItemAddedEvent):
        # FIX: Accept "assistant" (standard) or "agent" (legacy)
        if event.item.role in ["agent", "assistant"]:
            
            # Extract text content safely
            text = ""
            if hasattr(event.item, "content"):
                for content in event.item.content:
                    if hasattr(content, "text"):
                        text += content.text
                    elif isinstance(content, str):
                        text += content
            
            # If we found text, send it to the frontend!
            if text:
                print(f"🤖 Studeo: {text[:50]}...") # Log first 50 chars
                asyncio.create_task(ctx.room.local_participant.publish_data(
                    payload=text.encode('utf-8'),
                    topic="chat"
                ))

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
