import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { store, initI18n } from "@influenzanet/case-web-app-core";
import { LoadingPlaceholder } from "@influenzanet/case-web-ui";

import "./runtime";
import { env } from "./env";
import ParticipantApp, { ParticipantAppProps } from "./ParticipantApp";
import { addDefaultTexts, kitTexts } from "./defaultTexts";

export interface RenderOptions extends ParticipantAppProps {
  /** Defaults to REACT_APP_FALLBACK_LANGUAGE, then "en". */
  fallbackLanguage?: string;
  /** Where locales are fetched from. Defaults to REACT_APP_CONTENT_URL + "/locales". */
  localeUrl?: string;
  /** Runs after i18n init and before the first render: register reducers, local-storage hooks, ... */
  beforeRender?: () => void;
  /** DOM element id to mount into. Default "root". */
  rootId?: string;
}

/**
 * Boots a participant web app: i18n (with the kit's default texts under the country's), redux
 * store, Suspense fallback, and the ParticipantApp (AppCore + kit extensions + country extensions).
 */
export function renderParticipantApp(options: RenderOptions): void {
  const { fallbackLanguage, localeUrl, beforeRender, rootId, ...appProps } = options;

  const defaultLanguage = appProps.defaultLanguage ?? env.defaultLanguage ?? "en";
  initI18n(
    defaultLanguage,
    fallbackLanguage ?? env.fallbackLanguage ?? "en",
    localeUrl ?? `${env.contentUrl ?? "/assets"}/locales`
  );
  addDefaultTexts(kitTexts);

  beforeRender?.();

  ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <Suspense fallback={<LoadingPlaceholder color="secondary" minHeight="100vh" />}>
          <ParticipantApp {...appProps} defaultLanguage={defaultLanguage} />
        </Suspense>
      </Provider>
    </React.StrictMode>,
    document.getElementById(rootId ?? "root")
  );
}
