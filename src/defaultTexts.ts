import i18n, { i18n as I18n } from "i18next";

import enLinkResolvers from "./locales/en/linkresolvers.json";
import itLinkResolvers from "./locales/it/linkresolvers.json";

/** Texts by language, then namespace: `{ it: { linkresolvers: { ... } } }`. */
export type DefaultTexts = Record<string, Record<string, object>>;

/**
 * The texts of the pages every country app has (src/locales/<language>/<namespace>.json). A
 * country gets them without copying them into its public/ folder, and replaces any of them by
 * putting the same key in its own locale file.
 */
export const kitTexts: DefaultTexts = {
  en: { linkresolvers: enLinkResolvers },
  it: { linkresolvers: itLinkResolvers },
};

/**
 * Fills the keys a country's locale files lack with the given texts, once i18n has loaded each
 * namespace, or failed to (the country has no file for it). The country's own keys are never
 * replaced. The texts are added while i18n records the load, before the components waiting
 * for the namespace render. Call it right after i18n is initialised.
 */
export function addDefaultTexts(defaults: DefaultTexts, instance: I18n = i18n): void {
  let adding = false;
  const fill = (lng: string, ns: string) => {
    const texts = defaults[lng]?.[ns];
    // addResourceBundle announces itself as "added" too: ignore our own addition.
    if (!texts || adding) return;
    adding = true;
    try {
      // A copy: i18n keeps the objects it is given, and a later load merges into them.
      instance.addResourceBundle(lng, ns, JSON.parse(JSON.stringify(texts)), true, false);
    } finally {
      adding = false;
    }
  };
  instance.store.on("added", fill);
  instance.on("failedLoading", fill);
}
