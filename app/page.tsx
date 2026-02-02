"use client";

import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShinyButton } from "@/components/ShinyButton";
import { TestimonialsSection } from "@/components/blocks/testimonials-with-marquee";
import StarOnGithub from "@/components/ui/button-github";
import {
  WarpDialog,
  WarpDialogContent,
  WarpDialogTrigger,
} from "@/components/WarpDialog";
import testimonialsData from "@/app/testimonials.json";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const AUTH_API_BASE = "https://auth.opclaw.io";
const BILLING_API_BASE = "https://billing.opclaw.io";
const STRIPE_PRICE_ID = "price_1SuvTrCjeNi5bLgNMGVVWZCU";
const STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/3cIaEWdGA3pz4Mq5Mgd7q00";
const SSH_WS_BASE = "wss://ssh.opclaw.io/ws/terminal";
const AUTH_COOKIE = "opclaw_google_jwt";
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
  const isOpClawDomain = window.location.hostname.endsWith("opclaw.io");
  const cookieParts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    "path=/",
    `max-age=${AUTH_COOKIE_MAX_AGE}`,
    "samesite=lax",
  ];
  if (isOpClawDomain) cookieParts.push("domain=.opclaw.io");
  if (window.location.protocol === "https:") cookieParts.push("secure");
  document.cookie = cookieParts.join("; ");
};

const clearAuthCookie = () => {
  if (typeof document === "undefined") return;
  const isOpClawDomain = window.location.hostname.endsWith("opclaw.io");
  const cookieParts = [
    `${AUTH_COOKIE}=`,
    "path=/",
    "max-age=0",
    "samesite=lax",
  ];
  if (isOpClawDomain) cookieParts.push("domain=.opclaw.io");
  if (window.location.protocol === "https:") cookieParts.push("secure");
  document.cookie = cookieParts.join("; ");
};

type AuthState = "checking" | "unauth" | "authed";

const trackLogin = (method: string) => {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: any[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "login", { method });
};

