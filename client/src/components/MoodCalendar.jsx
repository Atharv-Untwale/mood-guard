import { useMemo } from "react";
import { format, eachDayOfInterval, subDays, startOfDay } from "date-fns";
import styles from "./MoodCalendar.module.css";

const COLORS = {
  depression: "#94a3b8",
  anxiety: "#fbbf24",
  stress: "#f87171",
  positive: "#86efac",
  neutral: "#cbd5e1",
};

export default function MoodCalendar({ entries = [] }) {
  const days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 62);
    return eachDayOfInterval({ start, end });
  }, []);

  const entryMap = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const day = format(new Date(e.created_at), "yyyy-MM-dd");
      if (!map[day] || e.risk_score > map[day].risk_score) {
        map[day] = e;
      }
    });
    return map;
  }, [entries]);

  return (
    <div className={styles.card}>
      <p className={styles.title}>Mood calendar <span className={styles.sub}>last 9 weeks</span></p>
      <div className={styles.grid}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const entry = entryMap[key];
          const color = entry ? COLORS[entry.mental_health_category] || "#cbd5e1" : "var(--bg3)";
          return (
            <div
              key={key}
              className={styles.cell}
              style={{ background: color }}
              title={entry ? `${key}: ${entry.mental_health_category} (${entry.risk_score}%)` : key}
            />
          );
        })}
      </div>
      <div className={styles.legend}>
        {Object.entries(COLORS).map(([k, c]) => (
          <div key={k} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: c }} />
            <span>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}