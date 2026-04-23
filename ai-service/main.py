from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MoodGuard AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base"

RISK_MAP = {
    "sadness": {"category": "depression", "weight": 0.85},
    "fear":    {"category": "anxiety",    "weight": 0.80},
    "anger":   {"category": "stress",     "weight": 0.70},
    "disgust": {"category": "stress",     "weight": 0.60},
    "joy":     {"category": "positive",   "weight": 0.00},
    "surprise":{"category": "neutral",    "weight": 0.10},
    "neutral": {"category": "neutral",    "weight": 0.05},
}

SUMMARIES = {
    "depression": "Your entry reflects signs of sadness or low mood. Consider reaching out to someone you trust.",
    "anxiety":    "Your entry shows signs of worry or fear. Breathing exercises and grounding techniques may help.",
    "stress":     "Your entry suggests elevated stress. Taking short breaks and self-care activities can help.",
    "positive":   "Your entry reflects a positive state of mind. Keep nurturing these feelings!",
    "neutral":    "Your entry appears emotionally balanced.",
}

class TextInput(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "mode": "huggingface-inference-api"}

@app.post("/predict")
async def predict(body: TextInput):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    text = body.text[:512]

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            MODEL_URL,
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            json={"inputs": text},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"HF API error: {response.text}")

    data = response.json()

    # HF returns [[{label, score}, ...]]
    if isinstance(data, list) and isinstance(data[0], list):
        results = data[0]
    elif isinstance(data, list):
        results = data
    else:
        raise HTTPException(status_code=500, detail="Unexpected response format")

    scores = {r["label"].lower(): round(r["score"] * 100, 2) for r in results}
    top = max(results, key=lambda x: x["score"])
    top_label = top["label"].lower()
    top_score = round(top["score"] * 100, 2)

    risk_info = RISK_MAP.get(top_label, {"category": "neutral", "weight": 0.1})
    risk_score = round(top["score"] * risk_info["weight"] * 100, 2)

    return {
        "primary_emotion": top_label,
        "primary_score": top_score,
        "mental_health_category": risk_info["category"],
        "risk_score": risk_score,
        "all_scores": scores,
        "summary": SUMMARIES.get(risk_info["category"], ""),
    }