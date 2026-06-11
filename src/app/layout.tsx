import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "B2B Order Portal",
  description: "Team apparel order intake & approval portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NextTopLoader
          color="#3b6ff6"
          height={3}
          shadow="0 0 10px #3b6ff6, 0 0 5px #3b6ff6"
          showSpinner={false}
          speed={300}
        />
        {children}
      </body>
    </html>
  );
}
