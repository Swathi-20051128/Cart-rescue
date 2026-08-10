/**
 * useHeartbeat
 * ─────────────
 * Keeps the user "ACTIVE" in the admin Live Carts view by pinging
 * /api/cart/heartbeat every 30 seconds while they browse the store.
 *
 * When the tab is closed or hidden, sends a "goodbye" via
 * navigator.sendBeacon — which works even during page unload —
 * so the user flips to INACTIVE in the admin view immediately.
 */
import { useEffect } from "react";
import api from "../api/axios.js";

const INTERVAL_MS = 30_000; // ping every 30 s

export default function useHeartbeat() {
  useEffect(() => {
    const token = localStorage.getItem("cg_token");
    if (!token) return; // not logged in, skip

    // ── Heartbeat helpers ────────────────────────────────────────
    const beat = () => api.post("/cart/heartbeat").catch(() => {});

    // Send immediately so admin sees ACTIVE right away
    beat();
    const intervalId = setInterval(beat, INTERVAL_MS);

    // ── Goodbye via sendBeacon (survives page unload) ────────────
    const sendGoodbye = () => {
      const url   = "/api/cart/goodbye";
      const body  = JSON.stringify({});
      const blob  = new Blob([body], { type: "application/json" });
      // sendBeacon uses the document base URL — prepend origin
      const full  = `${window.location.origin}${url}`;
      // sendBeacon cannot set custom headers, so we embed token in URL param
      // The server middleware reads from Authorization header, so we fall back
      // to a synchronous fetch with keepalive for browsers that support it.
      try {
        fetch(`${window.location.origin}/api/cart/goodbye`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
          keepalive: true, // key: works even during unload
        });
      } catch {
        // Fallback: sendBeacon (no auth header, server may reject — acceptable)
        navigator.sendBeacon && navigator.sendBeacon(full, blob);
      }
    };

    // ── Visibility change ────────────────────────────────────────
    // Handles: tab switch, minimize, laptop lid close, mobile backgrounding
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendGoodbye();
      } else {
        // User came back — ping heartbeat immediately
        beat();
      }
    };

    // ── Page unload / close ──────────────────────────────────────
    const onUnload = () => sendGoodbye();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);   // iOS + modern browsers
    window.addEventListener("beforeunload", onUnload); // desktop fallback

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);
}
