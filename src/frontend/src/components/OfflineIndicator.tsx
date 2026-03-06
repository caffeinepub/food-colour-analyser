import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.output
          data-ocid="offline_indicator.panel"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 30,
            mass: 0.7,
          }}
          className="fixed top-14 left-0 right-0 z-50 block"
          aria-live="polite"
          aria-label="Offline indicator"
        >
          <div
            className="flex items-center justify-center gap-2 px-4 py-2"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.38 0.14 28 / 0.97), oklch(0.40 0.16 30 / 0.97))",
              borderBottom: "1px solid oklch(0.55 0.18 30 / 0.4)",
            }}
          >
            <WifiOff
              size={13}
              className="text-white/90 flex-shrink-0"
              strokeWidth={2}
            />
            <p className="text-xs font-medium text-white/90 leading-none">
              You're offline — analysis uses cached data only
            </p>
          </div>
        </motion.output>
      )}
    </AnimatePresence>
  );
}
