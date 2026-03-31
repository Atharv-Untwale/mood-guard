from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import torch
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

MODEL_NAME = os.getenv("MODEL_NAME", "j-hartmann/emotion-english-distilroberta-base")

print(f"Loading model: {MODEL_NAME}")
classifier = pipeline(
    "text-classification",
    model=MODEL_NAME,
    return_all_scores=True,
    device=-1,  # force CPU
)
print("Model loaded!")

RISK_MAP = {
    "sadness": {"category": "depression", "weight": 0.85},
    "fear":    {"category": "anxiety",    "weight": 0.80},
    "anger":   {"category": "stress",     "weight": 0.70},
    "disgust": {"category": "stress",     "weight": 0.60},
    "joy":     {"category": "positive",   "weight": 0.00},
    "surprise":{"category": "neutral",    "weight": 0.10},
    "neutral": {"category": "neutral",    "weight": 0.05},
}

class TextInput(BaseModel):
    text: str

class PredictionResult(BaseModel):
    primary_emotion: str
    primary_score: float
    mental_health_category: str
    risk_score: float
    all_scores: dict
    summary: str

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/predict", response_model=PredictionResult)
def predict(body: TextInput):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    text = body.text[:512]
    results = classifier(text)[0]

    scores = {r["label"].lower(): round(r["score"] * 100, 2) for r in results}
    top = max(results, key=lambda x: x["score"])
    top_label = top["label"].lower()
    top_score = round(top["score"] * 100, 2)

    risk_info = RISK_MAP.get(top_label, {"category": "neutral", "weight": 0.1})
    risk_score = round(top["score"] * risk_info["weight"] * 100, 2)

    summaries = {
        "depression": "Your entry reflects signs of sadness or low mood. Consider reaching out to someone you trust.",
        "anxiety":    "Your entry shows signs of worry or fear. Breathing exercises and grounding techniques may help.",
        "stress":     "Your entry suggests elevated stress. Taking short breaks and self-care activities can help.",
        "positive":   "Your entry reflects a positive state of mind. Keep nurturing these feelings!",
        "neutral":    "Your entry appears emotionally balanced.",
    }

    return PredictionResult(
        primary_emotion=top_label,
        primary_score=top_score,
        mental_health_category=risk_info["category"],
        risk_score=risk_score,
        all_scores=scores,
        summary=summaries.get(risk_info["category"], ""),
    )