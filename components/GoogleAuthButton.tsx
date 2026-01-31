"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SCRIPT_ID = "google-identity-services";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            container: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              shape?: "pill" | "rect" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

export function GoogleAuthButton({
  onCredential,
  className,
}: {
  onCredential?: (credential: string) => void;
  className?: string;
}) {
  const buttonRef = React.useRef<HTMLDivElement>(null);
  const initializedRef = React.useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  React.useEffect(() => {
    if (!clientId) return;
    if (initializedRef.current) return;

    const initButton = () => {
      if (initializedRef.current) return;
      if (!buttonRef.current) return;
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential?.(response.credential),
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "left",
        width: 280,
      });

      initializedRef.current = true;
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = initButton;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initButton();
    } else {
      script.addEventListener("load", initButton, { once: true });
    }

    return () => {
      script?.removeEventListener("load", initButton);
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs uppercase tracking-[0.2em] text-white/50",
          className
        )}
      >
        Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center", className)}>
      <div ref={buttonRef} />
    </div>
  );
}
