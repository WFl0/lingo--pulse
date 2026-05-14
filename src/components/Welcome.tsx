import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { hasBeenWelcomed, markWelcomed } from "@/lib/storage";

export function Welcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasBeenWelcomed()) setOpen(true);
  }, []);

  const dismiss = () => {
    markWelcomed();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 grid place-items-center p-6"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.14 0.02 180 / 0.96), oklch(0.08 0.02 180 / 0.99))",
            backdropFilter: "blur(20px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative max-w-lg w-full rounded-3xl p-10 text-center"
            style={{ boxShadow: "var(--shadow-elegant), var(--shadow-glow)" }}
          >
            <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-2xl glass">
              <img
                src={logo}
                alt="LINGO PULSE"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient-primary mb-3">
              LINGO PULSE
            </h1>
            <p className="text-lg text-foreground/80 mb-2">
              Your luxury AI conversation companion
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Speak. Think. Be understood — in real, natural English.
            </p>

            <div className="space-y-3 mb-8 text-left">
              <div className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="text-accent">◆</span>
                <span>Talk with your voice — see your words appear and corrected live</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="text-accent">◆</span>
                <span>Hear ultra-realistic voice replies powered by ElevenLabs</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="text-accent">◆</span>
                <span>Choose how it speaks: formal, friendly, concise, or deep</span>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="w-full py-4 rounded-full text-base font-semibold text-primary-foreground transition-smooth hover:scale-[1.02]"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              Begin Conversation
            </button>

            <div className="mt-8 pt-6 border-t border-border space-y-1">
              <p className="text-xs text-muted-foreground">
                Designed & developed by{" "}
                <span className="text-gradient-gold font-semibold">
                  Ahmed Abu Hlail
                </span>
              </p>
              <p className="text-xs">
                <span className="text-gradient-gold font-semibold">
                  صناعة سعودية 100/100
                </span>{" "}
                🇸🇦
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
