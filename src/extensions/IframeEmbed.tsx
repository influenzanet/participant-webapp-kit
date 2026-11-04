import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import iframeResize from "@iframe-resizer/parent";

/**
 * Page extension that embeds an external page (results dashboard, ...) in an iframe.
 *
 * pages.json:
 *   { "type": "extension", "config": { "type": "iframeEmbed", "url": "/dashboard/?lang={lang}" } }
 *
 * `{lang}` in the url is replaced with the current language.
 */
export interface IframeEmbedProps {
  /** Page url; `{lang}` is replaced with the current i18n language. */
  url?: string;
  /** Legacy form: becomes `${baseUrl}?lang={lang}`. */
  baseUrl?: string;
  title?: string;
  className?: string;
  /**
   * true (default): size the iframe to its content with iframe-resizer. The embedded
   * page must load @iframe-resizer/child v5.
   * false: fixed size from `height` / `minHeight`.
   */
  autoResize?: boolean;
  height?: string | number;
  minHeight?: string | number;
  /** Same-origin pages only: stylesheet url injected into the iframe document on load. */
  stylesheet?: string;
  /** autoResize: reveal once the size has been stable this long (ms). Default 700. */
  settleMs?: number;
  /** autoResize: reveal anyway after this long (ms). Default 10000. */
  maxWaitMs?: number;
  /** autoResize: height of the loading box (px). Default 300. */
  placeholderHeight?: number;
}

// True while images inside the iframe are still loading; false when we can't look inside
// (cross-origin), in which case the settle timer alone decides.
const imagesPending = (iframe: HTMLIFrameElement) => {
  try {
    return Array.from(iframe.contentDocument?.images ?? []).some((img) => !img.complete);
  } catch {
    return false;
  }
};

export const buildIframeUrl = (props: Pick<IframeEmbedProps, "url" | "baseUrl">, lang: string) => {
  const template = props.url ?? (props.baseUrl ? `${props.baseUrl}?lang={lang}` : "");
  return template.split("{lang}").join(encodeURIComponent(lang ?? ""));
};

const IframeEmbed: React.FC<IframeEmbedProps> = (props) => {
  const { i18n } = useTranslation();
  const ref = useRef<HTMLIFrameElement>(null);
  const autoResize = props.autoResize !== false;
  const [ready, setReady] = useState(!autoResize);
  const settleMs = props.settleMs ?? 700;
  const maxWaitMs = props.maxWaitMs ?? 10000;
  const placeholderHeight = props.placeholderHeight ?? 300;
  const url = buildIframeUrl(props, i18n.language);

  // Streamlit-like pages draw in pieces, so the iframe is resized many times while
  // loading. Keep it hidden in a fixed-height box until its size has been stable for
  // settleMs (and, when same-origin, its images have loaded), then show it once.
  useEffect(() => {
    const el = ref.current;
    if (!el || !autoResize) return;
    const reveal = () => setReady(true);
    const maxWait = setTimeout(reveal, maxWaitMs);
    let settle: ReturnType<typeof setTimeout> | undefined;
    const waitForSettle = () => {
      clearTimeout(settle);
      settle = setTimeout(() => (imagesPending(el) ? waitForSettle() : reveal()), settleMs);
    };
    iframeResize(
      {
        license: "GPLv3",
        log: false,
        // the first resize ('init') is the page's empty shell, before any content arrives
        onResized: ({ type }: { type: string }) => {
          if (type !== "init") waitForSettle();
        },
      } as any,
      el
    );
    return () => {
      clearTimeout(settle);
      clearTimeout(maxWait);
      (el as any).iFrameResizer?.disconnect?.();
    };
  }, [autoResize, settleMs, maxWaitMs]);

  const onLoad = () => {
    if (!props.stylesheet) return;
    try {
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL(props.stylesheet, window.location.origin).href;
      doc.head.appendChild(link);
    } catch (err) {
      console.warn("iframeEmbed: could not inject stylesheet into iframe:", err);
    }
  };

  const iframeStyle: React.CSSProperties = autoResize
    ? { width: "1px", minWidth: "100%", border: "none", opacity: ready ? 1 : 0, transition: "opacity 0.3s ease" }
    : {
        width: "100%",
        height: props.height ?? "100vh",
        minHeight: props.minHeight,
        border: "none",
        display: "block",
      };

  return (
    <div
      className={props.className}
      style={{
        position: "relative",
        height: ready ? undefined : placeholderHeight,
        overflow: ready ? undefined : "hidden",
      }}
    >
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: placeholderHeight,
          }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      <iframe ref={ref} id="iframe-target" src={url} title={props.title ?? "Results"} onLoad={onLoad} style={iframeStyle} />
    </div>
  );
};

export default IframeEmbed;