function PaymentView({
  onBack,
  status,
  error,
}: {
  onBack: () => void;
  status: string;
  error: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left text-sm text-white/70">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-white/50">
          Deploy OpenClaw
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:bg-white/10"
        >
          Back
        </button>
      </div>
      <div className="space-y-3">
        <div className="text-sm text-white/80">
          OpenClaw VPS (4 vCPU / 8GB RAM) — $10/month
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          {status}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
          We opened a secure Stripe checkout in a new tab. Complete the payment
          there, and we’ll confirm it here automatically.
        </div>
        {error ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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
        fontSize: 12,
        lineHeight: 1.1,
        scrollback: 200,
        theme: {
          background: "#0b0b0c",
          foreground: "#e8e8ee",
        },
      });
      term.open(terminalRef.current);
      termRef.current = term;

      const resizeToFit = () => {
        if (!terminalRef.current) return;
        const { clientWidth, clientHeight } = terminalRef.current;
        const lineHeight = 12 * 1.1;
        const rows = Math.max(
          10,
          Math.floor((clientHeight - 8) / lineHeight) - 2
        );
        const cols = Math.max(40, Math.floor(clientWidth / 8));
        term.resize(cols, rows);
      };
      resizeToFit();
      resizeObserverRef.current = new ResizeObserver(resizeToFit);
      resizeObserverRef.current.observe(terminalRef.current);

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
      resizeObserverRef.current?.disconnect?.();
      resizeObserverRef.current = null;
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
      <div className="h-[70vh] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0c]">
        <div ref={terminalRef} className="h-full w-full min-w-[1000px]" />
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
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "terminal" | "payment">("list");
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
  const [paymentStatus, setPaymentStatus] = useState(
    "Waiting for payment confirmation…"
  );
  const [paymentError, setPaymentError] = useState("");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [provisioningCheck, setProvisioningCheck] = useState(false);
  const provisioningRef = useRef<number | null>(null);
  const provisioningAttemptsRef = useRef(0);
  const noCapacityNotifySentRef = useRef(false);
  const authAnalyticsSentRef = useRef(false);
  const authNotifySentRef = useRef(false);
  const pendingPollingRef = useRef<number | null>(null);
  const paymentOpenedRef = useRef(false);
  const paymentPollingRef = useRef<number | null>(null);
  const paymentStoppedRef = useRef(false);

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
      if (!authNotifySentRef.current) {
        authNotifySentRef.current = true;
        const token = getCookieValue(AUTH_COOKIE);
        if (token) {
          fetch(`${AUTH_API_BASE}/notifications-set?message_type=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null);
        }
      }
      if (!authAnalyticsSentRef.current) {
        authAnalyticsSentRef.current = true;
        trackLogin("Google");
      }

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
        setAvailableCount(null);
        setPendingStatus(false);
        setPendingMessage("");
      }
      if (count === 0 && view === "terminal") {
        setView("list");
        setSelectedVps(null);
      }
      if (count > 0 && view === "payment") {
        setView("list");
      }

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
    [onHasInstances, resetToUnauth, view]
  );

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  useEffect(() => {
    if (authState !== "authed" || vpsCount !== 0) return;
    const fetchAvailable = async () => {
      try {
        const response = await fetch(`${AUTH_API_BASE}/available-vps`);
        if (!response.ok) {
          setAvailableCount(null);
          return;
        }
        const data = (await response.json()) as { count_vps?: number };
        const count =
          typeof data.count_vps === "number" ? data.count_vps : null;
        setAvailableCount(count);
      } catch {
        setAvailableCount(null);
      }
    };
    fetchAvailable();
  }, [authState, vpsCount]);

  useEffect(() => {
    if (authState !== "authed" || (typeof vpsCount === "number" && vpsCount > 0)) {
      noCapacityNotifySentRef.current = false;
    }
  }, [authState, vpsCount]);

  useEffect(() => {
    if (!provisioningCheck) return;

    const schedule = () => {
      provisioningRef.current = window.setTimeout(async () => {
        await verifyAuth();
        provisioningAttemptsRef.current += 1;
        if (vpsCount && vpsCount > 0) {
          setProvisioningCheck(false);
          return;
        }
        if (provisioningAttemptsRef.current >= 12) {
          setProvisioningCheck(false);
          return;
        }
        schedule();
      }, 5000);
    };

    schedule();

    return () => {
      if (provisioningRef.current) {
        window.clearTimeout(provisioningRef.current);
        provisioningRef.current = null;
      }
    };
  }, [provisioningCheck, verifyAuth, vpsCount]);

  const stopPaymentPolling = useCallback(() => {
    paymentStoppedRef.current = true;
    if (paymentPollingRef.current) {
      window.clearTimeout(paymentPollingRef.current);
      paymentPollingRef.current = null;
    }
  }, []);

  const startPendingPolling = useCallback(() => {
    if (pendingPollingRef.current) return;
    const token = getCookieValue(AUTH_COOKIE);
    if (!token) return;
    const poll = async () => {
      try {
        const response = await fetch(`${BILLING_API_BASE}/pending-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { pending?: boolean };
        if (!data.pending) {
          setPendingStatus(false);
          setPendingMessage("");
          if (pendingPollingRef.current) {
            window.clearTimeout(pendingPollingRef.current);
            pendingPollingRef.current = null;
          }
          verifyAuth();
          return;
        }
      } catch {
        return;
      }
      pendingPollingRef.current = window.setTimeout(poll, 10000);
    };
    pendingPollingRef.current = window.setTimeout(poll, 10000);
  }, [verifyAuth]);

  useEffect(() => {
    if (authState !== "authed") return;
    const token = getCookieValue(AUTH_COOKIE);
    if (!token) return;
    fetch(`${BILLING_API_BASE}/pending-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { pending?: boolean } | null) => {
        if (data?.pending) {
          setPendingStatus(true);
          setPendingMessage(
            "Your VPS is being prepared. We’ll notify you by email when it’s ready (usually within 8 hours)."
          );
          startPendingPolling();
        }
      })
      .catch(() => null);
  }, [authState, startPendingPolling]);

  useEffect(() => {
    if (!paymentInProgress) {
      stopPaymentPolling();
      paymentOpenedRef.current = false;
      return;
    }

    paymentStoppedRef.current = false;
    setPaymentError("");
    setPaymentStatus("Waiting for payment confirmation…");

    const token = getCookieValue(AUTH_COOKIE);
    if (!token) {
      resetToUnauth("Your session expired. Please sign in again.");
      setPaymentError("Please sign in again to continue.");
      setPaymentStatus("Unauthorized");
      setPaymentInProgress(false);
      setView("list");
      return;
    }

    if (!paymentOpenedRef.current) {
      paymentOpenedRef.current = true;
      const encodedEmail = encodeURIComponent(email || "");
      const paymentUrl = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodedEmail}`;
      window.open(paymentUrl, "_blank", "noopener,noreferrer");
    }

    const poll = async () => {
      if (paymentStoppedRef.current) return;
      try {
        const response = await fetch(`${BILLING_API_BASE}/check-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          resetToUnauth("Your session expired. Please sign in again.");
          setPaymentError("Please sign in again to continue.");
          setPaymentStatus("Unauthorized");
          setPaymentInProgress(false);
          setView("list");
          return;
        }
        if (!response.ok) {
          if (response.status === 409) {
            let payload: { error?: string; pending?: boolean } | null = null;
            try {
              payload = (await response.json()) as {
                error?: string;
                pending?: boolean;
              };
            } catch {
              payload = null;
            }
            setPaymentStatus("Payment confirmed");
            paymentStoppedRef.current = true;
            setPaymentInProgress(false);
            setView("list");
            setPendingStatus(true);
            setPendingMessage(
              "Your VPS is being prepared. We’ll notify you by email when it’s ready (usually within 8 hours)."
            );
            startPendingPolling();
            if (
              payload?.pending &&
              payload?.error === "No available VPS" &&
              !noCapacityNotifySentRef.current
            ) {
              noCapacityNotifySentRef.current = true;
              const token = getCookieValue(AUTH_COOKIE);
              if (token) {
                fetch(`${AUTH_API_BASE}/notifications-set?message_type=3`, {
                  headers: { Authorization: `Bearer ${token}` },
                }).catch(() => null);
              }
            }
            return;
          }
          setPaymentError("We couldn't check payment status. Retrying…");
          setPaymentStatus("Waiting for payment confirmation…");
          return;
        }
        const data = (await response.json()) as { ok?: boolean };
        if (data.ok) {
          setPaymentStatus("Payment confirmed");
          paymentStoppedRef.current = true;
          setPaymentInProgress(false);
          setView("list");
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("success", "1");
            window.history.replaceState({}, "", url.toString());
          }
          verifyAuth();
          setMessage("Payment confirmed. Provisioning your instance now.");
          setProvisioningCheck(true);
          provisioningAttemptsRef.current = 0;
        }
      } catch {
        setPaymentError("We couldn't reach the billing service. Retrying…");
        setPaymentStatus("Waiting for payment confirmation…");
      }
    };

    const schedule = () => {
      if (paymentStoppedRef.current) return;
      paymentPollingRef.current = window.setTimeout(async () => {
        await poll();
        schedule();
      }, 4000);
    };

    poll();
    schedule();

    return () => {
      stopPaymentPolling();
    };
  }, [email, paymentInProgress, resetToUnauth, stopPaymentPolling, verifyAuth]);

  return (
    <div className="relative flex flex-col gap-6 text-center">
      {view !== "terminal" ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            OpenClaw access
          </p>
          <h2 className="text-2xl font-semibold">
            {authState === "authed"
              ? `Hi, ${
                  email.length > 22 ? `${email.slice(0, 20)}..` : email
                }`
              : "Sign in to continue"}
          </h2>
          <p className="text-sm text-white/60">
            {authState === "authed"
              ? "Manage your OpenClaw instances from one secure place."
              : "Connect your Google account to create and manage your OpenClaw instance."}
          </p>
        </div>
      ) : null}

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
        <>
          {view === "list" ? (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-white/5 to-rose-500/20 px-5 py-4 text-sm text-white/80">
              {pendingStatus ? (
                <div className="flex flex-col gap-3">
                  <div>{pendingMessage}</div>
                </div>
              ) : availableCount === 0 ? (
                <div className="flex flex-col gap-3">
                  <div>
                    All OpenClaw instances are currently reserved. We'll let you know when new capacity is
                    available.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    Deploy your first OpenClaw instance for just $10/month.
                  </div>
                  <button
                    type="button"
                  onClick={() => {
                    const token = getCookieValue(AUTH_COOKIE);
                    if (token) {
                      fetch(`${AUTH_API_BASE}/notifications-set?message_type=2`, {
                        headers: { Authorization: `Bearer ${token}` },
                      }).catch(() => null);
                    }
                    setPaymentInProgress(true);
                    setView("payment");
                  }}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/80 transition hover:border-white/30 hover:bg-white/20"
                  >
                    Continue to payment
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {view === "payment" ? (
            <PaymentView
              onBack={() => {
                setPaymentInProgress(false);
                setView("list");
              }}
              status={paymentStatus}
              error={paymentError}
            />
          ) : null}
        </>
      ) : null}

      {authState === "authed" && typeof vpsCount === "number" && vpsCount > 0 ? (
        <>
          {view === "list" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70">
              <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">
                Your instances
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[680px] w-full text-xs text-white/70">
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
              <div className="mt-4 flex justify-end">
                <a
                  href="https://billing.stripe.com/p/login/3cIaEWdGA3pz4Mq5Mgd7q00"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs uppercase tracking-[0.25em] text-white/60 transition hover:text-white"
                >
                  Manage subscription
                </a>
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
          By continuing you agree to our{" "}
          <a
            href="https://github.com/chigwell/opclaw.io/blob/main/TERMS.md"
            target="_blank"
            rel="noreferrer"
            className="text-white/70 underline underline-offset-4 hover:text-white"
          >
            terms
          </a>{" "}
          and confirm that you’ve read our{" "}
          <a
            href="https://github.com/chigwell/opclaw.io/blob/main/PRIVACY.md"
            target="_blank"
            rel="noreferrer"
            className="text-white/70 underline underline-offset-4 hover:text-white"
          >
            privacy policy
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}

function HeroGeometric({
  badge = "OpenClaw instances online",
  title = "Run OpenClaw in your own VPS.",
  subtitle = "Secure, isolated instances in minutes—fully yours.",
}: {
  badge?: string;
  title?: string;
  subtitle?: string;
}) {
  const [typedText, setTypedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [hasInstances, setHasInstances] = useState(false);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
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

  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        const response = await fetch(`${AUTH_API_BASE}/available-vps`);
        if (!response.ok) {
          setAvailableCount(null);
          return;
        }
        const data = (await response.json()) as { count_vps?: number };
        setAvailableCount(
          typeof data.count_vps === "number" ? data.count_vps : null
        );
      } catch {
        setAvailableCount(null);
      }
    };
    fetchAvailable();
  }, []);

  const indicatorClass =
    availableCount === null
      ? "fill-white/40"
      : availableCount === 0
        ? "fill-red-500/80"
        : availableCount < 3
          ? "fill-orange-400/80"
          : "fill-green-500/80";

  const badgeText =
    availableCount === null
      ? badge
      : `${availableCount} OpenClaw instance${
          availableCount === 1 ? "" : "s"
        } available`;

  return (
    <div className="w-full min-h-screen bg-black flex items-center justify-center">
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 60s linear infinite;
        }
      `}</style>

      <div
        className="relative w-full min-h-screen overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "#09090b",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            perspective: "1200px",
            transform: "perspective(1200px) rotateX(15deg)",
            transformOrigin: "center bottom",
            opacity: 1,
          }}
        >
          <div className="absolute inset-0 animate-spin-slow">
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: "2000px",
                height: "2000px",
                transform: "translate(-50%, -50%) rotate(279.05deg)",
                zIndex: 0,
              }}
            >
              <img
                src="https://framerusercontent.com/images/oqZEqzDEgSLygmUDuZAYNh2XQ9U.png?scale-down-to=2048"
                alt=""
                className="w-full h-full object-cover opacity-50"
              />
            </div>
          </div>

          <div className="absolute inset-0 animate-spin-slow-reverse">
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: "1000px",
                height: "1000px",
                transform: "translate(-50%, -50%) rotate(304.42deg)",
                zIndex: 1,
              }}
            >
              <img
                src="https://framerusercontent.com/images/UbucGYsHDAUHfaGZNjwyCzViw8.png?scale-down-to=1024"
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
            </div>
          </div>

          <div className="absolute inset-0 animate-spin-slow">
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: "800px",
                height: "800px",
                transform: "translate(-50%, -50%) rotate(48.33deg)",
                zIndex: 2,
              }}
            >
              <img
                src="https://framerusercontent.com/images/Ans5PAxtJfg3CwxlrPMSshx2Pqc.png"
                alt="OpenClaw"
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, #09090b 10%, rgba(9, 9, 11, 0.8) 40%, transparent 100%)",
          }}
        />

        <div className="relative z-20 w-full min-h-screen flex flex-col items-center justify-end pb-24 gap-6 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 -mt-6">
            <Circle className={cn("h-2 w-2", indicatorClass)} />
            <span className="text-sm text-white/60 tracking-wide">
              {badgeText}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-center tracking-tight text-white">
            {title}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/50 font-medium text-center max-w-2xl">
            {typedText}
            <span
              className={cn(
                "inline-block w-[2px] h-[1.1em] bg-white/40 ml-1 align-middle transition-opacity duration-150",
                isTypingComplete ? "opacity-0" : "opacity-100"
              )}
              aria-hidden="true"
            />
          </p>

          <div className="flex justify-center mt-4">
            <WarpDialog>
              <WarpDialogTrigger asChild>
                <ShinyButton>Start</ShinyButton>
              </WarpDialogTrigger>
              <WarpDialogContent className={hasInstances ? "max-w-3xl" : ""}>
                <StartAuthModalContent onHasInstances={handleHasInstances} />
              </WarpDialogContent>
            </WarpDialog>
          </div>
        </div>

        <a
          href="mailto:support@opclaw.io"
          className="fixed bottom-6 right-6 z-20 text-sm text-white/70 transition hover:text-white"
        >
          support@opclaw.io
        </a>
      </div>
    </div>
  );
}

