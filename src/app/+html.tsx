// Custom HTML shell (expo-router static rendering, WAV-55). Runs only in
// Node during export — no browser APIs, no global CSS imports.
import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>WAVstract</title>
        <meta name="theme-color" content="#050505" />
        {/* iOS Add-to-Home-Screen: the user's logo + standalone app behavior */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WAVstract" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
