import { supabase } from "../lib/supabase.js";
import axios from "axios";

const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function createEntry(req, res) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Text is required" });

    let prediction;
    try {
      const aiRes = await axios.post(`${AI_URL}/predict`, { text }, { timeout: 10000 });
      prediction = aiRes.data;
    } catch (aiErr) {
      console.error("AI service error:", aiErr.message);
      return res.status(503).json({ error: `AI service unavailable: ${aiErr.message}` });
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
      avg_risk_score: data.length ? +(totalRisk / data.length).toFixed(1) : 0,
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