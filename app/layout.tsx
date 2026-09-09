import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/service-worker-register";

import "./globals.css";

export const metadata: Metadata = {
  title: "ตีเลขฝัน | Teehauy",
  description: "ตีความความฝัน ค้นหาเลขมงคล เก็บประวัติ และดูสถิติในธีมลึกลับของ Teehauy",
  applicationName: "Teehauy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Teehauy",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06060C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
