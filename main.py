"""
NexusVoice AI Lead Gen Engine
==============================
Standalone outbound/inbound AI voice agent for seller lead generation.
Integrates with Vapi/Retell/Twilio for telephony and supports CRM sync
via webhooks. Runs campaigns, logs calls, warm-transfers to sales teams.

Usage:
    uvicorn main:app --reload
    # or: python main.py
"""

import os
import uuid
import requests
from datetime import datetime
from typing import List, Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(title="NexusVoice AI Lead Gen Engine", version="1.0")

# Serve static frontend UI
@app.get("/", response_class=HTMLResponse)
async def get_index():
    static_index = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(static_index):
        with open(static_index, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("<h2>NexusVoice AI UI Loading... Please create static/index.html</h2>")

# Mount static directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
scheduler = BackgroundScheduler()
scheduler.start()

# ---------------------------------------------------------------------------
# Mock Databases (swap for real DB in production)
# ---------------------------------------------------------------------------

db_leads: Dict[str, Dict[str, Any]] = {}
db_campaigns: Dict[str, Dict[str, Any]] = {}
db_call_logs: Dict[str, List[Dict[str, Any]]] = {}

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

VAPI_API_KEY = os.getenv("VAPI_API_KEY", "your_vapi_key_here")
VAPI_URL = "https://api.vapi.ai"
DEFAULT_TRANSFER_NUMBER = os.getenv("DEFAULT_TRANSFER_NUMBER", "+15551234567")

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class VoiceSettings(BaseModel):
    gender: str = "female"  # male, female
    voice_provider: str = "11labs"  # elevenlabs, playht, open_ai
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # default clean professional voice
    temperature: float = Field(
        0.5,
        description="Lower for consistent, honest tone. Higher for high energy.",
    )
    characteristics: List[str] = ["persuasive", "honest", "confident", "energetic"]


class Lead(BaseModel):
    id: Optional[str] = None
    phone_number: str
    first_name: str
    last_name: str
    property_address: Optional[str] = None
    crm_id: Optional[str] = None
    status: str = "New"


class CampaignStep(BaseModel):
    step_number: int
    action_type: str  # "call", "sms", "email", "wait"
    delay_hours: int
    template_id: Optional[str] = None


class SmartCampaign(BaseModel):
    id: Optional[str] = None
    name: str
    business_type: str  # "real_estate", "saas", etc.
    steps: List[CampaignStep]
    active: bool = True


# ---------------------------------------------------------------------------
# Voice Agent Payload Builder
# ---------------------------------------------------------------------------


def get_voice_assistant_payload(
    lead: Lead,
    voice: VoiceSettings,
    transfer_number: str,
    system_prompt: str,
) -> Dict[str, Any]:
    """
    Constructs the orchestration configuration payload dynamically injected
    into the Voice Gateway (Vapi / Retell).
    """
    return {
        "name": f"Campaign_Agent_{lead.id}",
        "voice": {
            "provider": voice.voice_provider,
            "voiceId": voice.voice_id,
            "stability": 0.75,
            "similarityBoost": 0.85,
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": voice.temperature,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt.format(
                        first_name=lead.first_name,
                        property_address=lead.property_address or "your property",
                        characteristics=", ".join(voice.characteristics),
                    ),
                }
            ],
            "tools": [
                {
                    "type": "transferCall",
                    "destinations": [
                        {
                            "type": "number",
                            "number": transfer_number,
                            "message": "Please hold a brief moment while I transfer you directly to our senior acquisition specialist.",
                        }
                    ],
                    "function": {
                        "name": "transferCall",
                        "description": "Trigger this tool immediately when the seller consents to an offer valuation, requests an appointment, or explicitly asks to speak with a live supervisor.",
                    },
                }
            ],
        },
        "recordingEnabled": True,
        "firstMessage": (
            f"Hi {lead.first_name}? This is Alex. I know this might be out of "
            f"the blue, but I was looking at property data near "
            f"{lead.property_address or 'your neighborhood'} and wanted to see "
            f"if you've given any thoughts to selling or receiving a cash offer "
            f"on that property?"
        ),
    }


# ---------------------------------------------------------------------------
# Endpoints — Lead & Campaign Management
# ---------------------------------------------------------------------------




@app.post("/leads", response_model=Lead)
async def create_lead(lead: Lead):
    """Add a new lead to the system."""
    lead.id = lead.id or f"lead_{uuid.uuid4().hex[:8]}"
    db_leads[lead.id] = lead.model_dump()
    return lead


