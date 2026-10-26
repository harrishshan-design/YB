import Papa from "papaparse";
import type { WorkspaceData, ProgrammeItem } from "./types";
export function downloadFile(
  name: string,
  content: Blob | string,
  type = "text/plain",
) {
  const blob =
    typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  const safe = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "string" && /^[=+\-@\t\r]/.test(value)
          ? `'${value}`
          : value,
      ]),
    ),
  );
  downloadFile(name, Papa.unparse(safe), "text/csv;charset=utf-8");
}
export type ReportText = {
  overview: string;
  objectives: string;
  activities: string;
  outcomes: string;
  challenges: string;
  recommendations: string;
  preparedBy: string;
  approvedBy: string;
};
export function defaultReport(
  data: WorkspaceData,
  p: ProgrammeItem,
): ReportText {
  return {
    overview: p.description,
    objectives: p.objective || "Record the programme objectives.",
    activities: p.description,
    outcomes: p.outcomes || "Add your programme outcomes.",
    challenges: p.challenges || "No challenges recorded.",
    recommendations:
      p.recommendations || "Add recommendations for future programmes.",
    preparedBy: data.members[0]?.name ?? "",
    approvedBy: "Pending approval",
  };
}
async function bitmap(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Image unavailable");
  const blob = await response.blob();
  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return {
    data: canvas.toDataURL("image/jpeg", 0.85),
    width: img.width,
    height: img.height,
  };
}
export async function programmePdf(
  data: WorkspaceData,
  p: ProgrammeItem,
  report: ReportText,
  save = true,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = 24;
  const paragraph = (heading: string, body: string) => {
    if (y > 245) {
      pdf.addPage();
      y = 24;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(28, 89, 69);
    pdf.text(heading, 20, y);
    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(50, 64, 58);
    const lines = pdf.splitTextToSize(body || "Not recorded.", 170) as string[];
    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = 24;
      }
      pdf.text(line, 20, y);
      y += 5;
    }
    y += 7;
  };
  pdf.setFillColor(23, 72, 57);
  pdf.rect(0, 0, 210, 5, "F");
  pdf.setFontSize(12);
  pdf.setTextColor(23, 72, 57);
  pdf.text(data.club.name, 20, y);
  y += 13;
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("Official Programme Report", 20, y);
  y += 12;
  pdf.setFontSize(15);
  const title = pdf.splitTextToSize(p.title, 170) as string[];
  pdf.text(title, 20, y);
  y += title.length * 7 + 9;
  if (data.club.logo) {
    try {
      const logo = await bitmap(data.club.logo);
      pdf.addImage(
        logo.data,
        "JPEG",
        164,
        14,
        24,
        (24 * logo.height) / logo.width,
      );
    } catch {}
  }
  const volunteers = data.volunteerEntries.filter(
    (v) => v.programmeId === p.id,
  );
  const hours = volunteers.reduce((n, v) => n + v.hours, 0);
  const stats = Object.entries(
    p.attendance.reduce(
      (out, a) => {
        const category =
          data.members.find((m) => m.id === a.userId)?.category ??
          "Participant";
        out[category] = (out[category] ?? 0) + 1;
        return out;
      },
      {} as Record<string, number>,
    ),
  )
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  paragraph("01  Programme Overview", report.overview);
  paragraph("02  Objectives", report.objectives);
  paragraph(
    "03  Programme Details",
    `${p.title}\nDate: ${new Date(p.startsAt).toLocaleString("en-MY")}\nLocation: ${p.location}\nOrganiser: ${data.club.name}`,
  );
  paragraph(
    "04  Attendance",
    `Registered: ${p.registrationIds.length}\nAttended: ${p.attendance.length}\nAttendance rate: ${p.registrationIds.length ? Math.round((p.attendance.length / p.registrationIds.length) * 100) : 0}%`,
  );
  paragraph("05  Participant Statistics", stats);
  paragraph("06  Activities Conducted", report.activities);
  paragraph(
    "07  Volunteer Contribution",
    `${new Set(volunteers.map((v) => v.userId)).size} volunteer(s) contributed ${hours} hours.\n${volunteers.map((v) => `${data.members.find((m) => m.id === v.userId)?.name ?? "Volunteer"}: ${v.hours} hours - ${v.description}`).join("\n")}`,
  );
  paragraph("08  Outcomes", report.outcomes);
  paragraph("09  Expenses", `RM ${p.expenses.toFixed(2)}`);
  paragraph("10  Challenges", report.challenges);
  paragraph("11  Recommendations", report.recommendations);
  paragraph(
    "12  Photo Documentation",
    p.photos.length
      ? `${p.photos.length} programme photographs attached.`
      : "No photographs attached.",
  );
  for (const photo of p.photos) {
    try {
      const img = await bitmap(photo);
      const width = Math.min(170, (105 * img.width) / img.height);
      const height = (width * img.height) / img.width;
      if (y + height > 268) {
        pdf.addPage();
        y = 24;
      }
      pdf.addImage(img.data, "JPEG", 20 + (170 - width) / 2, y, width, height);
      y += height + 10;
    } catch {
      paragraph(
        "Photo unavailable",
        "The attached photo could not be included.",
      );
    }
  }
  paragraph("13  Prepared By", report.preparedBy);
  paragraph("14  Approved By", report.approvedBy);
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 114);
    pdf.text(`${data.club.name} | Prepared with YBNGO`, 20, 286);
    pdf.text(`${i} / ${count}`, 180, 286);
  }
  if (save) pdf.save(`${p.title.replace(/[^a-z0-9]+/gi, "-")}-report.pdf`);
  return pdf;
}

export async function volunteerCertificate(
  data: WorkspaceData,
  userId: string,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const person = data.members.find((m) => m.id === userId);
  if (!person) throw new Error("Volunteer not found.");
  const hours = data.volunteerEntries
    .filter((e) => e.userId === userId)
    .reduce((n, e) => n + e.hours, 0);
  pdf.setDrawColor(166, 192, 174);
  pdf.rect(13, 13, 271, 184);
  pdf.setDrawColor(31, 88, 65);
  pdf.rect(16, 16, 265, 178);
  pdf.setTextColor(31, 88, 65);
  pdf.setFontSize(14);
  pdf.text(data.club.name, 148.5, 40, { align: "center" });
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.text("Certificate of Appreciation", 148.5, 66, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(90, 106, 93);
  pdf.setFontSize(12);
  pdf.text("Presented with gratitude to", 148.5, 86, { align: "center" });
  pdf.setTextColor(31, 88, 65);
  pdf.setFontSize(27);
  pdf.text(person.name, 148.5, 105, { align: "center" });
  pdf.setTextColor(90, 106, 93);
  pdf.setFontSize(12);
  pdf.text(
    `For contributing ${hours} volunteer hours to our community.`,
    148.5,
    124,
    { align: "center" },
  );
  pdf.text(
    "Your time and care have made a meaningful difference.",
    148.5,
    134,
    { align: "center" },
  );
  pdf.setFontSize(10);
  pdf.text(`Issued: ${new Date().toLocaleDateString("en-MY")}`, 40, 172);
  pdf.text("Authorised organisation representative", 195, 172, {
    align: "center",
  });
  pdf.line(164, 164, 249, 164);
  pdf.save(
    `${person.name.replace(/[^a-z0-9]+/gi, "-")}-volunteer-certificate.pdf`,
  );
}
