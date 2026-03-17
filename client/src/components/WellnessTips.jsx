import styles from "./WellnessTips.module.css";

const TIPS = {
  depression: [
    "Try a 10-minute walk outside — sunlight and movement lift mood naturally.",
    "Reach out to one person you trust today, even just a short message.",
    "Write down 3 small things you're grateful for right now.",
    "Listen to music that has helped you feel better in the past.",
  ],
  anxiety: [
    "Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s.",
    "Ground yourself: name 5 things you see, 4 you hear, 3 you can touch.",
    "Limit caffeine today — it can amplify anxious feelings.",
    "Write down your worries then close the notebook — give yourself permission to stop.",
  ],
  stress: [
    "Take a 5-minute break every hour — even just standing up helps.",
    "Prioritize your top 3 tasks today and ignore the rest.",
    "Progressive muscle relaxation: tense and release each muscle group.",
    "A short nap (20 min) can reset your stress levels significantly.",
  ],
  positive: [
    "Great mood! Use this energy to tackle something you've been avoiding.",
    "Share your positive energy — reach out to a friend or family member.",
    "Journal about what's going well so you can revisit it on harder days.",
    "This is a great time to set goals or start something new.",
  ],
  neutral: [
    "A balanced state is healthy — use it for focused, calm work.",
    "Try something new today — novelty boosts mood naturally.",
    "Check in with your body: are you hydrated and well-rested?",
    "A short meditation can deepen your sense of calm.",
  ],
};

export default function WellnessTips({ category }) {
  const tips = TIPS[category] || TIPS.neutral;
  const tip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>💡</span>
        <p className={styles.title}>Wellness tip for you</p>
      </div>
      <p className={styles.tip}>{tip}</p>
    </div>
  );
}