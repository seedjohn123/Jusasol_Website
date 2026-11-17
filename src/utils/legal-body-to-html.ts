function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Zamienia adresy e-mail w tekscie na linki mailto.
 * Why: tresci prawne (polityka, regulamin) zawieraja {{COMPANY_EMAIL}},
 * a escapeHtml nie moze zamienic maila na link samodzielnie — inaczej adres
 * zostaje golym tekstem, zamiast klikalnym odnosnikiem.
 */
function linkifyEmails(text: string): string {
  return text.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match) => `<a href="mailto:${match}">${match}</a>`,
  );
}

function inline(text: string): string {
  return linkifyEmails(escapeHtml(text))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`(\/[^`]+)`/g, '<a href="$1">$1</a>');
}

function renderBlocks(text: string): string {
  let html = "";
  for (const block of text.split(/\n\n+/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length || lines[0] === "---") continue;
    if (lines[0].startsWith("### ")) {
      html += `<h3>${inline(lines[0].slice(4))}</h3>`;
      const rest = lines.slice(1);
      if (rest.length) html += renderLines(rest);
      continue;
    }
    html += renderLines(lines);
  }
  return html;
}

function renderLines(lines: string[]): string {
  if (lines.every((line) => line.startsWith("- "))) {
    return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
  }
  return `<p>${lines.map((line) => inline(line)).join("<br />")}</p>`;
}

/**
 * Turns simple legal document text into HTML: intro paragraphs, then blocks
 * starting with "## " become h2 + following paragraph(s). Matches Keystatic/mdoc style.
 */
export function legalBodyToHtml(md: string): string {
  const chunks = md.trim().split(/\n(?=## (?!#))/);
  let html = "";
  for (const chunk of chunks) {
    const t = chunk.trim();
    if (!t) continue;
    if (t.startsWith("## ")) {
      const nl = t.indexOf("\n");
      const heading = (nl === -1 ? t.slice(3) : t.slice(3, nl)).trim();
      const rest = nl === -1 ? "" : t.slice(nl + 1).trim();
      const id = slugifyHeading(heading);
      html += `<section id="${escapeHtml(id)}"><h2>${inline(heading)}</h2>`;
      if (rest) html += renderBlocks(rest);
      html += `</section>`;
    } else {
      html += renderBlocks(t);
    }
  }
  return html;
}

function slugifyHeading(heading: string): string {
  return heading
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}
