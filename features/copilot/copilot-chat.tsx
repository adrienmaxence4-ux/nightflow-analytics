"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { askCopilot } from "@/services/copilot.service";

const SUGGESTIONS = [
  "Pourquoi mes ventes ont baissé ?",
  "Comment améliorer ma conversion mobile ?",
  "Où investir mon budget pub ?",
  "Quels produits sont à risque de rupture ?",
];

interface Msg {
  role: "user" | "ai";
  text: string;
}

export function CopilotChat({ className }: { className?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "Bonjour Adrien 🌙 Je suis votre directeur e-commerce IA. Posez-moi une question sur MoonStore, ou cliquez une suggestion ci-dessous.",
    },
  ]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setQ("");
    setBusy(true);
    const answer = await askCopilot(text);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: answer }]);
      setBusy(false);
    }, 600);
  };

  return (
    <Card className={`flex max-h-[640px] flex-col overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b border-glass-border px-5 py-4 [background:linear-gradient(110deg,rgba(154,107,255,0.2),rgba(61,242,255,0.1))]">
        <span className="relative grid h-10 w-10 flex-none animate-spinslow place-items-center rounded-full shadow-glow [background:conic-gradient(from_0deg,#3df2ff,#ff5cae,#9a6bff,#3df2ff)]">
          <span className="absolute inset-[5px] rounded-full bg-night-900" />
          <Sparkles className="relative z-10 h-4 w-4 text-white" />
        </span>
        <div>
          <h3 className="text-[15px] font-extrabold">Nightflow Copilot</h3>
          <p className="text-[11px] font-semibold text-neon-cyansoft">
            En ligne · répond en français
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950"
                  : "border border-glass-border bg-glass-2 text-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-glass-border bg-glass-2 px-3.5 py-2.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-pulsedot rounded-full bg-neon-cyan"
                    style={{ animationDelay: `${d * 0.2}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-glass-border px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.slice(0, 2).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-ink-dim transition hover:border-neon-cyan hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass py-1.5 pl-3.5 pr-1.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(q)}
            placeholder="Posez votre question…"
            className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-mut"
          />
          <button
            onClick={() => send(q)}
            disabled={busy}
            className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 transition hover:brightness-110 disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
