import type { Metadata } from "next";
import "./globals.css";

const title = "stemcell — free online granular synth";
const description =
  "stemcell is a free online granular synth that runs in your browser. turn your voice into an instrument or turn any sound into an instrument — capture it, shred it into grains, and play it differently. no download, no account.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.enigma-labs.com"),
  title,
  description,
  keywords: [
    "stemcell",
    "free online synth",
    "free granular synth",
    "turn your voice into an instrument",
    "turn any sound into an instrument",
    "granular synthesis",
    "granular synth online",
    "browser synthesizer",
    "web audio synth",
    "online instrument",
    "free synth",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "stemcell",
    images: [
      {
        url: "/logo/logo-with-tagline_for-dark-bg_2x.png",
        width: 1130,
        height: 376,
        alt: "stemcell — free online granular synth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/logo/logo-with-tagline_for-dark-bg_2x.png"],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "stemcell",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and Web Audio API support",
  description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Climate+Crisis:YEAR@1979&family=Michroma&family=Oi&display=swap"
        rel="stylesheet"
      />
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
