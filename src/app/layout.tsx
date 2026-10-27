import type { Metadata } from "next";
import "./globals.css";

const description =
  "A warm, editorial bookshelf of real covers — hover a spine, pull a book, and ask the shelves what you are looking for.";

export const metadata: Metadata = {
  title: {
    default: "Your virtual library",
    template: "%s",
  },
  description,
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Your virtual library",
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your virtual library",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Karla:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
