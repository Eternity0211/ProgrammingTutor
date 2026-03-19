import type { Metadata, Viewport } from "next";
import "@/app/styles/globals.css";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://grade-it-ten.vercel.app"),
  title: {
    template: "%s | GradeIt",
    default: "GradeIt - Online Classroom & Coding Assignment Platform",
  },
  description:
    "Empower learning, automate grading, and simplify coding assignments with our comprehensive platform for educators and students.",
  keywords: [
    "coding platform",
    "online classroom",
    "automated grading",
    "programming assignments",
    "education technology",
  ],
  authors: [{ name: "GradeIt Team" }],
  creator: "GradeIt",
  publisher: "GradeIt",
  formatDetection: {
    email: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://grade-it-ten.vercel.app",
    siteName: "GradeIt",
    title: "GradeIt - Online Classroom & Coding Assignment Platform",
    description:
      "Empower learning, automate grading, and simplify coding assignments with our comprehensive platform for educators and students.",
    images: [
      {
        url: "https://gradeit.example.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GradeIt Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GradeIt - Online Classroom & Coding Assignment Platform",
    description:
      "Empower learning, automate grading, and simplify coding assignments with our comprehensive platform for educators and students.",
    images: ["https://gradeit.example.com/twitter-image.jpg"],
    creator: "@gradeit",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png" }],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://grade-it-ten.vercel.app",
    languages: {
      "en-US": "https://grade-it-ten.vercel.app",
    },
  },
};

// Define viewport settings
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="GradeIT" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "GradeIt",
              url: "https://grade-it-ten.vercel.app",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://grade-it-ten.vercel.app/classes",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
