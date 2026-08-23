import type { ReactNode } from "react";

/**
 * Renders the small Markdown subset the Copilot actually emits: bold, italic,
 * inline code, and lists. Nothing else.
 *
 * Why not a Markdown library: the model writes into a chat bubble, not a
 * document. A full parser would bring headings, tables, images and raw HTML —
 * surface area this never needs, on text produced by a model. Everything here
 * builds React nodes, so there is no `dangerouslySetInnerHTML` and no path from
 * model output to executable markup.
 *
 * Unmatched syntax degrades to plain text rather than disappearing: a stray
 * asterisk should look like a typo, never swallow the sentence after it.
 */

/** Bold before italic — `**x**` must not be read as two italics. */
const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter((part) => part !== "")
    .map((part, i) => {
      const key = `${keyBase}-${i}`;
      if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={key} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={key} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={key}
            className="rounded bg-glass-2 px-1 py-0.5 text-[12px] text-neon-cyansoft"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={key}>{part}</span>;
    });
}

const BULLET = /^\s*[-•*]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;

interface Block {
  type: "p" | "li";
  marker?: string;
  text: string;
}

function toBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      blocks.push({ type: "li", marker: `${numbered[1]}.`, text: numbered[2] });
      continue;
    }
    // Checked after the numbered case: "*" opens a bullet only when it is
    // followed by a space, so "**Bold**" at the start of a line stays bold.
    const bullet = BULLET.exec(line);
    if (bullet && !line.startsWith("**")) {
      blocks.push({ type: "li", marker: "•", text: bullet[1] });
      continue;
    }
    blocks.push({ type: "p", text: line });
  }
  return blocks;
}

export function RichText({ children }: { children: string }) {
  const blocks = toBlocks(children);
  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) =>
        b.type === "li" ? (
          <div key={i} className="flex gap-2 pl-1">
            <span className="flex-none font-bold text-neon-cyansoft">
              {b.marker}
            </span>
            <span>{inline(b.text, `b${i}`)}</span>
          </div>
        ) : (
          <p key={i}>{inline(b.text, `b${i}`)}</p>
        )
      )}
    </div>
  );
}
