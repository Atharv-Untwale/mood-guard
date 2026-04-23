import { supabase } from "../lib/supabase.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ONBOARDING_QUESTIONS = [
  { id: "name", text: "Hey there 👋 I'm your WellScopeGuard assistant. What should I call you?" },
  { id: "age", text: "Nice to meet you! How old are you?" },
  { id: "situation", text: "What's your current life situation? (student, working, between jobs, etc.)" },
  { id: "main_concern", text: "What's been weighing on you the most lately?" },
  { id: "support", text: "Do you have people around you — friends, family — you can talk to?" },
  { id: "goal", text: "Last one — what are you hoping to get from these chats? (venting, advice, coping tips, just someone to talk to?)" },
];

function buildSystemPrompt(profile, recentWellScope) {
  return `You are a warm, empathetic mental wellness companion inside WellScopeGuard, a journaling app.

User profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Life situation: ${profile.situation}
- Main concern: ${profile.main_concern}
- Support system: ${profile.support}
- Goal from these chats: ${profile.goal}
- Recent journal WellScope: ${recentWellScope || "unknown"}

Guidelines:
- Always address them by name (${profile.name})
- Keep responses to 2-4 sentences, warm and conversational
- Tailor advice to their age, situation and goal
- If their goal is venting, mostly listen and validate feelings
- If their goal is advice, be practical and specific
- Reference their latest journal entry when relevant — it tells you exactly how they are feeling right now
- Never diagnose or replace professional help
- If they seem in crisis, gently suggest a helpline like iCall (9152987821) for India`;
}

// GET /api/chat/profile
export async function getProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from("chat_profiles")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    res.json({ profile: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/chat/profile
export async function saveProfile(req, res) {
  try {
    const { name, age, situation, main_concern, support, goal } = req.body;

    const { data, error } = await supabase
      .from("chat_profiles")
      .upsert({
        user_id: req.user.id,
        name, age, situation, main_concern, support, goal,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/chat/history
export async function getHistory(req, res) {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true })
      .limit(30);

    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/chat/message
export async function sendMessage(req, res) {
  try {
    const { message, profile, recentWellScope, latestEntryContext } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message required" });

    // Skip saving system welcome message
    if (message !== "__system_welcome__") {
      await supabase.from("chat_messages").insert({
        user_id: req.user.id,
        role: "user",
        content: message,
      });
    }

    // Get last 20 messages for context
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const contextMessages = (history || []).reverse();

    // Build system prompt with latest entry context
    const fullRecentWellScope = latestEntryContext
      ? `${recentWellScope || "unknown"} | ${latestEntryContext}`
      : recentWellScope;

    const systemPrompt = buildSystemPrompt(profile, fullRecentWellScope);

    // Skip AI call for system welcome
    if (message === "__system_welcome__") {
      return res.json({ reply: null });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content || "I'm here for you. Tell me more.";

    await supabase.from("chat_messages").insert({
      user_id: req.user.id,
      role: "assistant",
      content: reply,
    });

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/chat/history
export async function clearHistory(req, res) {
  try {
    await supabase.from("chat_messages").delete().eq("user_id", req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export { ONBOARDING_QUESTIONS };