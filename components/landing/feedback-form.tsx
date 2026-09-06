"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { FEEDBACK_LIMITS } from "@/lib/feedback";

/**
 * Encart d'avis de la landing.
 *
 * Volontairement une section dans le flux de la page, et pas une pastille
 * flottante en bas à droite : le widget tiers qu'il remplace recouvrait la
 * démo, c'est-à-dire le principal levier de conversion de la page.
 *
 * La note seule suffit à envoyer — un clic, c'est tout. Le commentaire et le
 * prénom restent facultatifs, et aucun e-mail n'est demandé : plus on exige,
 * moins on récolte, et un avis n'a pas besoin d'être rattaché à quelqu'un.
 */

const ETOILES = [1, 2, 3, 4, 5] as const;

type Etat = "saisie" | "envoi" | "envoye" | "erreur";

export function FeedbackForm() {
  const [note, setNote] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [prenom, setPrenom] = useState("");
  const [etat, setEtat] = useState<Etat>("saisie");
  const [message, setMessage] = useState<string | null>(null);

  const envoyer = async () => {
    if (!note) {
      setMessage("Choisis une note pour envoyer.");
      return;
    }
    setEtat("envoi");
    setMessage(null);
    let vid: string | undefined;
    try {
      vid = localStorage.getItem("nf_vid") ?? undefined;
    } catch {
      /* stockage indisponible : la route retombe sur son seau commun */
    }
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: note,
          comment: commentaire || null,
          name: prenom || null,
          page: window.location.pathname,
          vid,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setEtat("erreur");
        setMessage(data.error ?? "Envoi impossible. Réessaie dans un instant.");
        return;
      }
      setEtat("envoye");
    } catch {
      setEtat("erreur");
      setMessage("Pas de réseau. Réessaie dans un instant.");
    }
  };

  // État final : on remercie et on s'efface. Reproposer le formulaire
  // inviterait à voter deux fois.
  if (etat === "envoye") {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-3 rounded-lg border border-line bg-panel px-8 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-pill bg-accent">
          <Check className="h-6 w-6 text-accent-ink" strokeWidth={3} aria-hidden />
        </span>
        <p className="font-display text-[24px] font-extrabold">Merci, c&apos;est noté.</p>
        <p className="text-[17px] leading-relaxed text-ink2">
          Je lis tout moi-même. C&apos;est ce qui décide de ce que je construis ensuite.
        </p>
      </div>
    );
  }

  const enCours = etat === "envoi";

  return (
    <div className="mx-auto max-w-[640px] rounded-lg border border-line bg-panel p-8">
      <fieldset disabled={enCours} className="flex flex-col gap-5">
        <legend className="sr-only">Laisser un avis sur Nightflow</legend>

        {/* Note — le seul champ requis. */}
        <div>
          <span className="text-[17px] font-bold">Votre note</span>
          <div
            className="mt-2.5 flex gap-1"
            onMouseLeave={() => setSurvol(0)}
            role="radiogroup"
            aria-label="Note sur 5"
          >
            {ETOILES.map((n) => {
              const allumee = n <= (survol || note);
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={note === n}
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  onClick={() => {
                    setNote(n);
                    setMessage(null);
                  }}
                  onMouseEnter={() => setSurvol(n)}
                  className="grid h-tap w-tap place-items-center rounded-[10px] transition duration-fast hover:bg-panel2 active:brightness-95"
                >
                  <Star
                    className={`h-7 w-7 ${allumee ? "text-accent" : "text-ink3"}`}
                    fill={allumee ? "currentColor" : "none"}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-[17px] font-bold">
            Ce qui vous a plu, ou manqué{" "}
            <span className="font-semibold text-ink3">— facultatif</span>
          </span>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            maxLength={FEEDBACK_LIMITS.comment}
            rows={4}
            placeholder="Ce qui vous a fait hésiter est encore plus utile que ce qui vous a plu."
            className="mt-2 w-full resize-y rounded-[12px] border border-line bg-panel2 p-3.5 text-[17px] leading-relaxed text-ink placeholder:text-ink3"
          />
        </label>

        <label className="block">
          <span className="text-[17px] font-bold">
            Votre prénom <span className="font-semibold text-ink3">— facultatif</span>
          </span>
          <input
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            maxLength={FEEDBACK_LIMITS.name}
            placeholder="Marc"
            className="mt-2 w-full rounded-[12px] border border-line bg-panel2 p-3.5 text-[17px] text-ink placeholder:text-ink3"
          />
        </label>

        {message && (
          <p role="alert" className="text-[16px] font-semibold text-bad">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={envoyer}
            className="inline-flex min-h-[52px] items-center rounded-[12px] bg-accent px-7 text-[17px] font-bold text-accent-ink transition hover:brightness-95 active:brightness-90 disabled:opacity-45"
          >
            {enCours ? "Envoi…" : "Envoyer mon avis"}
          </button>
          <span className="text-[15px] text-ink3">
            Ni e-mail, ni compte. Un clic suffit.
          </span>
        </div>
      </fieldset>
    </div>
  );
}
