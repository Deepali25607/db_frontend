import { useEffect } from "react";

// Re-runs `fn` when the tab regains focus and on a gentle interval, so
// on-screen prices follow the rates published in the admin Rate Console
// without the visitor having to reload the page.
export function useLiveRefresh(fn, deps, intervalMs = 60000) {
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) fn();
    };
    const timer = setInterval(tick, intervalMs);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
