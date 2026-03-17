export async function exportPDF(entries, stats) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const green = [90, 130, 90];
  const gray = [100, 100, 100];
  const light = [240, 237, 232];

  // Header
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MoodGuard", 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Mental Wellness Report", 14, 21);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 21);

  // Stats
  doc.setTextColor(...gray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY", 14, 38);

  doc.setFillColor(...light);
  doc.roundedRect(14, 42, 55, 22, 3, 3, "F");
  doc.roundedRect(77, 42, 55, 22, 3, 3, "F");
  doc.roundedRect(140, 42, 55, 22, 3, 3, "F");

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Total Entries", 18, 49);
  doc.text("Avg. Risk Score", 81, 49);
  doc.text("Dominant State", 144, 49);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...green);
  doc.text(String(stats?.total_entries ?? 0), 18, 59);
  doc.text(`${stats?.avg_risk_score ?? 0}%`, 81, 59);
  doc.text(String(Object.keys(stats?.category_distribution || {})[0] ?? "—"), 144, 59);

  // Entries
  doc.setTextColor(...gray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RECENT ENTRIES", 14, 76);

  let y = 82;
  const maxEntries = Math.min(entries.length, 15);

  for (let i = 0; i < maxEntries; i++) {
    const entry = entries[i];
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(...light);
    doc.roundedRect(14, y, 182, 28, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...green);
    doc.text(entry.mental_health_category?.toUpperCase() || "—", 18, y + 7);

    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.text(
      new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      100, y + 7
    );
    doc.text(`Risk: ${entry.risk_score}%`, 165, y + 7);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    const text = entry.text.length > 120 ? entry.text.slice(0, 120) + "..." : entry.text;
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines[0], 18, y + 16);
    if (lines[1]) doc.text(lines[1], 18, y + 22);

    y += 33;
  }

  doc.save("moodguard-report.pdf");
}