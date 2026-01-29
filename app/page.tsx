"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShinyButton } from "@/components/ShinyButton";
import {
  WarpDialog,
  WarpDialogContent,
  WarpDialogTrigger,
} from "@/components/WarpDialog";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const AUTH_API_BASE = "https://auth.molt.tech";
const AUTH_COOKIE = "molt_google_jwt";
const AUTH_COOKIE_MAX_AGE = 60 * 30;

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return "";
};

const setAuthCookie = (token: string) => {
  if (typeof document === "undefined") return;
  const isMoltDomain = window.location.hostname.endsWith("molt.tech");
  const cookieParts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    "path=/",
    `max-age=${AUTH_COOKIE_MAX_AGE}`,
    "samesite=lax",
  ];
  if (isMoltDomain) cookieParts.push("domain=.molt.tech");
  if (window.location.protocol === "https:") cookieParts.push("secure");
  document.cookie = cookieParts.join("; ");
};

const clearAuthCookie = () => {
  if (typeof document === "undefined") return;
  const isMoltDomain = window.location.hostname.endsWith("molt.tech");
  const cookieParts = [
    `${AUTH_COOKIE}=`,
    "path=/",
    "max-age=0",
    "samesite=lax",
  ];
  if (isMoltDomain) cookieParts.push("domain=.molt.tech");
  if (window.location.protocol === "https:") cookieParts.push("secure");
  document.cookie = cookieParts.join("; ");
};

type AuthState = "checking" | "unauth" | "authed";

function StartAuthModalContent() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [email, setEmail] = useState("");
  const [vpsCount, setVpsCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const verifyAuth = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride ?? getCookieValue(AUTH_COOKIE);
    if (!token) {
      setAuthState("unauth");
      setEmail("");
      setVpsCount(null);
      return;
    }

    setAuthState("checking");
    setMessage("");

    try {
      const meResponse = await fetch(`${AUTH_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meResponse.ok) {
        clearAuthCookie();
        setAuthState("unauth");
        setEmail("");
        setVpsCount(null);
        setMessage("Your session expired. Please sign in again.");
        return;
      }

      const meData = (await meResponse.json()) as {
        is_auth?: boolean;
        user_email?: string;
      };

      if (!meData?.is_auth || !meData.user_email) {
        clearAuthCookie();
        setAuthState("unauth");
        setEmail("");
        setVpsCount(null);
        setMessage("We couldn't verify your account. Please try again.");
        return;
      }

      setEmail(meData.user_email);
      setAuthState("authed");

      const vpsResponse = await fetch(`${AUTH_API_BASE}/check-my-vps`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!vpsResponse.ok) {
        setVpsCount(null);
        setMessage("We couldn't load your instances right now.");
        return;
      }

      const vpsData = (await vpsResponse.json()) as { count_vps?: number };
      setVpsCount(typeof vpsData.count_vps === "number" ? vpsData.count_vps : 0);
    } catch {
      setAuthState("unauth");
      setEmail("");
      setVpsCount(null);
      setMessage("We couldn't reach the auth service. Please try again.");
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  return (
    <div className="relative flex flex-col gap-6 text-center">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">
          molt.bot access
        </p>
        <h2 className="text-2xl font-semibold">
          {authState === "authed" ? `Hi, ${email}` : "Sign in to continue"}
        </h2>
        <p className="text-sm text-white/60">
          {authState === "authed"
            ? "Manage your molt.bot instances from one secure place."
            : "Connect your Google account to create and manage your molt.bot instance."}
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-white/70">
          {message}
        </div>
      ) : null}

      {authState === "checking" ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          Checking your access…
        </div>
      ) : null}

      {authState !== "authed" ? (
        <GoogleAuthButton
          onCredential={(credential) => {
            setAuthCookie(credential);
            verifyAuth(credential);
          }}
        />
      ) : null}

      {authState === "authed" && vpsCount === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-white/5 to-rose-500/20 px-5 py-4 text-sm text-white/80">
          Deploy your first molt.bot instance for just $10/month
        </div>
      ) : null}

      {authState === "authed" && typeof vpsCount === "number" && vpsCount > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
          Your molt.bot instances will appear here soon.
        </div>
      ) : null}

      {authState === "authed" && vpsCount === null ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
          We’re preparing your instance overview.
        </div>
      ) : null}

      {authState !== "authed" ? (
        <p className="text-[11px] text-white/40">
          By continuing you agree to our terms and confirm that you’ve read our
          privacy policy.
        </p>
      ) : null}
    </div>
  );
}

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = "10 molt.bots online",
  title = "Deploy your bot. Keep control.",
  subtitle = "Get a ready-to-use molt.bot instance in minutes, fully yours.",
}: {
  badge?: string;
  title?: string;
  subtitle?: string;
}) {
  const [typedText, setTypedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const typingText = useMemo(() => subtitle, [subtitle]);

  useEffect(() => {
    let mounted = true;
    let index = 0;
    setTypedText("");
    setIsTypingComplete(false);

    const typeNext = () => {
      if (!mounted) return;
      if (index <= typingText.length) {
        setTypedText(typingText.slice(0, index));
        index += 1;
        const delay = 35 + Math.random() * 35;
        setTimeout(typeNext, delay);
      } else {
        setIsTypingComplete(true);
      }
    };

    const startDelay = setTimeout(typeNext, 450);
    return () => {
      mounted = false;
      clearTimeout(startDelay);
    };
  }, [typingText]);

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303]">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />

        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.15]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
          >
            <Circle className="h-2 w-2 fill-green-500/80" />
            <span className="text-sm text-white/60 tracking-wide">
              {badge}
            </span>
          </motion.div>

          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
              <span
                className={cn(
                  "bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 "
                )}
              >
                {title}
              </span>
            </h1>
          </motion.div>

          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="text-base sm:text-lg md:text-xl text-white/40 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-2">
              <span className="inline-block">
                {typedText}
                <span
                  className={cn(
                    "inline-block w-[2px] h-[1.1em] bg-white/40 ml-1 align-middle transition-opacity duration-150",
                    isTypingComplete ? "opacity-0" : "opacity-100"
                  )}
                  aria-hidden="true"
                />
              </span>
            </p>
            <div className="flex justify-center mt-8 md:mt-10">
              <WarpDialog>
                <WarpDialogTrigger asChild>
                  <ShinyButton>Start</ShinyButton>
                </WarpDialogTrigger>
                <WarpDialogContent>
                  <StartAuthModalContent />
                </WarpDialogContent>
              </WarpDialog>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <HeroGeometric />
    </main>
  );
}
