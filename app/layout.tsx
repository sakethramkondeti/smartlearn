import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cognix — AI-Powered Personalized Adaptive Learning Platform",
  description:
    "Tell us what you want to learn. We'll tell you what to learn next. Dynamic roadmaps, Socratic AI tutoring, Bayesian knowledge tracing, and spaced repetition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${sansFont.variable} ${monoFont.variable}`}>
      <body className="h-full font-sans antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

