"use client";

import { useEffect, useState } from "react";
import { Send, Sparkles, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RichText } from "@/components/ui/rich-text";
import { ApplySheet } from "@/features/actions/apply-sheet";
import { askCopilot } from "@/services/copilot.service";
import type { SuggestedAction } from "@/types";

const SUGGESTIONS = [
  "Pourquoi mes ventes ont baissé ?",
  "Comment améliorer ma conversion mobile ?",
  "Où investir mon budget pub ?",
  "Quels produits sont à risque de rupture ?",
];

/** Builds questions tied to the user's real store (products + situation). */
function contextualSuggestions(
  products: { name: string; sales: number; stock: number }[]
): string[] {
  if (!products.length) return SUGGESTIONS;
  const out: string[] = [];
  const noSales = products.every((p) => p.sales === 0);
  const lowStock = products.find((p) => p.stock > 0 && p.stock <= 20);
  if (noSales) out.push("Pourquoi mes produits ne convertissent pas ?");
  out.push(`Comment vendre plus de ${products[0].name} ?`);
  out.push("Quelles sont mes priorités cette semaine ?");
  if (lowStock) out.push(`Faut-il réapprovisionner le ${lowStock.name} ?`);
  out.push("Où investir mon budget marketing ?");
  return out.slice(0, 4);
}

interface Msg {
  role: "user" | "ai";
  text: string;
  /**
   * True when the answer came from the keyword fallback rather than a model.
   * A canned answer reads exactly like a real one, so it is labelled: an
   * unmarked fallback is how a mocked Copilot goes unnoticed.
   */
  fallback?: boolean;
  /**
   * Present when the server matched the answer to something Nightflow can
   * execute. Already resolved against the real catalogue — the model's raw
   * proposal never reaches this far.
   */
  action?: SuggestedAction | null;
}

export function CopilotChat({ className }: { className?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "Bonjour Adrien. Je suis votre directeur e-commerce IA. Posez-moi une question sur MoonStore, ou cliquez une suggestion ci-dessous.",
    },
  ]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS);
  // Returned by the API on the first exchange; sending it back keeps the whole
  // thread in one conversation instead of starting a new one per question.
  const [convId, setConvId] = useState<string | null>(null);
  // The action whose confirmation sheet is open, if any.
  const [pending, setPending] = useState<SuggestedAction | null>(null);

  // Tailor the suggested questions to the user's real products.
  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { products?: { name: string; sales: number; stock: number }[] } | null) => {
        if (alive && j?.products?.length) {
          setSuggestions(contextualSuggestions(j.products));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Asks the real Copilot, which reasons over this store's own products,
   * campaigns, daily metrics and Instagram posts.
   *
   * `askCopilot` stays as the fallback and nothing more. It answers from
   * keywords with no knowledge of the store, so it is what a broken network
   * degrades to — never the normal path. Wiring the chat straight to it was
   * the reason a question about Instagram came back talking about Klaviyo.
   *
   * Quota and rate-limit replies arrive as a normal `answer`, so the body is
   * read whatever the status: those messages are the point, not an error to
   * swallow.
   */
  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setQ("");
    setBusy(true);

    let answer = "";
    // Quota and rate-limit replies are real messages, not fallbacks, so only
    // "mock" earns the label.
    let fallback = false;
    let action: SuggestedAction | null = null;
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, conversationId: convId }),
      });
      const data = (await res.json().catch(() => null)) as {
        answer?: string;
        source?: string;
        action?: SuggestedAction | null;
        conversationId?: string | null;
      } | null;
      if (data?.conversationId) setConvId(data.conversationId);
      if (typeof data?.answer === "string") answer = data.answer.trim();
      fallback = data?.source === "mock";
      action = data?.action ?? null;
    } catch {
      /* offline or route down — fall through to the deterministic answer */
    }

    if (!answer) {
      answer = await askCopilot(text);
      fallback = true;
    }
    setMessages((m) => [...m, { role: "ai", text: answer, fallback, action }]);
    setBusy(false);
  };

  return (
    <Card className={`flex max-h-[640px] flex-col overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b border-line bg-panel2 px-5 py-4">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-accent">
          <Sparkles className="h-5 w-5 text-accent-ink" strokeWidth={2} />
        </span>
        <div>
          <h3 className="font-display text-[18px] font-extrabold">Copilote Nightflow</h3>
          <p className="text-[15px] font-semibold text-ink3">En ligne · répond en français</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-[14px] px-4 py-3 text-[17px] leading-relaxed ${
                m.role === "user"
                  ? "bg-accent text-accent-ink"
                  : "border border-line bg-panel2 text-ink"
              }`}
            >
              {m.role === "ai" ? <RichText>{m.text}</RichText> : m.text}
              {m.fallback && (
                <span className="mt-1.5 block text-[14px] font-bold text-warn">
                  Réponse hors-ligne — l&apos;IA n&apos;a pas répondu
                </span>
              )}
              {m.action && (
                <button
                  type="button"
                  onClick={() => setPending(m.action ?? null)}
                  className="mt-3 flex min-h-tap w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-3 text-[16px] font-bold text-accent-ink transition duration-base ease-out hover:brightness-95"
                >
                  <Zap className="h-3.5 w-3.5" aria-hidden />
                  {m.action.label}
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-[14px] border border-line bg-panel2 px-4 py-3 text-[16px] text-ink3">Analyse en cours…</div>
          </div>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-pill border border-line bg-panel2 px-3.5 py-2 text-[15px] text-ink2 transition hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-[12px] border border-line bg-panel2 py-1.5 pl-4 pr-1.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(q)}
            placeholder="Posez votre question…"
            className="flex-1 min-h-[44px] bg-transparent text-[17px] text-ink outline-none placeholder:text-ink3"
          />
          <button
            onClick={() => send(q)}
            disabled={busy}
            className="grid h-11 w-11 place-items-center rounded-[10px] bg-accent text-accent-ink transition hover:brightness-95 disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Confirmation, dry-run and undo all live in the sheet — the button
          above only opens it, so a click can never write on its own. */}
      <ApplySheet
        action={pending}
        sourceRef="copilot-chat"
        open={!!pending}
        onClose={() => setPending(null)}
      />
    </Card>
  );
}
