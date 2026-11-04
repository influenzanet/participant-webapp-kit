import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AppCore,
  AppConfig,
  FooterConfig,
  HeaderConfig,
  NavbarConfig,
  PagesConfig,
} from "@influenzanet/case-web-app-core";

import { env } from "./env";
import { defaultExtensions } from "./extensions";

export type Extension = { name: string; component: React.FunctionComponent<any> };
export type DateLocale = { code: string; locale: any; format: string };
type AppCoreProps = React.ComponentProps<typeof AppCore>;

export interface ParticipantAppProps {
  appConfig: AppConfig | object;
  headerConfig: HeaderConfig | object;
  navbarConfig: NavbarConfig | object;
  pagesConfig: PagesConfig | object;
  footerConfig: FooterConfig | object;
  dateLocales: DateLocale[];
  /** Country extensions. A name that matches a kit extension replaces it. */
  extensions?: Extension[];
  /** Set to false to register only the country's own extensions. */
  includeDefaultExtensions?: boolean;
  /** Overrides appConfig.instanceId. Defaults to REACT_APP_DEFAULT_INSTANCE. */
  instanceId?: string;
  /** Language used when i18n has none yet. Defaults to REACT_APP_DEFAULT_LANGUAGE. */
  defaultLanguage?: string;
  /** Any other AppCore prop (customHeader, customSurveyResponseComponents, ...). */
  appCoreProps?: Partial<AppCoreProps>;
  /** Rendered after AppCore: cookie banners, trackers, ... */
  children?: React.ReactNode;
}

// `import * as cfg from "./configs/x.json"` yields a module namespace; accept both shapes.
const unwrap = <T,>(m: any): T => (m && m.default ? m.default : m) as T;

const ParticipantApp: React.FC<ParticipantAppProps> = (props) => {
  const { i18n } = useTranslation();
  const defaultLanguage = props.defaultLanguage ?? env.defaultLanguage;

  useEffect(() => {
    if (!i18n.language && defaultLanguage) {
      i18n.changeLanguage(defaultLanguage);
    }
  }, [i18n, i18n.language, defaultLanguage]);

  const appConfig = useMemo(() => {
    const cfg = { ...unwrap<AppConfig>(props.appConfig) };
    const instanceId = props.instanceId ?? env.defaultInstance;
    if (instanceId) {
      cfg.instanceId = instanceId;
    }
    return cfg;
  }, [props.appConfig, props.instanceId]);

  const extensions = useMemo(() => {
    const own = props.extensions ?? [];
    if (props.includeDefaultExtensions === false) return own;
    const ownNames = new Set(own.map((e) => e.name));
    // core picks the first match, so country extensions go first
    return [...own, ...defaultExtensions.filter((e) => !ownNames.has(e.name))];
  }, [props.extensions, props.includeDefaultExtensions]);

  return (
    <React.Fragment>
      <AppCore
        {...props.appCoreProps}
        appConfig={appConfig}
        headerConfig={unwrap<HeaderConfig>(props.headerConfig)}
        navbarConfig={unwrap<NavbarConfig>(props.navbarConfig)}
        pagesConfig={unwrap<PagesConfig>(props.pagesConfig)}
        footerConfig={unwrap<FooterConfig>(props.footerConfig)}
        dateLocales={props.dateLocales}
        extensions={extensions}
      />
      {props.children}
    </React.Fragment>
  );
};

export default ParticipantApp;
