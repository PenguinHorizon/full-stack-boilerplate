/*
 * Page bodies (About, Privacy, Terms) use a deliberately small text format
 * (ADR-020) that renders without HTML injection:
 *
 *   ## Heading / ### Subheading
 *   Paragraphs separated by a blank line
 *   - bullet lists
 *   **bold** and [links](https://…) (https, mailto and tel only)
 *
 * Anything else is shown as plain text.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string };

export type Block =
  | { kind: "h2" | "h3"; text: string }
  | { kind: "p"; inlines: Inline[] }
  | { kind: "ul"; items: Inline[][] };

const SAFE_LINK = /^(https:\/\/|mailto:|tel:)/i;
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) result.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) {
      result.push({ kind: "bold", text: match[1] });
    } else if (match[2] !== undefined && match[3] !== undefined) {
      result.push(
        SAFE_LINK.test(match[3])
          ? { kind: "link", text: match[2], href: match[3] }
          : { kind: "text", text: match[0] },
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) result.push({ kind: "text", text: text.slice(last) });
  return result;
}

export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];
  const chunks = source.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((line) => line.trimEnd());
    const text = lines.join(" ").trim();
    if (!text) continue;
    if (lines.length === 1 && /^###\s+/.test(lines[0]!)) {
      blocks.push({ kind: "h3", text: lines[0]!.replace(/^###\s+/, "").trim() });
    } else if (lines.length === 1 && /^##\s+/.test(lines[0]!)) {
      blocks.push({ kind: "h2", text: lines[0]!.replace(/^##\s+/, "").trim() });
    } else if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
      blocks.push({
        kind: "ul",
        items: lines.map((line) => parseInline(line.trim().replace(/^[-*]\s+/, ""))),
      });
    } else {
      blocks.push({ kind: "p", inlines: parseInline(text) });
    }
  }
  return blocks;
}

/** Plain text for meta descriptions: the first paragraph, trimmed. */
export function firstParagraph(source: string, max = 160): string {
  const paragraph = parseRichText(source).find((block) => block.kind === "p");
  if (!paragraph || paragraph.kind !== "p") return "";
  const text = paragraph.inlines.map((inline) => inline.text).join("");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
