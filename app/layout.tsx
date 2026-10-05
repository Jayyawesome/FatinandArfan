import type { Metadata, Viewport } from "next";
import "../src/styles/index.css";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: "Fatin & Arfan - Jemputan Perkahwinan | 8 November 2026",
  description:
    "Anda dijemput ke Majlis Perkahwinan Fatin Syazwani binti Jeffri dan Muhammad Arfan bin Mayiddin pada 8 November 2026, 12.00 tengah hari hingga 5.00 petang, di Dewan Semai Bakti Felda Teloi Timur, Kuala Ketil, Kedah.",
  icons: { icon: "/favicon.svg" },
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
