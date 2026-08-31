import { describe, it, expect } from "vitest";
import { toCsv } from "@/utils/download";

/**
 * Product / campaign names come from the connected store. A name starting with
 * `= + - @` executes as a formula when the exported CSV is opened in a
 * spreadsheet — neutralise it with a leading apostrophe.
 */
describe("toCsv() formula-injection guard", () => {
  it("prefixes a formula-looking field with an apostrophe", () => {
    const csv = toCsv(
      ["Produit"],
      [['=HYPERLINK("http://evil","x")'], ["+1"], ["-2"], ["@cmd"]]
    );
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    // Header + 4 rows.
    expect(lines[1]).toBe('"\'=HYPERLINK(""http://evil"",""x"")"');
    expect(lines[2]).toBe("'+1");
    expect(lines[3]).toBe("'-2");
    expect(lines[4]).toBe("'@cmd");
  });

  it("leaves an ordinary field untouched", () => {
    const csv = toCsv(["Produit"], [["Lampe Galaxie"]]);
    expect(csv.replace(/^﻿/, "").split("\r\n")[1]).toBe("Lampe Galaxie");
  });
});
