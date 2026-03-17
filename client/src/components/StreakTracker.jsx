import { useMemo } from "react";
import { format, subDays, differenceInDays } from "date-fns";
import styles from "./StreakTracker.module.css";

export default function StreakTracker({ entries = [] }) {
  const { currentStreak, longestStreak, totalDays } = useMemo(() => {
    if (!entries.length) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };

    const days = [...new Set(entries.map((e) => format(new Date(e.created_at), "yyyy-MM-dd")))].sort().reverse();

    let current = 0;
    let longest = 0;
    let temp = 1;
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    if (days[0] === today || days[0] === yesterday) {
      current = 1;
      for (let i = 1; i < days.length; i++) {
        const diff = differenceInDays(new Date(days[i - 1]), new Date(days[i]));
        if (diff === 1) current++;
        else break;
      }
    }

    for (let i = 1; i < days.length; i++) {
      const diff = differenceInDays(new Date(days[i - 1]), new Date(days[i]));
      if (diff === 1) temp++;
      else { longest = Math.max(longest, temp); temp = 1; }
    }
    longest = Math.max(longest, temp);

    return { currentStreak: current, longestStreak: longest, totalDays: days.length };
  }, [entries]);

  return (
    <div className={styles.card}>
      <p className={styles.title}>Streak tracker</p>
      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.emoji}>🔥</span>
          <span className={styles.value}>{currentStreak}</span>
          <span className={styles.label}>Current streak</span>
        </div>
        <div className={styles.item}>
          <span className={styles.emoji}>🏆</span>
          <span className={styles.value}>{longestStreak}</span>
          <span className={styles.label}>Longest streak</span>
        </div>
        <div className={styles.item}>
          <span className={styles.emoji}>📅</span>
          <span className={styles.value}>{totalDays}</span>
          <span className={styles.label}>Days journaled</span>
        </div>
      </div>
    </div>
  );
}