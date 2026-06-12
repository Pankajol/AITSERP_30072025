"use client";

import { useEffect } from "react";

export default function PhoneSafeView() {
  useEffect(() => {
    let mounted = true;

    async function setupPhoneViewport() {
      try {
        const [{ Capacitor }, { StatusBar, Style }] = await Promise.all([
          import("@capacitor/core"),
          import("@capacitor/status-bar"),
        ]);

        if (!mounted || !Capacitor.isNativePlatform()) return;

        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#F8FAFC" });
      } catch (error) {
        console.warn("Phone safe view setup skipped:", error);
      }
    }

    setupPhoneViewport();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
