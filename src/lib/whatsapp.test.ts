import { describe, it, expect } from "vitest";
import { whatsappLink, countryCodeFromStorePhone } from "./whatsapp";

describe("whatsappLink", () => {
  it("accepte les formats internationaux et locaux", () => {
    const expected = "https://wa.me/243990111222?text=Bonjour";
    expect(whatsappLink("+243 990 111 222", "Bonjour")).toBe(expected);
    expect(whatsappLink("00243990111222", "Bonjour")).toBe(expected);
    expect(whatsappLink("0990-111-222", "Bonjour")).toBe(expected);
  });

  it("utilise l'indicatif fourni pour un numéro local", () => {
    expect(whatsappLink("0712345678", "x", "254")).toBe("https://wa.me/254712345678?text=x");
  });

  it("encode le message", () => {
    expect(whatsappLink("+243990111222", "Reste dû : 1 000 CDF")).toContain("text=Reste%20d%C3%BB%20%3A%201%20000%20CDF");
  });

  it("renvoie null pour un numéro absent ou invalide", () => {
    expect(whatsappLink(null, "x")).toBeNull();
    expect(whatsappLink("", "x")).toBeNull();
    expect(whatsappLink("12", "x")).toBeNull();
  });
});

describe("countryCodeFromStorePhone", () => {
  it("lit l'indicatif du numéro de la boutique", () => {
    expect(countryCodeFromStorePhone("+243 970 000 001")).toBe("243");
    expect(countryCodeFromStorePhone("+254 700 000 000")).toBe("254");
    expect(countryCodeFromStorePhone("00225 01 02 03 04")).toBe("225");
  });

  it("vaut 243 par défaut", () => {
    expect(countryCodeFromStorePhone(null)).toBe("243");
    expect(countryCodeFromStorePhone("0970000001")).toBe("243");
  });
});
