import type { i18n as I18n } from "i18next";
import { getI18n } from "react-i18next";

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
 *
 * By default it uses the i18n instance react-i18next renders with. That is the one
 * case-web-app-core's initI18n sets up: the core bundles its own copy of i18next, so the app's
 * `i18next` import is another copy, never initialised. Without an initialised instance it only
 * warns: the texts are an extra, and must never keep the app from starting.
 */
export function addDefaultTexts(defaults: DefaultTexts, instance: I18n | undefined = getI18n()): void {
  if (!instance?.store) {
    console.warn("participant-webapp-kit: i18n is not initialised, the kit's default texts are not added");
    return;
  }
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
