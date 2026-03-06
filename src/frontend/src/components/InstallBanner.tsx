import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Smartphone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";

export default function InstallBanner() {
  const { canInstall, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(DISMISSED_KEY),
  );

  const visible = canInstall && !dismissed;

  const handleInstall = async () => {
    await triggerInstall();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-ocid="install_banner.panel"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 340,
            damping: 32,
            mass: 0.8,
          }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4rem)] left-0 right-0 z-[60] mx-3 mb-2"
          role="banner"
          aria-label="Install app"
        >
          <div
            className="
              flex items-center gap-3 px-4 py-3 rounded-xl
              border border-[oklch(0.35_0.04_175/0.45)]
              shadow-[0_-2px_24px_oklch(0.72_0.18_175/0.12),0_4px_20px_oklch(0_0_0/0.5)]
              backdrop-blur-md
            "
            style={{
              background:
                "linear-gradient(135deg, oklch(0.18 0.014 220 / 0.97), oklch(0.20 0.016 215 / 0.97))",
            }}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Smartphone
                size={18}
                className="text-primary"
                strokeWidth={1.75}
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                Install Food Colour Analyser
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                Add to home screen for quick access
              </p>
            </div>

            {/* Install button */}
            <button
              type="button"
              data-ocid="install_banner.primary_button"
              onClick={handleInstall}
              className="
                flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-primary text-primary-foreground
                hover:bg-primary/85 active:scale-95
                transition-all duration-150
                focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
              "
              aria-label="Install app to home screen"
            >
              Install
            </button>

            {/* Dismiss button */}
            <button
              type="button"
              data-ocid="install_banner.close_button"
              onClick={handleDismiss}
              className="
                flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                text-muted-foreground hover:text-foreground hover:bg-muted/40
                transition-colors duration-150
                focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
              "
              aria-label="Dismiss install prompt"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
