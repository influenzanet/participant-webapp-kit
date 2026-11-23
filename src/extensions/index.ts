import React, { Suspense } from "react";
import { PhoneVerificationBanner } from "@influenzanet/case-web-app-core";

// Lazy so a country that doesn't use an extension doesn't pay for it in the main bundle.
const LazyIframeEmbed = React.lazy(() => import("./IframeEmbed"));
const LazyBlogPosts = React.lazy(() => import("./BlogPosts/BlogPosts"));

const lazy = (C: React.ComponentType<any>) => (props: any) =>
  React.createElement(Suspense, { fallback: null }, React.createElement(C, props));

export const IframeEmbed = lazy(LazyIframeEmbed);
export const BlogPosts = lazy(LazyBlogPosts);

/** Extension names usable in pages.json (`"config": { "type": "<name>", ... }`). */
export const defaultExtensions = [
  { name: "iframeEmbed", component: IframeEmbed },
  { name: "blogPosts", component: BlogPosts },
  // From the core, which hides it unless the platform has WhatsApp on and the participant has
  // an unverified phone number: safe on every country's pages.
  { name: "phoneVerificationBanner", component: PhoneVerificationBanner },
];
