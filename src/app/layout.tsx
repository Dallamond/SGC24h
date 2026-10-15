import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { title: "SGC24h — gestión Camis24h", robots: { index: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#C1502E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={grotesk.variable}>
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
