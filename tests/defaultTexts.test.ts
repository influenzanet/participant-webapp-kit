import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import i18next from "i18next";

import { addDefaultTexts, kitTexts, DefaultTexts } from "../src/defaultTexts";

// What the country serves under public/assets/locales: language -> namespace -> file. A missing
// entry answers like a missing file.
type CountryFiles = Record<string, Record<string, object>>;

const kitDefaults: DefaultTexts = {
  en: { linkresolvers: { unsubscribe: { title: "kit en title", confirmBtn: "kit en confirm" } } },
  it: { linkresolvers: { unsubscribe: { title: "kit it title", confirmBtn: "kit it confirm" } } },
};

const start = async (files: CountryFiles, lng = "it", defaults = kitDefaults) => {
  const instance = i18next.createInstance();
  const reads: string[] = [];
  instance.use({
    type: "backend",
    init: () => undefined,
    read: (language: string, namespace: string, callback: (err: unknown, data?: object | boolean) => void) => {
      reads.push(`${language}/${namespace}`);
      const file = files[language]?.[namespace];
      // A copy, as each fetch parses its own.
      setTimeout(() => (file ? callback(null, JSON.parse(JSON.stringify(file))) : callback("failed loading", false)));
    },
  });
  // As in the app: the texts are hooked in right after init is called, before anything loads.
  const initialised = instance.init({ lng, fallbackLng: "en", ns: [], lowerCaseLng: true });
  addDefaultTexts(defaults, instance);
  await initialised;
  await instance.loadNamespaces("linkresolvers");
  return { t: instance.getFixedT(lng, "linkresolvers"), instance, reads };
};

describe("the kit's default texts", () => {
  it("fill the keys the country's file lacks, as soon as the namespace is loaded", async () => {
    const { t } = await start({ it: { linkresolvers: { verifyEmail: { title: "country title" } } } });
    expect(t("unsubscribe.title")).toBe("kit it title");
    expect(t("verifyEmail.title")).toBe("country title");
  });

  it("never replace a key the country has", async () => {
    const { t } = await start({ it: { linkresolvers: { unsubscribe: { title: "country title" } } } });
    expect(t("unsubscribe.title")).toBe("country title");
    expect(t("unsubscribe.confirmBtn")).toBe("kit it confirm");
  });

  it("stand in for a file the country does not have", async () => {
    const { t } = await start({});
    expect(t("unsubscribe.title")).toBe("kit it title");
  });

  it("come from the fallback language for a language the kit has no texts in", async () => {
    const { t } = await start({ fr: { linkresolvers: { unsubscribe: { title: "titre du pays" } } } }, "fr");
    expect(t("unsubscribe.title")).toBe("titre du pays");
    expect(t("unsubscribe.confirmBtn")).toBe("kit en confirm");
  });

  it("leave the namespaces they have no texts for alone", async () => {
    const { instance } = await start({ it: { linkresolvers: {}, dialogs: { a: "country" } } });
    await instance.loadNamespaces("dialogs");
    expect(instance.getResourceBundle("it", "dialogs")).toEqual({ a: "country" });
  });

  it("still let i18n read every country file", async () => {
    const { reads } = await start({ it: { linkresolvers: {} } });
    expect(reads.sort()).toEqual(["en/linkresolvers", "it/linkresolvers"]);
  });

  it("leave an i18n that is not initialised alone, without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => addDefaultTexts(kitDefaults, i18next.createInstance())).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("are not changed by what i18n merges into its copy", async () => {
    const defaults: DefaultTexts = JSON.parse(JSON.stringify(kitDefaults));
    const { instance } = await start({}, "it", defaults);
    instance.addResourceBundle("it", "linkresolvers", { unsubscribe: { title: "changed" } }, true, true);
    expect(defaults).toEqual(kitDefaults);
  });
});

// The keys the unsubscribe pages of case-web-app-core ask for.
const UNSUBSCRIBE_KEYS = [
  "unsubscribe.newsletter.title",
  "unsubscribe.newsletter.info",
  "unsubscribe.newsletter.success",
  "unsubscribe.weekly.title",
  "unsubscribe.weekly.info",
  "unsubscribe.weekly.success",
  "unsubscribe.confirmBtn",
  "unsubscribe.retryBtn",
  "unsubscribe.homeBtn",
  "unsubscribe.invalidLink",
  "unsubscribe.error",
];

const flatten = (source: object, prefix = ""): string[] =>
  Object.entries(source).flatMap(([key, value]) =>
    value !== null && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

describe("the kit's locale files", () => {
  it("are each the texts of their own language and namespace, every one of them", () => {
    const folder = join(__dirname, "..", "src", "locales");
    const files: DefaultTexts = {};
    for (const language of readdirSync(folder)) {
      files[language] = {};
      for (const file of readdirSync(join(folder, language))) {
        files[language][file.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(folder, language, file), "utf-8"));
      }
    }
    expect(kitTexts).toEqual(files);
  });

  it("have the same keys in every language", () => {
    const languages = Object.keys(kitTexts);
    expect(languages.sort()).toEqual(["en", "it"]);
    for (const ns of Object.keys(kitTexts.en)) {
      expect(flatten(kitTexts.it[ns]).sort()).toEqual(flatten(kitTexts.en[ns]).sort());
    }
    expect(Object.keys(kitTexts.it).sort()).toEqual(Object.keys(kitTexts.en).sort());
  });

  it("have every key of the unsubscribe pages, as text", () => {
    for (const language of ["en", "it"]) {
      const keys = flatten(kitTexts[language].linkresolvers);
      expect(keys.sort()).toEqual([...UNSUBSCRIBE_KEYS].sort());
      for (const key of UNSUBSCRIBE_KEYS) {
        const value = key.split(".").reduce<any>((node, part) => node?.[part], kitTexts[language].linkresolvers);
        expect(typeof value === "string" && value.length > 0, `${language} ${key}`).toBe(true);
      }
    }
  });
});
