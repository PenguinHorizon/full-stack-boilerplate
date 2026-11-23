import { mailHref, mapsSearchHref, telHref, whatsappHref } from "./links";

describe("deep links", () => {
  it("builds tel: links from any phone format", () => {
    expect(telHref("+92 21 0000 0001")).toBe("tel:+922100000001");
    expect(telHref(null)).toBeNull();
    expect(telHref("")).toBeNull();
  });

  it("builds WhatsApp click-to-chat links with an encoded message", () => {
    expect(whatsappHref("+922100000001")).toBe("https://wa.me/922100000001");
    expect(whatsappHref("+922100000001", "Hi & hello")).toBe(
      "https://wa.me/922100000001?text=Hi%20%26%20hello",
    );
    expect(whatsappHref(undefined)).toBeNull();
  });

  it("builds a maps search from address parts, skipping blanks", () => {
    expect(mapsSearchHref("Plot 14, Food Street", null, "Karachi")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Plot%2014%2C%20Food%20Street%2C%20Karachi",
    );
    expect(mapsSearchHref(null, undefined)).toBeNull();
  });

  it("builds mailto links", () => {
    expect(mailHref("hello@northern-trails.example")).toBe(
      "mailto:hello@northern-trails.example",
    );
    expect(mailHref(null)).toBeNull();
  });
});
