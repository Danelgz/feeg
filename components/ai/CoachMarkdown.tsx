import type { ReactNode } from "react";
import { getTokens } from "../../lib/tokens";

interface CoachMarkdownProps {
  content: string;
  isDark: boolean;
}

/**
 * Markdown mínimo para las respuestas del Coach: títulos (##/###), listas con viñeta y numeradas,
 * **negrita**, *cursiva* y `código`. El modelo tiene instrucciones de no usar más que esto, y un
 * subconjunto propio evita meter una librería de markdown (y su superficie de HTML) por cuatro
 * reglas. Lo que no reconoce se enseña como texto tal cual, nunca como HTML.
 */
export default function CoachMarkdown({ content, isDark }: CoachMarkdownProps) {
  const tk = getTokens(isDark);
  const lines = String(content || "").split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = (key: string) => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key} style={{ margin: "2px 0 8px", paddingLeft: list.ordered ? 20 : 0, listStyle: list.ordered ? "decimal" : "none", display: "grid", gap: 5 }}>
        {list.items.map((item, i) => (
          <li key={i} style={{ display: list!.ordered ? "list-item" : "flex", gap: 9, paddingLeft: list!.ordered ? 2 : 0 }}>
            {!list!.ordered && <span aria-hidden style={{ width: 5, height: 5, borderRadius: 9, background: tk.accent, marginTop: "0.6em", flexShrink: 0 }} />}
            <span style={{ minWidth: 0 }}>{inline(item, tk)}</span>
          </li>
        ))}
      </Tag>
    );
    list = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const heading = line.match(/^\s*#{1,4}\s+(.+)$/);

    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush(`l${i}`);
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      return;
    }
    flush(`l${i}`);
    if (heading) {
      blocks.push(
        <div key={i} style={{ fontSize: "0.98rem", fontWeight: 800, color: tk.text, margin: blocks.length ? "12px 0 4px" : "0 0 4px", letterSpacing: "-0.01em" }}>
          {inline(heading[1].replace(/\*\*/g, ""), tk)}
        </div>
      );
    } else if (line.trim() === "") {
      if (blocks.length) blocks.push(<div key={i} style={{ height: 6 }} />);
    } else {
      blocks.push(
        <p key={i} style={{ margin: "0 0 4px" }}>
          {inline(line, tk)}
        </p>
      );
    }
  });
  flush("end");

  return <div style={{ fontSize: "0.92rem", lineHeight: 1.55, color: tk.text, overflowWrap: "anywhere" }}>{blocks}</div>;
}

function inline(text: string, tk: ReturnType<typeof getTokens>): ReactNode[] {
  return text.split(/(\*\*[^*\n]+?\*\*|`[^`\n]+`|\*[^*\n]+?\*|_[^_\n]+?_)/g).map((part, i) => {
    if (/^\*\*.+\*\*$/.test(part)) return <strong key={i} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
    if (/^`.+`$/.test(part))
      return (
        <code key={i} style={{ fontSize: "0.85em", padding: "1px 5px", borderRadius: 5, background: tk.hairline }}>
          {part.slice(1, -1)}
        </code>
      );
    if (/^(\*|_).+(\*|_)$/.test(part) && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}
