import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import { loadEnv, mergeConfig, type Plugin, type UserConfig, type ConfigEnv } from "vite";

export interface InfluenzanetViteOptions {
  /** Backend the dev server proxies API calls to (e.g. https://influweb.staging.influenzanet.info). */
  proxyTarget?: string;
  /** Paths proxied to proxyTarget. Default ["/api"]. */
  proxyPaths?: string[];
  /** Paths proxied with websockets enabled (e.g. a Streamlit dashboard). Default []. */
  wsProxyPaths?: string[];
  /**
   * Prefix -> URL proxies to other backends, prefix stripped:
   * { "/results-proxy": "https://storage.googleapis.com/bucket" } sends
   * /results-proxy/a.html to https://storage.googleapis.com/bucket/a.html.
   */
  pathProxies?: Record<string, string>;
  /** Build output directory. Default "dist". */
  outDir?: string;
  /** Extra Vite config, deep-merged last. */
  config?: UserConfig;
}

const KIT = "@influenzanet/participant-webapp-kit";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf-8"));

// The version actually installed, falling back to the range in package.json.
const installedVersion = (root: string, pkg: any, name: string): string | undefined => {
  try {
    const req = createRequire(join(root, "package.json"));
    return readJson(req.resolve(`${name}/package.json`)).version;
  } catch {
    return pkg.dependencies?.[name];
  }
};

// CRA leftovers in index.html: %PUBLIC_URL% is always "" (apps are served from /).
const publicUrlPlugin = (): Plugin => ({
  name: "influenzanet:public-url",
  transformIndexHtml: (html) => html.split("%PUBLIC_URL%").join(""),
});

/**
 * Shared Vite config for participant web apps.
 *
 * - REACT_APP_* env vars (CRA naming, used by case-web-app-core) are exposed as
 *   process.env.REACT_APP_* and as %REACT_APP_*% in index.html.
 * - REACT_APP_VERSION / REACT_APP_SURVEY_ENGINE_VERSION come from package.json.
 * - SCSS can import from node_modules (with or without the CRA "~" prefix).
 */
export function influenzanetVite(options: InfluenzanetViteOptions = {}) {
  return ({ mode }: ConfigEnv): UserConfig => {
    const root = process.cwd();
    const pkg = existsSync(join(root, "package.json")) ? readJson(join(root, "package.json")) : {};
    const env = loadEnv(mode, root, "REACT_APP_");

    const defines: Record<string, string> = Object.fromEntries(
      Object.entries(env).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
    );

    const proxy: NonNullable<NonNullable<UserConfig["server"]>["proxy"]> = {};
    if (options.proxyTarget) {
      const common = {
        target: options.proxyTarget,
        changeOrigin: true,
        secure: false,
        // A backend redirect to its own absolute URL (e.g. Streamlit: /dashboard -> https://staging/dashboard/)
        // would take the browser off the dev server: an iframe then becomes cross-origin, so
        // iframe-resizer ignores it and cookies are dropped. Rewrite such redirects back to us.
        autoRewrite: true,
        protocolRewrite: "http",
      };
      for (const p of options.proxyPaths ?? ["/api"]) {
        proxy[p] = { ...common };
      }
      for (const p of options.wsProxyPaths ?? []) {
        proxy[p] = { ...common, ws: true };
      }
    }
    for (const [prefix, url] of Object.entries(options.pathProxies ?? {})) {
      proxy[prefix] = {
        target: url,
        changeOrigin: true,
        rewrite: (path: string) => path.slice(prefix.length) || "/",
      };
    }

    const base: UserConfig = {
      plugins: [react(), publicUrlPlugin()],
      envPrefix: ["VITE_", "REACT_APP_"],
      define: {
        "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
        "process.env.PUBLIC_URL": JSON.stringify(""),
        ...defines,
        // replaces the CRA $npm_package_* magic
        "process.env.REACT_APP_VERSION": JSON.stringify(pkg.version),
        "process.env.REACT_APP_SURVEY_ENGINE_VERSION": JSON.stringify(installedVersion(root, pkg, "survey-engine")),
        // catch-all: any other process.env.X evaluates to undefined
        "process.env": "{}",
      },
      resolve: {
        preserveSymlinks: true,
        // one copy of these, even when the kit or core are linked locally
        dedupe: [
          "react",
          "react-dom",
          "react-redux",
          "react-i18next",
          "i18next",
          "@influenzanet/case-web-app-core",
          "@influenzanet/case-web-ui",
        ],
        // CRA-style "~pkg/..." imports in SCSS
        alias: [{ find: /^~(?!\/)(.*)$/, replacement: "$1" }],
      },
      optimizeDeps: {
        // the kit ships ESM + CSS imports; let Vite transform it like app code
        exclude: [KIT],
        // Vite doesn't crawl excluded packages at startup: list what the kit imports so
        // it's pre-bundled once (one shared copy, no re-optimize + reload on first load)
        include: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react-redux",
          "react-i18next",
          "@influenzanet/case-web-app-core",
          "@influenzanet/case-web-ui",
          `${KIT} > @iframe-resizer/parent`,
          "bootstrap/dist/js/bootstrap.bundle",
          "@fortawesome/fontawesome-free/js/solid",
          "@fortawesome/fontawesome-free/js/brands",
          "@fortawesome/fontawesome-free/js/fontawesome",
        ],
      },
      css: {
        preprocessorOptions: {
          scss: { loadPaths: ["node_modules"] },
        },
      },
      build: {
        outDir: options.outDir ?? "dist",
        // hashed bundles go to /static (nginx caches them immutably), away from the
        // /assets content folder (configs, locales, images) that is served no-cache
        assetsDir: "static",
        sourcemap: false,
      },
      server: { proxy },
    };

    return options.config ? mergeConfig(base, options.config) : base;
  };
}

export default influenzanetVite;