@app.get("/leads", response_model=List[Lead])
async def list_leads():
    """List all leads."""
    return [Lead(**data) for data in db_leads.values()]


@app.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    """Get a single lead by ID."""
    if lead_id not in db_leads:
        raise HTTPException(status_code=404, detail="Lead not found")
    return Lead(**db_leads[lead_id])


@app.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead."""
    if lead_id not in db_leads:
        raise HTTPException(status_code=404, detail="Lead not found")
    del db_leads[lead_id]
    return {"status": "deleted"}


@app.post("/campaigns", response_model=SmartCampaign)
async def create_campaign(campaign: SmartCampaign):
    """Create a smart campaign."""
    campaign.id = campaign.id or f"camp_{uuid.uuid4().hex[:8]}"
    db_campaigns[campaign.id] = campaign.model_dump()
    return campaign


@app.get("/campaigns", response_model=List[SmartCampaign])
async def list_campaigns():
    """List all campaigns."""
    return [SmartCampaign(**data) for data in db_campaigns.values()]


# ---------------------------------------------------------------------------
# Endpoints — Call Execution
# ---------------------------------------------------------------------------


@app.post("/leads/trigger-outbound")
async def trigger_outbound_call(
    lead_id: str,
    transfer_number: str = DEFAULT_TRANSFER_NUMBER,
    voice_config: VoiceSettings = VoiceSettings(),
    system_prompt_raw: str = "",
):
    """
    Executes a single outbound call targeting a specific lead by spinning
    up a runtime gateway agent instance on Vapi.
    """
    if lead_id not in db_leads:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_data = Lead(**db_leads[lead_id])

    # Use the default system prompt from README if none provided
    if not system_prompt_raw.strip():
        system_prompt_raw = DEFAULT_SYSTEM_PROMPT

    payload = get_voice_assistant_payload(
        lead_data, voice_config, transfer_number, system_prompt_raw
    )

    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}",
        "Content-Type": "application/json",
    }

    phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID", "")
    vapi_call_payload = {
        "assistant": payload,
        "customer": {"number": lead_data.phone_number},
        "phoneNumberId": phone_number_id,
    }

    if VAPI_API_KEY == "your_vapi_key_here":
        # Demo / dry-run mode
        return {
            "status": "dry_run",
            "message": "No real Vapi API key configured. This is what would be sent to the voice gateway.",
            "lead": lead_data.model_dump(),
            "call_payload": vapi_call_payload,
        }

    response = requests.post(
        f"{VAPI_URL}/call", json=vapi_call_payload, headers=headers
    )
    if response.status_code != 201:
        raise HTTPException(
            status_code=500,
            detail=f"Voice gateway connection failed: {response.text}",
        )

    call_data = response.json()
    return {
        "status": "success",
        "call_id": call_data.get("id"),
        "message": "Call initialized successfully.",
    }


@app.post("/leads/batch-trigger")
async def batch_trigger_outbound(
    lead_ids: List[str],
    transfer_number: str = DEFAULT_TRANSFER_NUMBER,
    voice_config: VoiceSettings = VoiceSettings(),
    system_prompt_raw: str = "",
):
    """Trigger outbound calls for a list of lead IDs."""
    results = []
    for lead_id in lead_ids:
        try:
            result = await trigger_outbound_call(
                lead_id=lead_id,
                transfer_number=transfer_number,
                voice_config=voice_config,
                system_prompt_raw=system_prompt_raw,
            )
            results.append({"lead_id": lead_id, "result": result})
        except HTTPException as e:
            results.append({"lead_id": lead_id, "error": e.detail})
    return results


# ---------------------------------------------------------------------------
# Endpoints — Call Logs
# ---------------------------------------------------------------------------


@app.get("/call-logs")
async def list_call_logs():
    """List all call logs."""
    return db_call_logs


@app.get("/call-logs/{call_id}")
async def get_call_log(call_id: str):
    """Get logs for a specific call."""
    if call_id not in db_call_logs:
        raise HTTPException(status_code=404, detail="Call log not found")
    return db_call_logs[call_id]


# ---------------------------------------------------------------------------
# Webhook — Voice Gateway Event Ingestion
# ---------------------------------------------------------------------------


@app.post("/webhooks/voice-gateway")
async def handle_voice_gateway_webhook(
    request: Request, background_tasks: BackgroundTasks
):
    """
    Receives post-call metadata, transcription records, user-intent analytics,
    and structural recording logs from the voice engine (Vapi / Retell).
    """
    payload = await request.json()
    event_type = payload.get("message", {}).get("type") or payload.get("type")

    # Process call completion events
    if event_type in ["end-of-call-report", "call.completed"]:
        call_details = payload.get("call", payload)
        call_id = call_details.get("id")
        transcript = call_details.get("transcript", "")
        analysis = call_details.get("analysis", {})
        summary = analysis.get("summary", "No summary extracted.")
        disposition = analysis.get("disposition", "unknown")
        recording_url = call_details.get("recordingUrl", "")

        log_entry = {
            "call_id": call_id,
            "timestamp": datetime.utcnow().isoformat(),
            "transcript": transcript,
            "summary": summary,
            "disposition": disposition,
            "recording_url": recording_url,
        }

        if call_id not in db_call_logs:
            db_call_logs[call_id] = []
        db_call_logs[call_id].append(log_entry)

        return {"status": "processed"}

    return {"status": "ignored_event"}


# ---------------------------------------------------------------------------
# Default System Prompt (from README)
# ---------------------------------------------------------------------------

DEFAULT_SYSTEM_PROMPT = """# SYSTEM PROMPT: NEXUSVOICE REAL ESTATE CONVERSATIONAL ENGINE

