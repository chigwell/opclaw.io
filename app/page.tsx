"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShinyButton } from "@/components/ShinyButton";
import {
  WarpDialog,
  WarpDialogContent,
  WarpDialogTrigger,
} from "@/components/WarpDialog";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const AUTH_API_BASE = "https://auth.molt.tech";
const SSH_WS_BASE = "wss://ssh.molt.tech/ws/terminal";
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

function TerminalView({
  vpsIp,
  onBack,
}: {
  vpsIp: string;
  onBack: () => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [status, setStatus] = useState("Connecting…");

  useEffect(() => {
    const ensureCss = () => {
      if (document.getElementById("xterm-css")) return;
      const link = document.createElement("link");
      link.id = "xterm-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/xterm/css/xterm.css";
      document.head.appendChild(link);
    };

    const ensureScript = (onReady: () => void) => {
      if ((window as any).Terminal) {
        onReady();
        return;
      }

      if (document.getElementById("xterm-js")) {
        document
          .getElementById("xterm-js")
          ?.addEventListener("load", onReady, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "xterm-js";
      script.src = "https://cdn.jsdelivr.net/npm/xterm/lib/xterm.js";
      script.async = true;
      script.onload = onReady;
      document.body.appendChild(script);
    };

    ensureCss();

    ensureScript(() => {
      if (initializedRef.current) return;
      const Terminal = (window as any).Terminal;
      if (!Terminal || !terminalRef.current) return;

      initializedRef.current = true;
      terminalRef.current.innerHTML = "";

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
        fontSize: 13,
        theme: {
          background: "#0b0b0c",
          foreground: "#e8e8ee",
        },
      });
      term.open(terminalRef.current);
      termRef.current = term;

      const token = getCookieValue(AUTH_COOKIE);
      if (!token) {
        term.write("No auth token found. Please sign in again.\r\n");
        setStatus("Unauthorized");
        return;
      }

      const wsUrl = `${SSH_WS_BASE}?vps_ip=${encodeURIComponent(
        vpsIp
      )}&token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("Connected");
      };
      ws.onmessage = (event) => {
        term.write(event.data);
      };
      ws.onerror = () => {
        setStatus("Connection failed");
        term.write("\r\nConnection failed.\r\n");
      };
      ws.onclose = () => {
        setStatus("Disconnected");
        term.write("\r\nConnection closed.\r\n");
      };

      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    });

    return () => {
      initializedRef.current = false;
      wsRef.current?.close();
      termRef.current?.dispose?.();
      wsRef.current = null;
      termRef.current = null;
    };
  }, [vpsIp]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-white/70">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-white/50">
          Terminal — {vpsIp}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
            {status}
          </span>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
          >
            Back
          </button>
        </div>
      </div>
      <div className="h-[560px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0c]">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      <p className="mt-3 text-[11px] text-white/40">
        If the terminal doesn’t load, please check your access or try again.
      </p>
    </div>
  );
}

function StartAuthModalContent({
  onHasInstances,
}: {
  onHasInstances: (hasInstances: boolean) => void;
}) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [email, setEmail] = useState("");
  const [vpsCount, setVpsCount] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "terminal">("list");
  const [selectedVps, setSelectedVps] = useState<{
    ip: string;
    status: number;
    code: string;
    allocated_from: string | null;
    allocated_till: string | null;
  } | null>(null);
  const [vpsList, setVpsList] = useState<
    Array<{
      ip: string;
      status: number;
      code: string;
      allocated_from: string | null;
      allocated_till: string | null;
    }>
  >([]);
  const [message, setMessage] = useState("");

  const resetToUnauth = useCallback((msg?: string) => {
    clearAuthCookie();
    setAuthState("unauth");
    setEmail("");
    setVpsCount(null);
    setView("list");
    setSelectedVps(null);
    setVpsList([]);
    if (msg) setMessage(msg);
  }, []);

  const verifyAuth = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride ?? getCookieValue(AUTH_COOKIE);
      if (!token) {
        setAuthState("unauth");
        setEmail("");
        setVpsCount(null);
        setView("list");
        setSelectedVps(null);
        setVpsList([]);
        onHasInstances(false);
        return;
      }

    setAuthState("checking");
    setMessage("");

    try {
      const meResponse = await fetch(`${AUTH_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meResponse.ok) {
        resetToUnauth("Your session expired. Please sign in again.");
        onHasInstances(false);
        return;
      }

      const meData = (await meResponse.json()) as {
        is_auth?: boolean;
        user_email?: string;
      };

      if (!meData?.is_auth || !meData.user_email) {
        resetToUnauth("We couldn't verify your account. Please try again.");
        onHasInstances(false);
        return;
      }

      setEmail(meData.user_email);
      setAuthState("authed");

      const vpsResponse = await fetch(`${AUTH_API_BASE}/check-my-vps`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!vpsResponse.ok) {
        if (vpsResponse.status === 401) {
          resetToUnauth("Your session expired. Please sign in again.");
          return;
        }
        setVpsCount(null);
        setMessage("We couldn't load your instances right now.");
        return;
      }

      const vpsData = (await vpsResponse.json()) as { count_vps?: number };
      const count =
        typeof vpsData.count_vps === "number" ? vpsData.count_vps : 0;
      setVpsCount(count);
      onHasInstances(count > 0);

      if (count > 0) {
        const listResponse = await fetch(`${AUTH_API_BASE}/list-my-vps`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!listResponse.ok) {
          if (listResponse.status === 401) {
            resetToUnauth("Your session expired. Please sign in again.");
            onHasInstances(false);
            return;
          }
          setMessage("We couldn't load your instances right now.");
          setVpsList([]);
          return;
        }

        const listData = (await listResponse.json()) as {
          vps?: Array<{
            ip: string;
            status: number;
            code: string;
            allocated_from: string | null;
            allocated_till: string | null;
          }>;
        };

        setVpsList(Array.isArray(listData.vps) ? listData.vps : []);
      } else {
        setVpsList([]);
      }
    } catch {
      resetToUnauth("We couldn't reach the auth service. Please try again.");
      onHasInstances(false);
    }
    },
    [onHasInstances, resetToUnauth]
  );

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
        <>
          {view === "list" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70">
              <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">
                Your instances
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-xs text-white/70">
                  <thead className="bg-white/[0.06] text-[11px] uppercase tracking-[0.2em] text-white/50">
                    <tr>
                      <th className="px-3 py-2 text-left">IP</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">From</th>
                      <th className="px-3 py-2 text-left">Till</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-white/[0.02]">
                    {vpsList.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-white/50" colSpan={6}>
                          Loading your instances…
                        </td>
                      </tr>
                    ) : (
                      vpsList.map((vps, index) => (
                        <tr key={`${vps.ip}-${index}`}>
                          <td className="px-3 py-2 font-medium text-white/80">
                            {vps.ip}
                          </td>
                          <td className="px-3 py-2">
                            {vps.status === 1 ? "Active" : "Pending"}
                          </td>
                          <td className="px-3 py-2">{vps.code}</td>
                          <td className="px-3 py-2">
                            {vps.allocated_from ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {vps.allocated_till ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVps(vps);
                                setView("terminal");
                              }}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
                            >
                              Connect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {view === "terminal" && selectedVps ? (
            <TerminalView
              vpsIp={selectedVps.ip}
              onBack={() => setView("list")}
            />
          ) : null}
        </>
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
  const [hasInstances, setHasInstances] = useState(false);
  const handleHasInstances = useCallback((value: boolean) => {
    setHasInstances(value);
  }, []);
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
                <WarpDialogContent className={hasInstances ? "max-w-3xl" : ""}>
                  <StartAuthModalContent
                    onHasInstances={handleHasInstances}
                  />
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
