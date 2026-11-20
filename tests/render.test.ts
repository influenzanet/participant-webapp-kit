import { describe, expect, it, vi } from "vitest";

// Everything renderParticipantApp boots is replaced: only the order of the i18n calls matters here.
vi.mock("../src/runtime", () => ({}));
vi.mock("../src/ParticipantApp", () => ({ default: () => null }));
vi.mock("@influenzanet/case-web-ui", () => ({ LoadingPlaceholder: () => null }));
vi.mock("@influenzanet/case-web-app-core", () => ({ initI18n: vi.fn(), store: {} }));
vi.mock("react-dom", () => ({ default: { render: vi.fn() } }));
vi.mock("../src/defaultTexts", async (original) => ({
  ...(await original<typeof import("../src/defaultTexts")>()),
  addDefaultTexts: vi.fn(),
}));

import { initI18n } from "@influenzanet/case-web-app-core";
import ReactDOM from "react-dom";
import { renderParticipantApp } from "../src/render";
import { addDefaultTexts, kitTexts } from "../src/defaultTexts";

describe("renderParticipantApp", () => {
  it("adds the kit's texts right after i18n is initialised, before the first render", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    renderParticipantApp({
      appConfig: {}, headerConfig: {}, navbarConfig: {}, pagesConfig: {}, footerConfig: {}, dateLocales: [],
    });
    expect(addDefaultTexts).toHaveBeenCalledTimes(1);
    expect(addDefaultTexts).toHaveBeenCalledWith(kitTexts);
    const added = vi.mocked(addDefaultTexts).mock.invocationCallOrder[0];
    expect(vi.mocked(initI18n).mock.invocationCallOrder[0]).toBeLessThan(added);
    expect(added).toBeLessThan(vi.mocked(ReactDOM.render).mock.invocationCallOrder[0]);
  });
});
