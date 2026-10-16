import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "stemcell — every sound is an instrument",
  description:
    "an experimental browser instrument. capture a sound, break it into grains, and play it differently.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
