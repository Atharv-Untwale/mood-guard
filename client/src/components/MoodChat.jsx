import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import styles from "./MoodChat.module.css";

const SYSTEM_PROMPT = `You are a compassionate mental wellness assistant inside MoodGuard, a journaling app. 
Your role is to provide emotional support, help users reflect on their feelings, and suggest healthy coping strategies.
Keep responses concise (2-4 sentences), warm, and non-clinical. Never diagnose. 
If someone seems in crisis, gently suggest professional help or a crisis line.`;

export default function MoodChat({ onClose, lastCategory }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm here to chat about how you're feeling. ${
        lastCategory === "depression" ? "I noticed your recent entries reflect some low mood — want to talk about it?" :
        lastCategory === "anxiety" ? "I noticed some anxiety in your recent entries — I'm here to listen." :
        lastCategory === "stress" ? "Looks like you've been under some stress lately — want to talk?" :
        "How are you feeling today?"
      }`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "I'm here for you. Can you tell me more?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    }

    setLoading(false);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>M</div>
            <div>
              <p className={styles.name}>MoodGuard AI</p>
              <p className={styles.status}>Here to listen</p>
            </div>
          </div>
          <button onClick={onClose} className={styles.close}><X size={16} /></button>
        </div>

        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.message} ${m.role === "user" ? styles.user : styles.assistant}`}>
              <p>{m.content}</p>
            </div>
          ))}
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
            placeholder="Type a message..."
            className={styles.input}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} className={styles.sendBtn}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}