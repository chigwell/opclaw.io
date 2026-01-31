"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type WarpDialogContextType = {
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
};

const WarpDialogContext = React.createContext<WarpDialogContextType | null>(
  null
);

export function useWarpDialogContext() {
  const ctx = React.useContext(WarpDialogContext);
  if (!ctx)
    throw new Error("WarpDialog components must be used inside <WarpDialog>");
  return ctx;
}

export function WarpDialog({
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [_open, _setOpen] = React.useState(false);
  const open = openProp ?? _open;

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
    },
    [setOpenProp, open]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const contextValue = React.useMemo<WarpDialogContextType>(
    () => ({ open, setOpen }),
    [open, setOpen]
  );

  return (
    <WarpDialogContext.Provider value={contextValue}>
      <div data-slot="dialog" className={className} {...props}>
        {children}
      </div>
    </WarpDialogContext.Provider>
  );
}

export function WarpDialogTrigger({
  asChild = false,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useWarpDialogContext();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const childOnClick = child.props?.onClick as
      | ((event: React.MouseEvent<HTMLElement>) => void)
      | undefined;
    return React.cloneElement(
      child,
      {
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          childOnClick?.(event);
          onClick?.(event as React.MouseEvent<HTMLButtonElement>);
          setOpen(true);
        },
      } as Partial<React.ComponentPropsWithoutRef<any>>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        setOpen(true);
      }}
      data-slot="dialog-trigger"
      {...props}
    >
      {children}
    </button>
  );
}

function WarpDialogOverlay({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-[900] bg-black/65 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.59, 0, 0.35, 1] }}
      onClick={onClick}
      {...props}
    >
      <WarpAnimations />
    </motion.div>
  );
}

export function WarpDialogContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const { open, setOpen } = useWarpDialogContext();

  return (
    <AnimatePresence>
      {open && (
        <>
          <WarpDialogOverlay onClick={() => setOpen(false)} />
          <motion.div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.59, 0, 0.35, 1] }}
            {...props}
          >
            <motion.div
              className={cn(
                "relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0c]/95 p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.5)]",
                "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]",
                className
              )}
              onClick={(event) => event.stopPropagation()}
              initial={{
                rotateX: -5,
                skewY: -1.5,
                scaleY: 2,
                scaleX: 0.4,
                y: 120,
              }}
              animate={{
                rotateX: 0,
                skewY: 0,
                scaleY: 1,
                scaleX: 1,
                y: 0,
                transition: {
                  duration: 0.35,
                  ease: [0.59, 0, 0.35, 1],
                  y: { type: "spring", bounce: 0.2, duration: 0.7 },
                },
              }}
              exit={{
                rotateX: -5,
                skewY: -1.5,
                scaleY: 2,
                scaleX: 0.4,
                y: 120,
              }}
              transition={{ duration: 0.35, ease: [0.59, 0, 0.35, 1] }}
              style={{
                transformPerspective: 1000,
                originX: 0.5,
                originY: 0,
              }}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function WarpAnimations() {
  const enterDuration = 0.5;
  const exitDuration = 0.25;
  return (
    <>
      <motion.div
        className="absolute left-[25%] top-[100%] h-1/2 w-1/2 origin-center rounded-full blur-lg will-change-transform"
        initial={{
          scale: 0,
          opacity: 1,
          backgroundColor: "hsl(10, 64%, 77%)",
        }}
        animate={{
          scale: 10,
          opacity: 0.2,
          backgroundColor: "hsl(6, 93%, 56%)",
          transition: {
            duration: enterDuration,
            opacity: { duration: enterDuration, ease: "easeInOut" },
          },
        }}
        exit={{
          scale: 0,
          opacity: 1,
          backgroundColor: "hsl(10, 64%, 77%)",
          transition: { duration: exitDuration },
        }}
      />
      <motion.div
        className="absolute left-[-50%] top-[-25%] h-full w-full rounded-full bg-rose-500/90 blur-[120px]"
        initial={{ opacity: 0 }}
        animate={{
          opacity: 0.9,
          transition: {
            duration: enterDuration,
            scale: {
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "easeInOut",
              delay: 0.35,
            },
          },
          scale: [1, 0.7, 1],
        }}
        exit={{
          opacity: 0,
          transition: { duration: exitDuration },
        }}
      />
      <motion.div
        className="absolute left-[50%] top-[25%] h-full w-full rounded-full bg-indigo-500/80 blur-[120px]"
        initial={{ opacity: 0 }}
        animate={{
          opacity: 0.9,
          transition: {
            duration: enterDuration,
            scale: {
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "easeInOut",
              delay: 0.35,
            },
          },
          scale: [1, 0.7, 1],
        }}
        exit={{
          opacity: 0,
          transition: { duration: exitDuration },
        }}
      />
    </>
  );
}