## 1. AGENT IDENTITY & BEHAVIOR
- NAME: Alex, Acquisitions Specialist.
- CHARACTERISTICS: You must exude absolute {characteristics}. Maintain a conversational pacing of 140-160 WPM with realistic natural conversational pauses. Never sound like a robotic dialer.
- OBJECTIVE: Determine if the human owns the target property at {property_address}, assess motivation to sell, qualify their situation, and smoothly transition to an appointment or execute a live warm-transfer to a senior valuation lead.

## 2. CONVERSATIONAL PIPELINE STEPS
1. Greeting & Address Verification: "Hi {first_name}, this is Alex. I know this is out of the blue, but I'm looking at property insights near {property_address} and wanted to see if you've thought about selling or receiving an offer on that house?"
2. Situation Qualification: If open to talking, softly probe for: Condition of property, timeline, and rough pricing expectations.
3. Handoff/Transfer: If highly motivated or requests an absolute valuation, trigger the `transferCall` tool immediately.

## 3. OBJECTION HANDLING MATRIX (COMPOSURE AND REVERSALS)
- OBJECTION: "How did you get my number?"
  - RESPONSE: "I work with public property index records and local real estate data filters to reach out to neighborhood owners directly. Is this indeed {first_name}?"
- OBJECTION: "I am not interested in selling / No."
  - RESPONSE: "Totally understand! Property timing is everything. Do you happen to own any other land or residential investments in the area you might consider down-scaling, or are you fully set?"
- OBJECTION: "Give me an offer right now on the phone."
  - RESPONSE: "I'd love to give you an exact figure, but I want to be fair and accurate. I need to run a quick analysis with my local valuation manager. Can I get you on the line with them right now for a quick 2-minute review?"

## 4. STRICT GUARDRAILS & PROTOCOLS
- VOICEMAIL PROTOCOL: If you detect an answering machine tone or intercept an automated voicemail message, immediately halt the interactive pipeline and read this message clearly: "Hi {first_name}, sorry I missed you. This is Alex. I am looking for properties to buy near {property_address}. Please call me back at your earliest convenience at my direct line. Thanks!"
- NO HALLUCINATION: Never invent specific monetary offers, buying contracts, or structural real estate licensing status unless pre-configured in local system data. If cornered, state confidently: "That's exactly what my supervisor will lock down for you. Let's get them on the line."
"""


# ---------------------------------------------------------------------------
# Seed Mock Data
# ---------------------------------------------------------------------------

@app.on_event("startup")
def seed_data():
    """Seed some mock leads for demo purposes."""
    mock_id = "lead_001"
    db_leads[mock_id] = {
        "id": mock_id,
        "phone_number": "+15551234567",
        "first_name": "John",
        "last_name": "Doe",
        "property_address": "123 Main St, Clinton Township, MI",
        "status": "New",
    }
    mock_id2 = "lead_002"
    db_leads[mock_id2] = {
        "id": mock_id2,
        "phone_number": "+15559876543",
        "first_name": "Jane",
        "last_name": "Smith",
        "property_address": "456 Oak Ave, Royal Oak, MI",
        "status": "New",
    }
    print(f"[seed] Loaded {len(db_leads)} mock leads")
    print(f"[seed] Server ready at http://localhost:{os.getenv('PORT', '8000')}")
    print(f"[seed] Docs at http://localhost:{os.getenv('PORT', '8000')}/docs")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
