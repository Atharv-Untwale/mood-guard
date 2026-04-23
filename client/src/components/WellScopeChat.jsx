import { useState, useRef, useEffect } from "react";
import { Send, X, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import styles from "./WellScopeChat.module.css";

const ONBOARDING_QUESTIONS = [
  { id: "name", text: "Hey there 👋 I'm your WellScope assistant. What should I call you?" },
  { id: "age", text: "Nice to meet you! How old are you?" },
  { id: "situation", text: "What's your current life situation? (student, working, between jobs, etc.)" },
  { id: "main_concern", text: "What's been weighing on you the most lately?" },
  { id: "support", text: "Do you have people around you — friends, family — you can talk to?" },
  { id: "goal", text: "Last one — what are you hoping to get from these chats? (venting, advice, coping tips, just someone to talk to?)" },
];

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
}

export default function WellScopeChat({ onClose, lastCategory, entries = [], lastEntry = null }) {
  const [phase, setPhase] = useState("loading");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [profile, setProfile] = useState(null);
  const [tempProfile, setTempProfile] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadInitialData() {
    try {
      const [profileRes, historyRes] = await Promise.all([
        apiFetch("/api/chat/profile"),
        apiFetch("/api/chat/history"),
      ]);

      if (profileRes.profile) {
        setProfile(profileRes.profile);
        const history = historyRes.messages || [];
        if (history.length === 0) {
          setMessages([{
            role: "assistant",
            content: `Welcome back, ${profileRes.profile.name} 👋 ${
              lastEntry
                ? `I noticed your last entry — "${lastEntry.text.slice(0, 60)}${lastEntry.text.length > 60 ? "..." : ""}" — it felt like ${lastEntry.mental_health_category || "a lot"}. How are you feeling since then?`
                : "How are you feeling today?"
            }`,
          }]);
        } else {
          // Always prepend latest entry context at top of history
          const contextMsg = lastEntry ? {
            role: "assistant",
            content: `Just so you know, your latest journal entry shows ${lastEntry.mental_health_category || "some emotions"} with a risk score of ${lastEntry.risk_score}%. I'll keep that in mind as we chat.`,
          } : null;
          setMessages(contextMsg ? [contextMsg, ...history] : history);
        }
        setPhase("chat");
      } else {
        setMessages([{ role: "assistant", content: ONBOARDING_QUESTIONS[0].text }]);
        setPhase("onboarding");
      }
    } catch {
      setMessages([{ role: "assistant", content: "Hey! I'm having trouble connecting. Please try again." }]);
      setPhase("onboarding");
    }
  }

  async function handleOnboarding(answer) {
    const currentQuestion = ONBOARDING_QUESTIONS[questionIndex];
    const newTempProfile = { ...tempProfile, [currentQuestion.id]: answer };
    setTempProfile(newTempProfile);

    const nextIndex = questionIndex + 1;
    setMessages((prev) => [...prev, { role: "user", content: answer }]);

    if (nextIndex < ONBOARDING_QUESTIONS.length) {
      setQuestionIndex(nextIndex);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: ONBOARDING_QUESTIONS[nextIndex].text }]);
      }, 400);
    } else {
      setLoading(true);
      try {
        const res = await apiFetch("/api/chat/profile", {
          method: "POST",
          body: JSON.stringify(newTempProfile),
        });
        setProfile(res.profile);

        const recentWellScope = entries.slice(0, 3)
          .map(e => `${e.mental_health_category} (${e.risk_score}%)`)
          .join(", ") || lastCategory;

        const welcomeMsg = `Thanks ${newTempProfile.name}! I've saved your profile so I'll remember you next time 🌿${
          lastEntry
            ? ` I can see your latest journal entry shows ${lastEntry.mental_health_category || "some emotions"} — want to talk about it?`
            : ` I can see you've been experiencing some ${lastCategory || "mixed emotions"}. I'm here — what's on your mind?`
        }`;

        setTimeout(() => {
          setMessages((prev) => [...prev, { role: "assistant", content: welcomeMsg }]);
          setPhase("chat");
        }, 400);

        await apiFetch("/api/chat/message", {
          method: "POST",
          body: JSON.stringify({
            message: "__system_welcome__",
            profile: res.profile,
            recentWellScope,
          }),
        });
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "Profile saved! What's on your mind?" }]);
        setPhase("chat");
      }
      setLoading(false);
    }
  }

  async function handleChat(userInput) {
    setMessages((prev) => [...prev, { role: "user", content: userInput }]);
    setLoading(true);

    try {
      const recentWellScope = entries.slice(0, 3)
        .map(e => `${e.mental_health_category} (${e.risk_score}%)`)
        .join(", ") || lastCategory;

      const latestEntryContext = lastEntry
        ? `Latest journal entry: "${lastEntry.text.slice(0, 150)}" — emotion: ${lastEntry.mental_health_category}, risk: ${lastEntry.risk_score}%`
        : null;

      const res = await apiFetch("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          message: userInput,
          profile,
          recentWellScope,
          latestEntryContext,
        }),
      });

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: res.reply || "I'm here for you. Tell me more.",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I lost connection. Please try again.",
      }]);
    }

    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const value = input.trim();
    setInput("");
    if (phase === "onboarding") await handleOnboarding(value);
    else await handleChat(value);
  }

  async function clearHistory() {
    await apiFetch("/api/chat/history", { method: "DELETE" });
    setMessages([{
      role: "assistant",
      content: `Chat cleared! How are you feeling today, ${profile?.name || ""}?`,
    }]);
  }

  const progress = Math.min((questionIndex / ONBOARDING_QUESTIONS.length) * 100, 100);

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>M</div>
            <div>
              <p className={styles.name}>WellScope AI</p>
              <p className={styles.status}>
                {phase === "loading" ? "Connecting..." :
                 phase === "onboarding" ? `Getting to know you (${questionIndex}/${ONBOARDING_QUESTIONS.length})` :
                 `Chatting with ${profile?.name || "you"}`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {phase === "chat" && (
              <button onClick={clearHistory} className={styles.close} title="Clear history">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className={styles.close}><X size={16} /></button>
          </div>
        </div>

        {phase === "onboarding" && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className={styles.messages}>
          {phase === "loading" ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`${styles.message} ${m.role === "user" ? styles.user : styles.assistant}`}>
                <p>{m.content}</p>
              </div>
            ))
          )}
          {loading && (
            <div className={`${styles.message} ${styles.assistant}`}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={phase === "onboarding" ? "Type your answer..." : "Type a message..."}
            className={styles.input}
            disabled={phase === "loading"}
            autoFocus
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || phase === "loading"}
            className={styles.sendBtn}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}