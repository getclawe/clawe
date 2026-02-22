import type { Metadata } from "next";
import localFont from "next/font/local";
import { Montserrat, Space_Grotesk } from "next/font/google";
import "@clawe/ui/globals.css";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ApiClientProvider } from "@/providers/api-client-provider";
import { Toaster } from "@clawe/ui/components/sonner";
import { RuntimeConfig } from "@/components/runtime-config";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Clawe",
  description: "AI-powered multi-agent coordination system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${spaceGrotesk.variable}`}
      >
        <RuntimeConfig />
        <QueryProvider>
          <AuthProvider>
            <ApiClientProvider>
              <ConvexClientProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  {children}
                  <Toaster />
                </ThemeProvider>
              </ConvexClientProvider>
            </ApiClientProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
