// Kodda kalan [DOLDURULACAK: …] yer tutucularını listeler (SPEC 13).
// Kullanım: npm run check:placeholders            → listeler, her zaman 0 ile çıkar
//           npm run check:placeholders -- --strict → yer tutucu varsa 1 ile çıkar (yayın öncesi)
// Not: Ayarlar ve Sayfalar veritabanına taşınınca (Faz 5) oradaki boş alanlar da eklenecek.
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIRS = ["src"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".md", ".json"]);
const PATTERN = /\[DOLDURULACAK:\s*([^\]]+)\]/g;

type Hit = { file: string; line: number; label: string };

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

const hits: Hit[] = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    // Dosyanın tamamında aranır: biçimlendirici yer tutucuyu iki satıra bölse de bulunur.
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(PATTERN)) {
      const line = content.slice(0, match.index).split("\n").length;
      const label = (match[1] ?? "").replace(/\s+/g, " ").trim();
      hits.push({ file: relative(ROOT, file), line, label });
    }
  }
}

if (hits.length === 0) {
  console.log("Kalan yer tutucu yok.");
} else {
  console.log(`Kalan yer tutucular (${hits.length}):\n`);
  for (const hit of hits) console.log(`  ${hit.file}:${hit.line}  ${hit.label}`);

  const counts = new Map<string, number>();
  for (const hit of hits) counts.set(hit.label, (counts.get(hit.label) ?? 0) + 1);
  console.log("\nBeklenen bilgiler:");
  for (const [label, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0], "tr"))) {
    console.log(`  - ${label}${count > 1 ? ` (${count} yerde)` : ""}`);
  }
}

if (process.argv.includes("--strict") && hits.length > 0) process.exitCode = 1;
