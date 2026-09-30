import { describe, it, expect } from "vitest";
import { checkUnitPrice } from "./pricing";

const product = { name: "Ciment", sellPrice: 15000, costPrice: 12000 };

describe("checkUnitPrice", () => {
  it("impose le prix catalogue au vendeur", () => {
    expect(checkUnitPrice("VENDEUR", false, 15000, product)).toBeNull();
    expect(checkUnitPrice("VENDEUR", false, 100, product)).toContain("Seul un gestionnaire");
    expect(checkUnitPrice("VENDEUR", false, 20000, product)).toContain("Seul un gestionnaire");
  });

  it("autorise un prix négocié aux gestionnaires et administrateurs", () => {
    expect(checkUnitPrice("GESTIONNAIRE", false, 13000, product)).toBeNull();
    expect(checkUnitPrice("ADMIN", false, 0, product)).toBeNull();
  });

  it("tolère un changement de prix pour une vente hors connexion, pas en dessous du prix d'achat", () => {
    expect(checkUnitPrice("VENDEUR", true, 14000, product)).toBeNull();
    expect(checkUnitPrice("VENDEUR", true, 11000, product)).toContain("inférieur au prix d'achat");
  });

  it("refuse un prix négatif ou invalide pour tout le monde", () => {
    expect(checkUnitPrice("ADMIN", false, -1, product)).toContain("invalide");
    expect(checkUnitPrice("ADMIN", false, NaN, product)).toContain("invalide");
  });
});
