import React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import Provider from "./Provider";
import AppLayout from "./layout";
import Analytics from "./components/Analytics";
import ScrollToTop from "./components/ScrollToTop";
import "./index.css";

// ─── Document shell ───────────────────────────────────────────────────────────
// This is rendered on EVERY request (server + client).
// <Meta /> injects route-level title/description/og tags from each page's meta() export.
// <Links /> injects CSS and canonical links.
// <Scripts /> injects the React client bundle (entry.client.tsx).
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#000000" />
        {/* hreflang — tells Google this site targets English speakers in India */}
        <link rel="alternate" hrefLang="en-in" href="https://theplugmarket.in/" />
        <link rel="alternate" hrefLang="en" href="https://theplugmarket.in/" />

        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo-192.png" />

        {/* Preconnect for Supabase — eliminates ~600ms DNS+TLS cold-start
            on the first client-side Supabase call (similar products, etc.) */}
        <link rel="preconnect" href={import.meta.env.VITE_SUPABASE_URL} crossOrigin="" />
        <link rel="dns-prefetch" href={import.meta.env.VITE_SUPABASE_URL} />

        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
          media="print"
          // @ts-expect-error — onload trick for non-render-blocking fonts
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
            rel="stylesheet"
          />
        </noscript>

        {/* Site-wide JSON-LD — always present on every page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "The Plug Market",
              alternateName: ["Plug Market", "theplugmarket.in"],
              url: "https://theplugmarket.in/",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://theplugmarket.in/browse?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "The Plug Market",
              url: "https://theplugmarket.in/",
              logo: "https://theplugmarket.in/logo.svg",
              sameAs: ["https://www.instagram.com/the.plugmarket/"],
            }),
          }}
        />

        {/* Google Analytics 4 */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-M950V9PN8Y"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-M950V9PN8Y',{send_page_view:false});`,
          }}
        />

        {/* Microsoft Clarity */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vnqsd1wrtj");`,
          }}
        />

        {/* React Router injects route-level <meta> and <link rel="canonical"> here */}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// ─── Root route component ─────────────────────────────────────────────────────
// Wraps every page. Providers here run on the CLIENT only (they use browser APIs).
export default function Root() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Provider>
          <ScrollToTop />
          <Analytics />
          <AppLayout>
            <Outlet />
          </AppLayout>
        </Provider>
      </AuthProvider>
    </HelmetProvider>
  );
}
