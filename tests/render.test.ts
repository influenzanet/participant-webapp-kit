import { beforeEach, describe, expect, it, vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// case-web-app-core bundles its own copy of i18next: its initI18n sets up an instance that is
// not the app's `i18next` import, and hands it to react-i18next. The fake core below does the
// same, with a backend serving one country file, so the kit must find that instance.
const core = vi.hoisted(() => ({ instance: undefined as any, initialise: true }));

vi.mock("../src/runtime", () => ({}));
vi.mock("../src/ParticipantApp", () => ({ default: () => null }));
vi.mock("@influenzanet/case-web-ui", () => ({ LoadingPlaceholder: () => null }));
vi.mock("react-dom", () => ({ default: { render: vi.fn() } }));
vi.mock("@influenzanet/case-web-app-core", () => ({
  store: {},
  initI18n: vi.fn((lng: string, fallbackLng: string) => {
    if (!core.initialise) return Promise.resolve();
    core.instance = i18next.createInstance();
    return core.instance
      .use({
        type: "backend",
        init: () => undefined,
        read: (language: string, ns: string, callback: (err: unknown, data?: object | boolean) => void) =>
          setTimeout(() =>
            language === "it" && ns === "linkresolvers"
              ? callback(null, { verifyEmail: { title: "country title" } })
              : callback("failed loading", false)
          ),
      })
      .use(initReactI18next)
      .init({ lng, fallbackLng, ns: [], lowerCaseLng: true });
  }),
}));

import ReactDOM from "react-dom";
import { initI18n } from "@influenzanet/case-web-app-core";
import { renderParticipantApp } from "../src/render";
import { kitTexts } from "../src/defaultTexts";

const render = () =>
  renderParticipantApp({
    appConfig: {}, headerConfig: {}, navbarConfig: {}, pagesConfig: {}, footerConfig: {}, dateLocales: [],
    defaultLanguage: "it",
  });

describe("renderParticipantApp", () => {
  beforeEach(() => {
    vi.mocked(ReactDOM.render).mockClear();
    vi.stubGlobal("document", { getElementById: () => null });
  });

  // First: react-i18next keeps the last instance it was given, for the whole file.
  it("still renders the app when i18n is not initialised, with a warning", () => {
    core.initialise = false;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(render).not.toThrow();
    expect(ReactDOM.render).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("default texts are not added"));
    warn.mockRestore();
  });

  it("adds the kit's texts to the i18n instance the core set up, not to the app's i18next", async () => {
    core.initialise = true;
    render();
    // The app waits for i18n through react-i18next before rendering any page.
    await vi.mocked(initI18n).mock.results.at(-1)!.value;
    await core.instance.loadNamespaces("linkresolvers");
    const t = core.instance.getFixedT("it", "linkresolvers");
    expect(t("unsubscribe.weekly.title")).toBe((kitTexts.it.linkresolvers as any).unsubscribe.weekly.title);
    expect(t("verifyEmail.title")).toBe("country title");
    expect(i18next.isInitialized).toBeFalsy();
    expect(ReactDOM.render).toHaveBeenCalledTimes(1);
  });
});
