import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const fd = Chakra_Petch({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-fd" });
const fm = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-fm" });
const fb = IBM_Plex_Sans({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-fb" });

export const metadata: Metadata = {
  title: "FEEDRATE — Instant CNC Quotes & Design Marketplace",
  description: "Design or upload a part, get an instant CNC price, and sell your designs. No sign-up to try.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fd.variable} ${fm.variable} ${fb.variable}`}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
