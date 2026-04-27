export function makeFilename(name: string, ext: string): string {
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}_${String(now.getMonth() + 1).padStart(2, "0")}_${now.getFullYear()}`;
  const time = `${String(now.getHours()).padStart(2, "0")}_${String(now.getMinutes()).padStart(2, "0")}`;
  const clean = name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${clean}-${date}-${time}.${ext}`;
}

export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string
) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const v = row[h];
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
