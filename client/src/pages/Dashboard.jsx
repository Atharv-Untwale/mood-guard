import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format } from "date-fns";
import { Trash2, LogOut, Sun, Moon, MessageCircle, Download, PenLine, BarChart2 } from "lucide-react";
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
  anxiety: "#f5c842",
  stress: "#f87171",
  positive: "#4ade80",
  neutral: "#c8b888",
};

const CATEGORY_LABELS = {
  depression: "Low Mood",
  anxiety: "Anxiety",
  stress: "Stress",
  positive: "Positive",
  neutral: "Neutral",
};

const BADGE_STYLES = {
  depression: { background: "rgba(148,163,184,0.15)", color: "#64748b" },
  anxiety:    { background: "rgba(245,200,66,0.15)",  color: "#a07010" },
  stress:     { background: "rgba(248,113,113,0.15)", color: "#dc2626" },
  positive:   { background: "rgba(74,222,128,0.15)",  color: "#16a34a" },
  neutral:    { background: "rgba(200,184,136,0.2)",  color: "var(--text3)" },
};

function EmotionBadge({ category }) {
  const s = BADGE_STYLES[category] || BADGE_STYLES.neutral;
  return (
    <span className={styles.badge} style={s}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

const DAYS = ["S","M","T","W","T","F","S"];
const TODAY_DAY = new Date().getDay();

export default function Dashboard() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [tab, setTab] = useState("journal");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get("/api/entries/stats").then(r => r.data),
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: () => api.get("/api/entries").then(r => r.data.entries),
  });

  const submitMutation = useMutation({
    mutationFn: (t) => api.post("/api/entries", { text: t }),
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

  const timelineData = stats?.timeline?.slice(-14).map(t => ({
    date: format(new Date(t.date), "MMM d"),
    risk: t.risk_score,
  })) || [];

  const distData = Object.entries(stats?.category_distribution || {}).map(([k, v]) => ({
    name: CATEGORY_LABELS[k] || k,
    value: v,
    key: k,
  }));

  const dominantCategory = distData[0]?.key || "neutral";
  const avgRisk = stats?.avg_risk_score ?? 0;
  const totalEntries = stats?.total_entries ?? 0;
  const userName = user?.email?.split("@")[0] || "there";

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logoWrap}>
              <span className={styles.logoText}>MoodGuard</span>
            </div>
            <nav className={styles.nav}>
              <button className={`${styles.navItem} ${tab === "journal" ? styles.active : ""}`} onClick={() => setTab("journal")}>
                <PenLine size={11} /> Journal
              </button>
              <button className={`${styles.navItem} ${tab === "analytics" ? styles.active : ""}`} onClick={() => setTab("analytics")}>
                <BarChart2 size={11} /> Analytics
              </button>
            </nav>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.email}>{user?.email}</span>
            <button onClick={toggle} className={styles.iconBtn} title="Toggle theme">
              {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
            </button>
            <button onClick={() => exportPDF(entries || [], stats)} className={styles.iconBtn} title="Export PDF">
              <Download size={13} />
            </button>
            <button onClick={() => supabase.auth.signOut()} className={styles.iconBtn}>
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* WELCOME */}
        <p className={styles.welcome}>
          Welcome back, <span className={styles.welcomeAccent}>{userName}</span>
        </p>

        {/* TOP ROW */}
        <div className={styles.topRow}>
          <div className={styles.progCard}>
            <div className={styles.progRow}>
              <div>
                <div className={styles.progLabel}>Entries</div>
                <div className={styles.progTrack}>
                  <div className={styles.progFill} style={{ width: `${Math.min((totalEntries / 30) * 100, 95)}%` }}>
                    {totalEntries}
                  </div>
                </div>
              </div>
              <div>
                <div className={styles.progLabel}>Streak</div>
                <div className={styles.progTrack}>
                  <div className={styles.progFill} style={{ width: `${Math.min(((entries?.length ? 7 : 0) / 30) * 100, 95)}%` }}>
                    {entries?.length ? "7d" : "0d"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.outCard}>
            <div className={styles.outLabel}>Avg Risk Score</div>
            <div className={styles.outPill}>{avgRisk}%</div>
          </div>

          <div className={styles.bigStats}>
            <div className={styles.bsItem}>
              <div className={styles.bsIcon}>entries</div>
              <div className={styles.bsNum}>{totalEntries}</div>
              <div className={styles.bsLabel}>Total</div>
            </div>
            <div className={styles.bsDivider} />
            <div className={styles.bsItem}>
              <div className={styles.bsIcon}>streak</div>
              <div className={styles.bsNum}>{entries?.length ? 7 : 0}</div>
              <div className={styles.bsLabel}>Day streak</div>
            </div>
            <div className={styles.bsDivider} />
            <div className={styles.bsItem}>
              <div className={styles.bsIcon}>week</div>
              <div className={styles.bsNum}>{entries?.filter(e => {
                const d = new Date(e.created_at);
                const now = new Date();
                return (now - d) < 7 * 24 * 60 * 60 * 1000;
              }).length || 0}</div>
              <div className={styles.bsLabel}>This week</div>
            </div>
          </div>
        </div>

        {/* JOURNAL TAB */}
        {tab === "journal" && (
          <>
            <div className={styles.mainGrid}>
              {/* Profile card */}
              <div className={styles.profileCard}>
                <div className={styles.profileImg}>
                  <div className={styles.pFig}>
                    <div className={styles.pHead} />
                    <div className={styles.pBody} />
                  </div>
                </div>
                <div className={styles.profileInfo}>
                  <div className={styles.profileName}>{user?.email?.split("@")[0] || "User"}</div>
                  <div className={styles.profileRole}>MoodGuard User</div>
                  <div className={styles.profileBadge}>{avgRisk}% avg risk</div>
                </div>
              </div>

              {/* Mood progress */}
              <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Mood progress</span>
                  <div className={styles.cardLink}>↗</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className={styles.bigNumber}>
                    {entries?.length ? `${entries.length}` : "0"}
                  </span>
                  <div>
                    <div className={styles.subLabel}>entries</div>
                    <div className={styles.subLabel}>total</div>
                  </div>
                  {entries?.length > 0 && (
                    <div className={styles.yellowTag} style={{ marginLeft: "auto" }}>
                      +{entries.filter(e => (new Date() - new Date(e.created_at)) < 7 * 24 * 60 * 60 * 1000).length} this week
                    </div>
                  )}
                </div>
                <div className={styles.barsWrap}>
                  {DAYS.map((day, i) => {
                    const isToday = i === TODAY_DAY;
                    const hasEntry = entries?.some(e => new Date(e.created_at).getDay() === i);
                    return (
                      <div key={i} className={styles.barCol}>
                        <div
                          className={`${styles.bar} ${isToday ? styles.barYellow : styles.barGray}`}
                          style={{ height: `${hasEntry ? 60 + Math.random() * 40 : 20 + Math.random() * 40}%` }}
                        />
                        <div className={isToday ? styles.barLabelActive : styles.barLabel}>{day}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk tracker */}
              <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Risk tracker</span>
                  <div className={styles.cardLink}>↗</div>
                </div>
                <div className={styles.ringWrap}>
                  <div className={styles.ring}>
                    <span className={styles.ringVal}>{avgRisk}%</span>
                  </div>
                </div>
                <div className={styles.ringSub}>Average risk<br />this month</div>
                <div className={styles.ctrlRow}>
                  <div className={styles.ctrlBtn}>▶</div>
                  <div className={styles.ctrlBtn}>⏸</div>
                  <div className={`${styles.ctrlBtn} ${styles.active}`}>⏱</div>
                </div>
              </div>

              {/* Mood balance + journal entries */}
              <div className={styles.glassCard} style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className={styles.cardTitle}>Mood balance</span>
                  <span className={styles.balancePct}>{distData[0] ? Math.round((distData[0].value / totalEntries) * 100) : 0}%</span>
                </div>
                <div className={styles.obBars}>
                  <div className={`${styles.obBar} ${styles.obYellow}`} style={{ flex: 3 }}>positive</div>
                  <div className={`${styles.obBar} ${styles.obDark}`} style={{ flex: 2 }}>anxiety</div>
                  <div className={`${styles.obBar} ${styles.obLight}`} style={{ flex: 1 }}>low</div>
                </div>
                <div className={styles.taskList}>
                  <div className={styles.taskHeader}>
                    <span className={styles.taskTitle}>JOURNAL LOG</span>
                    <span className={styles.taskCount}>{entries?.length || 0}/{Math.max(entries?.length || 0, 8)}</span>
                  </div>
                  {entriesLoading ? (
                    <div style={{ padding: "8px 0" }}>
                      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 28, marginBottom: 4 }} />)}
                    </div>
                  ) : entries?.length === 0 ? (
                    <div className={styles.empty} style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>No entries yet</div>
                  ) : (
                    entries?.slice(0, 4).map((entry, i) => (
                      <div key={entry.id} className={styles.taskRow}>
                        <div className={`${styles.taskIcon} ${i === 0 ? styles.taskIconHL : ""}`}>✎</div>
                        <div style={{ flex: 1 }}>
                          <div className={styles.taskName}>{entry.text.slice(0, 28)}{entry.text.length > 28 ? "..." : ""}</div>
                          <div className={styles.taskDate}>{format(new Date(entry.created_at), "MMM d, HH:mm")}</div>
                        </div>
                        {i < 2 ? (
                          <div className={styles.checkDone}>✓</div>
                        ) : (
                          <div className={styles.checkTodo} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div className={styles.bottomRow}>
              {/* Sidebar */}
              <div className={styles.sidebar}>
                <div className={styles.sideTitle}>Mood Tools</div>
                <div className={styles.sideRow}>
                  <span className={styles.sideLabel}>Wellness tips</span>
                  <span className={styles.sideArrow}>∨</span>
                </div>
                <div className={styles.deviceRow}>
                  <div className={styles.deviceIcon}>AI</div>
                  <div>
                    <div className={styles.deviceName}>MoodGuard AI</div>
                    <div className={styles.deviceSub}>Llama 3.1 powered</div>
                  </div>
                </div>
                <div className={styles.sideRow}>
                  <span className={styles.sideLabel}>PDF Export</span>
                  <span className={styles.sideArrow}>∨</span>
                </div>
                <div className={styles.sideRow}>
                  <span className={styles.sideLabel}>Streak tracker</span>
                  <span className={styles.sideArrow}>∧</span>
                </div>
              </div>

              {/* Journal input */}
              <div className={styles.calCard}>
                <div className={styles.calHeader}>
                  <span className={styles.calMonthMuted}>New entry</span>
                  <span className={styles.calMonthActive}>{format(new Date(), "MMMM d, yyyy")}</span>
                  <span className={styles.calMonthMuted}>{text.length}/512</span>
                </div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, 512))}
                  placeholder="How are you feeling today? Write freely..."
                  rows={5}
                  style={{
                    width: "100%", border: "none", outline: "none", resize: "none",
                    fontFamily: "'Syne', sans-serif", fontSize: 14,
                    color: "var(--text)", background: "transparent", lineHeight: 1.7,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, borderTop: "1px solid var(--divider)", paddingTop: 10 }}>
                  <button
                    onClick={() => submitMutation.mutate(text)}
                    disabled={!text.trim() || submitMutation.isPending}
                    style={{
                      padding: "8px 20px", background: "#1e1606", color: "var(--yellow)",
                      border: "none", borderRadius: 12, fontSize: 11, fontFamily: "'Syne', sans-serif",
                      fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", opacity: (!text.trim() || submitMutation.isPending) ? 0.4 : 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {submitMutation.isPending ? "Analyzing..." : "Analyze entry →"}
                  </button>
                </div>

                {/* Result */}
                {lastResult && (
                  <div className={styles.resultCard} style={{ marginTop: 14 }}>
                    <div className={styles.resultHeader}>
                      <p className={styles.resultLabel}>Analysis result</p>
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

                {/* Wellness tip */}
                {entries?.length > 0 && <div style={{ marginTop: 12 }}><WellnessTips category={dominantCategory} /></div>}
              </div>

              {/* Right col */}
              <div className={styles.rightCol}>
                <div className={styles.todayCard}>
                  <div className={styles.todayLabel}>TODAY'S MOOD</div>
                  <div className={styles.todayMood}>{CATEGORY_LABELS[entries?.[0]?.mental_health_category] || "—"}</div>
                  <div className={styles.todayRisk}>Risk score: {entries?.[0]?.risk_score || 0}%</div>
                  <button className={styles.todayBtn} onClick={() => document.querySelector("textarea")?.focus()}>
                    Write new entry →
                  </button>
                </div>
                <div className={styles.entriesCard}>
                  <div className={styles.entriesTitle}>LAST 3 ENTRIES</div>
                  {entriesLoading ? (
                    [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 18, marginBottom: 6 }} />)
                  ) : entries?.slice(0, 3).map(entry => (
                    <div key={entry.id} className={styles.entryRow}>
                      <div className={styles.entryDot} style={{ background: CATEGORY_COLORS[entry.mental_health_category] || "#94a3b8" }} />
                      <div className={styles.entryLabel}>{CATEGORY_LABELS[entry.mental_health_category]}</div>
                      <div className={styles.entryScore}>{entry.risk_score}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ANALYTICS TAB */}
        {tab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className={styles.analyticsGrid}>
              {[
                { label: "Total entries", value: totalEntries, unit: "" },
                { label: "Avg risk score", value: avgRisk, unit: "%" },
                { label: "Dominant mood", value: distData[0]?.name || "—", unit: "", small: true },
                { label: "Days journaled", value: [...new Set((entries || []).map(e => format(new Date(e.created_at), "yyyy-MM-dd")))].length, unit: "" },
              ].map(({ label, value, unit, small }) => (
                <div key={label} className={styles.analyticsCard}>
                  <div className={styles.analyticsLabel}>{label}</div>
                  <div className={styles.analyticsValue} style={small ? { fontSize: 20 } : {}}>
                    {value}{unit && <small>{unit}</small>}
                  </div>
                </div>
              ))}
            </div>

            {timelineData.length > 1 && (
              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Risk score over time</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={timelineData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text3)", fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--glass-light)", border: "1px solid var(--glass-border)", borderRadius: 10, fontSize: 11, backdropFilter: "blur(14px)" }} formatter={v => [`${v}%`, "Risk"]} />
                      <Line type="monotone" dataKey="risk" stroke="#f5c842" strokeWidth={2} dot={{ fill: "#f5c842", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Mood distribution</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={distData} barSize={24}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text3)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--glass-light)", border: "1px solid var(--glass-border)", borderRadius: 10, fontSize: 11, backdropFilter: "blur(14px)" }} />
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {distData.map(d => <Cell key={d.key} fill={CATEGORY_COLORS[d.key] || "#c8b888"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <MoodCalendar entries={entries || []} />
            <StreakTracker entries={entries || []} />
          </div>
        )}
      </div>

      <button className={styles.chatFab} onClick={() => setShowChat(true)}>
        <MessageCircle size={18} />
      </button>

      {showChat && (
        <MoodChat
          onClose={() => setShowChat(false)}
          lastCategory={dominantCategory}
          entries={entries || []}
          lastEntry={entries?.[0] || null}
        />
      )}
    </div>
  );
}