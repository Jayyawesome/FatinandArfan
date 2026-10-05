import type { Metadata, Viewport } from "next";
import "../src/styles/index.css";

const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Fatin & Arfan - Jemputan Perkahwinan | 8 November 2026",
  description:
    "Anda dijemput ke Majlis Perkahwinan Fatin Syazwani binti Jeffri dan Muhammad Arfan bin Mayiddin pada 8 November 2026, 12.00 tengah hari hingga 5.00 petang, di Dewan Semai Bakti Felda Teloi Timur, Kuala Ketil, Kedah.",
  icons: { icon: { url: "/fatin-arfan-logo.png", type: "image/png" }, apple: "/fatin-arfan-logo.png" },
  openGraph: {
    title: "Fatin & Arfan - Jemputan Perkahwinan",
    description: "Ahad, 8 November 2026 - Dewan Semai Bakti Felda Teloi Timur, 09300 Kuala Ketil, Kedah.",
    locale: "ms_MY",
    type: "website",
    images: [{ url: "/Main Page.png" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6b2226",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
