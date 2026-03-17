import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format } from "date-fns";
import { Trash2, LogOut, PenLine, TrendingUp, Activity, Sun, Moon, MessageCircle, Download } from "lucide-react";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";
import { exportPDF } from "../lib/exportPDF";
import MoodCalendar from "../components/MoodCalendar";
import StreakTracker from "../components/StreakTracker";
import WellnessTips from "../components/WellnessTips";
import MoodChat from "../components/MoodChat";
import { SkeletonCard, SkeletonEntry } from "../components/SkeletonCard";
import styles from "./Dashboard.module.css";

const CATEGORY_COLORS = {
  depression: "#94a3b8",
  anxiety: "#fbbf24",
  stress: "#f87171",
  positive: "#86efac",
  neutral: "#cbd5e1",
};

const CATEGORY_LABELS = {
  depression: "Low Mood",
  anxiety: "Anxiety",
  stress: "Stress",
  positive: "Positive",
  neutral: "Neutral",
};

function EmotionBadge({ category }) {
  const colorMap = {
    depression: { bg: "#f1f5f9", color: "#475569" },
    anxiety: { bg: "#fffbeb", color: "#d97706" },
    stress: { bg: "#fef2f2", color: "#ef4444" },
    positive: { bg: "#f0fdf4", color: "#16a34a" },
    neutral: { bg: "#f5f5f4", color: "#78716c" },
  };
  const c = colorMap[category] || colorMap.neutral;
  return (
    <span style={{ background: c.bg, color: c.color }} className={styles.badge}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get("/api/entries/stats").then((r) => r.data),
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: () => api.get("/api/entries").then((r) => r.data.entries),
  });

  const submitMutation = useMutation({
    mutationFn: (text) => api.post("/api/entries", { text }),
    onSuccess: (res) => {
      setLastResult(res.data.prediction);
      setText("");
      qc.invalidateQueries(["entries"]);
      qc.invalidateQueries(["stats"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(["entries"]);
      qc.invalidateQueries(["stats"]);
    },
  });

  const timelineData = stats?.timeline?.slice(-14).map((t) => ({
    date: format(new Date(t.date), "MMM d"),
    risk: t.risk_score,
  })) || [];

  const distData = Object.entries(stats?.category_distribution || {}).map(([k, v]) => ({
    name: CATEGORY_LABELS[k] || k,
    value: v,
    key: k,
  }));

  const dominantCategory = distData[0]?.key || "neutral";

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoIcon}>M</div>
          <span className={styles.logoText}>MoodGuard</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.email}>{user?.email}</span>
          <button onClick={toggle} className={styles.iconBtn} title="Toggle theme">
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button
            onClick={() => exportPDF(entries || [], stats)}
            className={styles.iconBtn}
            title="Export PDF"
          >
            <Download size={15} />
          </button>
          <button onClick={() => supabase.auth.signOut()} className={styles.iconBtn}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Stats */}
        <div className={styles.statsRow}>
          {statsLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              {[
                { label: "Total entries", value: stats?.total_entries ?? "—", icon: PenLine },
                { label: "Avg. risk score", value: stats?.avg_risk_score !== undefined ? `${stats.avg_risk_score}%` : "—", icon: Activity },
                { label: "Dominant state", value: distData[0]?.name ?? "—", icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <Icon size={13} color="var(--text2)" />
                    <span>{label}</span>
                  </div>
                  <p className={styles.statValue}>{value}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Streak */}
        <StreakTracker entries={entries || []} />

        {/* Charts */}
        {timelineData.length > 1 && (
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <p className={styles.chartTitle}>Risk score over time</p>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={timelineData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text)" }}
                    formatter={(v) => [`${v}%`, "Risk"]}
                  />
                  <Line type="monotone" dataKey="risk" stroke="var(--green)" strokeWidth={2} dot={{ fill: "var(--green)", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.chartCard}>
              <p className={styles.chartTitle}>Mood distribution</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={distData} barSize={22}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {distData.map((d) => (
                      <Cell key={d.key} fill={CATEGORY_COLORS[d.key] || "#cbd5e1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Mood Calendar */}
        <MoodCalendar entries={entries || []} />

        {/* Wellness Tips */}
        {entries?.length > 0 && <WellnessTips category={dominantCategory} />}

        {/* Journal Input */}
        <div className={styles.inputCard}>
          <p className={styles.inputTitle}>New entry</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 512))}
            placeholder="How are you feeling today? Write freely..."
            rows={4}
            className={styles.textarea}
          />
          <div className={styles.inputFooter}>
            <span className={styles.charCount}>{text.length} / 512</span>
            <button
              onClick={() => submitMutation.mutate(text)}
              disabled={!text.trim() || submitMutation.isPending}
              className={styles.analyzeBtn}
            >
              {submitMutation.isPending ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <p className={styles.resultTitle}>Analysis result</p>
              <EmotionBadge category={lastResult.mental_health_category} />
            </div>
            <p className={styles.resultSummary}>{lastResult.summary}</p>
            <div className={styles.scoreGrid}>
              {Object.entries(lastResult.all_scores || {}).map(([em, sc]) => (
                <div key={em} className={styles.scoreItem}>
                  <div className={styles.scoreDot} />
                  <span className={styles.scoreEmotion}>{em}</span>
                  <span className={styles.scoreValue}>{sc}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entry List */}
        <div className={styles.entryList}>
          <div className={styles.entryListHeader}>
            <p className={styles.entryListTitle}>Recent entries</p>
          </div>
          {entriesLoading ? (
            <><SkeletonEntry /><SkeletonEntry /><SkeletonEntry /></>
          ) : entries?.length === 0 ? (
            <div className={styles.empty}>No entries yet — write your first one above!</div>
          ) : (
            entries?.map((entry) => (
              <div key={entry.id} className={styles.entryItem}>
                <div className={styles.entryMeta}>
                  <EmotionBadge category={entry.mental_health_category} />
                  <span className={styles.entryDate}>
                    {format(new Date(entry.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                <p className={styles.entryText}>{entry.text}</p>
                <div className={styles.entryRight}>
                  <span className={styles.entryRisk}>{entry.risk_score}%</span>
                  <button onClick={() => deleteMutation.mutate(entry.id)} className={styles.deleteBtn}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Chat Button */}
      <button className={styles.chatFab} onClick={() => setShowChat(true)} title="Chat with AI">
        <MessageCircle size={20} />
      </button>

      {/* Chat Panel */}
      {showChat && <MoodChat onClose={() => setShowChat(false)} lastCategory={dominantCategory} entries={entries || []} />}     </div>
  );
}