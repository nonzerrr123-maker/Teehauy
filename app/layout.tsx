import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeSync } from "@/components/theme-sync";

import "./globals.css";

export const metadata: Metadata = {
  title: "Teehuay | Dream Number Community",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#090b10" },
  ],
};

const themeInitializer = `(function(){try{var t=localStorage.getItem("teehauy:theme");if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t==="system"?"light dark":t}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" data-theme="system" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body>
        {children}
        <ThemeSync />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
