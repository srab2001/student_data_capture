import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IEP Capture Pilot",
  description:
    "A single-classroom HCPSS prototype for fast, in-classroom IEP progress data capture.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
