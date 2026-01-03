import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "RedditFrost - AI-Powered Reddit Marketing Automation",
  description: "The Ultimate Blueprint for Human-Centric Reddit Marketing Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="min-h-screen">
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

