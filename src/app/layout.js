import localFont from "next/font/local";
import "./globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import PhoneSafeView from "@/components/PhoneSafeView";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Pankajal ERP",
  description: "Pankajal ERP - Cloud ERP for Indian businesses",
   viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</head>
      {/* viewport-fit=cover is essential for notches / dynamic island */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          margin: 0,
          padding: 0,          // ← removed env() padding – handled by navbar and sections
          minHeight: "100dvh",
          backgroundColor: "#F8FAFC",
        }}
      >
        {/* main scrollable content – no extra safe‑area padding here */}
        <PhoneSafeView />
        <div className="app-safe-view flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </div>

        {/* Toast container with safe‑area aware positioning */}
        <ToastContainer
          position="top-right"
          style={{
            top: "var(--safe-top)",
            right: "var(--safe-right)",
          }}
          toastClassName="!rounded-xl !shadow-lg !font-sans"
        />
      </body>
    </html>
  );
}
