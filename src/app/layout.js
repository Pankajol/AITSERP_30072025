import localFont from "next/font/local";
import "./globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'


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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></meta>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
        style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)", margin: 0 }}
      >
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
