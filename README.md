# @influenzanet/participant-webapp-kit

The shared kit of the Influenzanet participant web apps, currently used in influweb, infectieradar-be,
gripenet-pt, grippenet-ch). 

| What | Export |
|---|---|
| Bootstrap (i18n, store, Suspense, fonts, icons, Bootstrap JS) | `renderParticipantApp()` |
| AppCore wrapper (instance override, default language, extensions) | `<ParticipantApp>` |
| Generic page extensions | `iframeEmbed`, `blogPosts` (registered by default) |
| Vite config | `@influenzanet/participant-webapp-kit/vite` |

Files that must physically live in each country repo (Dockerfile, nginx, CI, `vite.config.ts`,
`index.html`, ...) come from the copier template
[influenzanet/participant-webapp-template](https://github.com/influenzanet/participant-webapp-template).

## Use in a country app

`src/index.tsx`:

```tsx
import { renderParticipantApp } from "@influenzanet/participant-webapp-kit";
import { it } from "date-fns/locale";

import "./index.scss";
import * as appConfig from "./configs/appConfig.json";
import * as footerConfig from "./configs/footer.json";
import * as headerConfig from "./configs/header.json";
import * as navbarConfig from "./configs/navbar.json";
import * as pagesConfig from "./configs/pages.json";

renderParticipantApp({
  appConfig, footerConfig, headerConfig, navbarConfig, pagesConfig,
  dateLocales: [{ code: "it", locale: it, format: "dd/MM/yyyy" }],
  // optional, country specific:
  extensions: [{ name: "myWidget", component: MyWidget }],
  beforeRender: () => registerMyReducers(),
  children: <CookieBanner />,
});
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { influenzanetVite } from "@influenzanet/participant-webapp-kit/vite";

export default defineConfig(influenzanetVite({
  proxyTarget: "https://influweb.staging.influenzanet.info",
  wsProxyPaths: ["/dashboard", "/_stcore"],
  // other backends, prefix stripped: /results-proxy/a.html -> <bucket>/a.html
  pathProxies: { "/results-proxy": "https://storage.googleapis.com/my-bucket" },
}));
```

Env vars keep the CRA names (`REACT_APP_*`) because case-web-app-core reads them; they're
available as `process.env.REACT_APP_X` in code and `%REACT_APP_X%` in `index.html`.

## Default texts

Texts of the pages every country has (for now the newsletter and weekly reminder unsubscribe
pages) ship with the kit, in `src/locales/<language>/<namespace>.json` (`en` and `it`), and are
added under the country's own locale files when the app starts. A country does not copy them:
to change one, put the same key in its own `public/assets/locales/<language>/<namespace>.json`,
which always wins. Other languages fall back to the fallback language for the keys they lack.

## Extensions

Used from `pages.json` items (case-web-app-core 2.7.x matches on `config.type`):

```json
{ "itemKey": "results", "config": { "type": "extension",
  "config": { "type": "iframeEmbed", "url": "/dashboard/?lang={lang}", "title": "Results" } } }
```

### `iframeEmbed`

| prop | default | |
|---|---|---|
| `url` | | page url, `{lang}` → current language. Use the exact URL the page serves (Streamlit: `/dashboard/`, with the slash): a redirect to another origin makes the iframe cross-origin and resizing stops |
| `baseUrl` | | legacy: same as `url: "<baseUrl>?lang={lang}"` |
| `autoResize` | `true` | resize to content with iframe-resizer v5 (embedded page must load `@iframe-resizer/child`); hidden behind a spinner until its size settles |
| `height`, `minHeight` | `100vh` | used when `autoResize: false` |
| `stylesheet` | | same-origin pages: stylesheet injected into the iframe on load |
| `title` | `Results` | |
| `settleMs`, `maxWaitMs`, `placeholderHeight` | 700, 10000, 300 | auto-resize reveal tuning |

### `blogPosts`

Latest posts from a Ghost blog. Props `ghostUrl`, `apiKey`, `blogUrl`, `limit` (3), defaults from `REACT_APP_GHOST_URL` / `REACT_APP_GHOST_CONTENT_API_KEY`. Texts from the page's locale namespace: `<itemKey>.title|readMore|viewAll|error|empty`.

A country extension with the same name replaces the kit one, pass `includeDefaultExtensions: false` to register none of them.

## Develop

```sh
yarn install
yarn build          # dist/
# try it in a country app without publishing:
cd ../participant-webapp-influweb && yarn add file:../participant-webapp-kit
```

To release a new version: 
  - bump `version`
  - update `CHANGELOG.md`
  - tag `vX.Y.Z` (or `vX.Y.Z-staging.N`) and push;

the workflow publishes to npm (`latest` / `staging`).
