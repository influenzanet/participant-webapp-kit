# Changelog

## 0.1.2

- Fixes broken 0.1.1
  
## 0.1.1

- Default texts: the kit ships the texts of pages every country has
  (`src/locales/<language>/<namespace>.json`, `en` and `it`) and adds them under the
  country's locale files at start-up. A country key always wins; a namespace the country has
  no file for gets the kit's texts.
- `yarn test` (vitest), also run before publishing.

## 0.1.0

First version, extracted from the influweb participant web app.

- `renderParticipantApp()` / `<ParticipantApp>`: i18n init, redux store, Suspense,
  fonts, Font Awesome, Bootstrap JS, `REACT_APP_DEFAULT_INSTANCE` override, default
  language, kit + country extensions.
- `iframeEmbed` extension (from influweb `Dashboard`, BE/PT `ResultsIFrame`):
  `{lang}` url template, auto-resize via `@iframe-resizer/parent` (npm, no CDN
  script needed), or fixed height, optional same-origin stylesheet injection.
- `blogPosts` extension (Ghost content API), CSS module turned into prefixed plain CSS.
- `@influenzanet/participant-webapp-kit/vite`: shared Vite config (REACT_APP_* env,
  CRA compatibility, dedupe, dev proxy). The dev proxy rewrites backend redirects to their
  own absolute URL back to the dev server (`autoRewrite`): a Streamlit `/dashboard` →
  `https://<staging>/dashboard/` redirect otherwise made the results iframe cross-origin, so
  it never resized. `pathProxies` proxies a prefix to another backend with the prefix
  stripped (PT: `/results-proxy` → the results bucket).
