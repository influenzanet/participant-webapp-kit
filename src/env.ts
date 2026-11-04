// process.env.REACT_APP_* is replaced at build time by the Vite preset (`define`),
// exactly like in case-web-app-core. Anything not defined evaluates to undefined.
declare const process: { env: Record<string, string | undefined> };

export const env = {
  defaultLanguage: process.env.REACT_APP_DEFAULT_LANGUAGE,
  fallbackLanguage: process.env.REACT_APP_FALLBACK_LANGUAGE,
  contentUrl: process.env.REACT_APP_CONTENT_URL,
  defaultInstance: process.env.REACT_APP_DEFAULT_INSTANCE,
  ghostUrl: process.env.REACT_APP_GHOST_URL,
  ghostContentApiKey: process.env.REACT_APP_GHOST_CONTENT_API_KEY,
};
