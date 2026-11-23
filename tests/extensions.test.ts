import { describe, expect, it, vi } from "vitest";

vi.mock("@influenzanet/case-web-app-core", () => ({ PhoneVerificationBanner: () => null }));

import { PhoneVerificationBanner } from "@influenzanet/case-web-app-core";
import { defaultExtensions } from "../src/extensions";
import { kitTexts } from "../src/defaultTexts";

describe("the kit's default extensions", () => {
  it("are the names pages.json items use as config.type", () => {
    expect(defaultExtensions.map((e) => e.name)).toEqual(["iframeEmbed", "blogPosts", "phoneVerificationBanner"]);
  });

  it("register the core's phone verification banner, which hides itself when WhatsApp is off", () => {
    const banner = defaultExtensions.find((e) => e.name === "phoneVerificationBanner");
    expect(banner?.component).toBe(PhoneVerificationBanner);
  });

  it("come with the banner's texts in every kit language", () => {
    for (const language of ["en", "it"]) {
      const texts = (kitTexts[language].translation as any).phoneVerificationBanner;
      for (const key of ["title", "message", "button"]) {
        expect(typeof texts[key] === "string" && texts[key].length > 0, `${language} ${key}`).toBe(true);
      }
    }
  });
});
