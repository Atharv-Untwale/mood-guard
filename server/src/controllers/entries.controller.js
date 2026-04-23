import { supabase } from "../lib/supabase.js";
import axios from "axios";

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_URL = "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base";

const RISK_MAP = {
  sadness: { category: "depression", weight: 0.85 },
  fear:    { category: "anxiety",    weight: 0.80 },
  anger:   { category: "stress",     weight: 0.70 },
  disgust: { category: "stress",     weight: 0.60 },
  joy:     { category: "positive",   weight: 0.00 },
  surprise:{ category: "neutral",    weight: 0.10 },
  neutral: { category: "neutral",    weight: 0.05 },
};

const SUMMARIES = {
  depression: "Your entry reflects signs of sadness or low mood. Consider reaching out to someone you trust.",
  anxiety:    "Your entry shows signs of worry or fear. Breathing exercises and grounding techniques may help.",
  stress:     "Your entry suggests elevated stress. Taking short breaks and self-care activities can help.",
  positive:   "Your entry reflects a positive state of mind. Keep nurturing these feelings!",
  neutral:    "Your entry appears emotionally balanced.",
};

async function analyzeEmotion(text) {
  const response = await axios.post(
    MODEL_URL,
    { inputs: text.slice(0, 512) },
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const data = response.data;

  // HF returns [[{label, score}, ...]]
  const results = Array.isArray(data[0]) ? data[0] : data;

  const scores = Object.fromEntries(
    results.map((r) => [r.label.toLowerCase(), round(r.score * 100)])
  );

  const top = results.reduce((a, b) => (a.score > b.score ? a : b));
  const topLabel = top.label.toLowerCase();
  const riskInfo = RISK_MAP[topLabel] ?? { category: "neutral", weight: 0.1 };

  return {
    primary_emotion: topLabel,
    primary_score: round(top.score * 100),
    mental_health_category: riskInfo.category,
    risk_score: round(top.score * riskInfo.weight * 100),
    all_scores: scores,
    summary: SUMMARIES[riskInfo.category] ?? "",
  };
}

function round(n) {
  return +n.toFixed(2);
}

export async function createEntry(req, res) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Text is required" });

    let prediction;
    try {
      prediction = await analyzeEmotion(text);
    } catch (aiErr) {
      console.error("HF API error:", aiErr.response?.data || aiErr.message);
      return res.status(503).json({ error: "Emotion analysis unavailable, please try again." });
    }

    const { data, error } = await supabase
      .from("entries")
      .insert({
        user_id: req.user.id,
        text,
        primary_emotion: prediction.primary_emotion,
        mental_health_category: prediction.mental_health_category,
        risk_score: prediction.risk_score,
        all_scores: prediction.all_scores,
        summary: prediction.summary,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ entry: data, prediction });
  } catch (err) {
    console.error("createEntry error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getEntries(req, res) {
  try {
    const { limit = 30, offset = 0 } = req.query;
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    res.json({ entries: data });
  } catch (err) {
    console.error("getEntries error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getStats(req, res) {
  try {
    const { data, error } = await supabase
      .from("entries")
      .select("primary_emotion, mental_health_category, risk_score, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const emotionCount = {};
    const categoryCount = {};
    let totalRisk = 0;

    data.forEach((e) => {
      emotionCount[e.primary_emotion] = (emotionCount[e.primary_emotion] || 0) + 1;
      categoryCount[e.mental_health_category] = (categoryCount[e.mental_health_category] || 0) + 1;
      totalRisk += e.risk_score;
    });

    res.json({
      total_entries: data.length,
      avg_risk_score: data.length ? round(totalRisk / data.length) : 0,
      emotion_distribution: emotionCount,
      category_distribution: categoryCount,
      timeline: data.map((e) => ({
        date: e.created_at,
        risk_score: e.risk_score,
        category: e.mental_health_category,
      })),
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function deleteEntry(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("deleteEntry error:", err);
    res.status(500).json({ error: err.message });
  }
}