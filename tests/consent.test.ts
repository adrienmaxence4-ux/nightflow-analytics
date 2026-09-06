import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearConsent, readConsent, writeConsent } from "@/lib/consent";

/**
 * Le point critique de ces tests : `readConsent` doit renvoyer `null` — donc
 * « ne rien charger » — dans TOUS les cas douteux. Un faux « accepted » ferait
 * partir un traceur sans consentement.
 */

const KEY = "nightflow:consent";
const DAY = 24 * 60 * 60 * 1000;

function installStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    CustomEvent: class {
      constructor(public type: string) {}
    },
  });
  return store;
}

describe("consent", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renvoie null quand rien n'a été répondu", () => {
    installStorage();
    expect(readConsent()).toBeNull();
  });

  it("relit le choix enregistré", () => {
    installStorage();
    writeConsent("accepted", 1_000);
    expect(readConsent(1_000)).toBe("accepted");
    writeConsent("refused", 1_000);
    expect(readConsent(1_000)).toBe("refused");
  });

  it("oublie un choix de plus de 6 mois", () => {
    installStorage();
    const t0 = 1_000_000_000;
    writeConsent("accepted", t0);
    expect(readConsent(t0 + 100 * DAY)).toBe("accepted");
    expect(readConsent(t0 + 200 * DAY)).toBeNull();
  });

  it("rejette un horodatage dans le futur", () => {
    installStorage();
    const t0 = 1_000_000_000;
    writeConsent("accepted", t0 + 10 * DAY);
    expect(readConsent(t0)).toBeNull();
  });

  it("rejette une valeur bricolée plutôt que de la croire", () => {
    const store = installStorage();
    for (const bad of [
      "pas du json",
      '"accepted"',
      "null",
      '{"choice":"accepted"}', // horodatage manquant
      '{"choice":"oui","at":1}', // choix inconnu
      '{"choice":"accepted","at":"hier"}', // horodatage non numérique
    ]) {
      store[KEY] = bad;
      expect(readConsent(2)).toBeNull();
    }
  });

  it("ne trace pas quand le stockage est inaccessible", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("navigation privée");
        },
        setItem: () => {
          throw new Error("navigation privée");
        },
        removeItem: () => {},
      },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
      CustomEvent: class {
        constructor(public type: string) {}
      },
    });
    expect(readConsent()).toBeNull();
    // Écrire ne doit pas jeter, même si ça ne persiste pas.
    expect(() => writeConsent("accepted")).not.toThrow();
    expect(readConsent()).toBeNull();
  });

  it("efface le choix, ce qui ramène la bannière", () => {
    installStorage();
    writeConsent("accepted", 1_000);
    clearConsent();
    expect(readConsent(1_000)).toBeNull();
  });

  it("renvoie null côté serveur, où il n'y a pas de window", () => {
    vi.stubGlobal("window", undefined);
    expect(readConsent()).toBeNull();
  });
});