function StarOnGithubSection() {
  return (
    <section className="bg-black">
      <div className="mx-auto flex w-full justify-center px-4 py-16">
        <StarOnGithub />
      </div>
    </section>
  );
}

export default function Home() {
  const [shuffledTestimonials, setShuffledTestimonials] = useState(
    () => [...testimonialsData]
  );

  const testimonials = useMemo(
    () =>
      shuffledTestimonials.map((item) => {
        const handle = item.author.trim();
        const displayHandle = handle.startsWith("@") ? handle : `@${handle}`;
        const safeHandle = encodeURIComponent(handle.replace(/^@/, ""));
        return {
          author: {
            name: handle,
            handle: displayHandle,
            avatar: `https://unavatar.io/x/${safeHandle}`,
          },
          text: item.quote,
          href: item.url,
        };
      }),
    [shuffledTestimonials]
  );

  useEffect(() => {
    setShuffledTestimonials((current) => {
      const items = [...current];
      for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    if (host === "molt.tech" || host === "www.molt.tech") {
      window.location.replace("https://opclaw.io/");
    }
  }, []);

  return (
    <main>
      <HeroGeometric />
      <TestimonialsSection
        title="Trusted by developers worldwide"
        description="Join thousands of developers who are already building the future with OpenClaw. Here's what people are saying about OpenClaw.ai:"
        testimonials={testimonials}
      />
      <StarOnGithubSection />
    </main>
  );
}
