import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

import { ACCENTS } from '../src/theme/tokens';

/**
 * The OS chrome tint of the installed app, read from the theme module rather
 * than written down again (CP-008 — a colour literal in a head tag is exactly
 * the kind that `check:contrast` never sees). `public/manifest.webmanifest`
 * cannot import anything, being static JSON, so `src/pwa/manifest.test.ts`
 * asserts the two agree.
 */
const THEME_COLOR = ACCENTS.find((accent) => accent.key === 'rosifit')!.deep;

/**
 * The root HTML document for every statically exported web page.
 *
 * Web-only, and it runs in Node during `expo export` — there is no DOM here.
 *
 * It exists so the app can be INSTALLED (requests/2026-09-07-installable-pwa.md).
 * The `expo.web` PWA keys in `app.json` — `name`, `shortName`, `themeColor`,
 * `backgroundColor`, `display`, `startUrl`, `description` — are options of the
 * old `@expo/webpack-config` PWA pipeline. This app exports through Metro
 * (`web.bundler: "metro"`), which never reads them, so they emitted no manifest
 * and no head tags: they have been inert the whole time the app has called
 * itself a PWA. The tags below are what actually makes it one.
 *
 * Everything above the PWA block reproduces the document Expo generated before
 * this file existed, byte for byte — `.evidence/pwa-head-before.txt` is the
 * baseline the export is diffed against.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
        */}
        <ScrollViewStyleReset />

        {headNodes}

        {/* ---- Installable PWA ---------------------------------------------- */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content={THEME_COLOR} />

        {/* iOS Safari reads none of the manifest: standalone launch, the status
            bar and the home-screen icon are these four tags or nothing.
            `apple-mobile-web-app-capable` is superseded by
            `mobile-web-app-capable` but is still what shipped Safari honours,
            so both are present. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RosiFit" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Registered from a plain script rather than a React effect on purpose:
            nothing here may make the first client render disagree with this
            export (CP-015). Registration failing is not worth a message — the
            app works exactly as it always has without a worker, it simply
            cannot be installed on Chromium. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (error) {
      console.error('RosiFit: service worker registration failed', error);
    });
  });
}
`.trim(),
          }}
        />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
