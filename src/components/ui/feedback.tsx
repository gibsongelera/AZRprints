"use client";

import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal } from "./Modal";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastInput = {
  type?: ToastType;
  title: string;
  message?: string;
  /** Optional link shown as an action ("View") */
  href?: string;
  actionLabel?: string;
  /** ms before auto-dismiss; errors stay a little longer by default */
  duration?: number;
};

type ToastRecord = ToastInput & { id: number; type: ToastType };

export type ConfirmInput = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ToastFn = ((t: ToastInput) => void) & {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
};

type FeedbackContextValue = {
  toast: ToastFn;
  confirm: (input: ConfirmInput) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

let toastSeq = 0;

const TOAST_STYLE: Record<
  ToastType,
  { icon: typeof Info; bar: string; iconClass: string }
> = {
  success: { icon: CircleCheck, bar: "bg-emerald-500", iconClass: "text-emerald-600" },
  error: { icon: CircleX, bar: "bg-red-600", iconClass: "text-red-600" },
  warning: { icon: TriangleAlert, bar: "bg-amber-500", iconClass: "text-amber-600" },
  info: { icon: Info, bar: "bg-sky-500", iconClass: "text-sky-600" },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const style = TOAST_STYLE[toast.type];
  const Icon = style.icon;
  const duration =
    toast.duration ?? (toast.type === "error" ? 7000 : 4500);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [paused, duration, onDismiss, toast.id]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pp-pop pointer-events-auto relative flex gap-3 overflow-hidden rounded-xl border border-pp-border bg-white py-3 pl-4 pr-2 shadow-lg"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} aria-hidden />
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-pp-primary">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-sm text-pp-muted break-words">{toast.message}</p>
        )}
        {toast.href && (
          <Link
            href={toast.href}
            onClick={() => onDismiss(toast.id)}
            className="mt-1 inline-block text-sm font-semibold text-pp-accent hover:underline"
          >
            {toast.actionLabel || "View"}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-pp-muted hover:bg-slate-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [pending, setPending] = useState<
    (ConfirmInput & { resolve: (ok: boolean) => void }) | null
  >(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo<ToastFn>(() => {
    const push = (t: ToastInput) => {
      const id = ++toastSeq;
      setToasts((prev) => [...prev.slice(-3), { ...t, id, type: t.type || "info" }]);
    };
    return Object.assign(push, {
      success: (title: string, message?: string) => push({ type: "success", title, message }),
      error: (title: string, message?: string) => push({ type: "error", title, message }),
      info: (title: string, message?: string) => push({ type: "info", title, message }),
      warning: (title: string, message?: string) => push({ type: "warning", title, message }),
    });
  }, []);

  const pendingRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback(
    (input: ConfirmInput) =>
      new Promise<boolean>((resolve) => {
        // A newer question replaces an unanswered one (treated as "No").
        pendingRef.current?.(false);
        pendingRef.current = resolve;
        setPending({ ...input, resolve });
      }),
    []
  );

  const answer = useCallback((ok: boolean) => {
    const resolve = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    resolve?.(ok);
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const danger = pending?.tone === "danger";

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <Modal
        open={!!pending}
        onClose={() => answer(false)}
        role="alertdialog"
        size="sm"
        hideClose
        title={pending?.title}
        description={pending?.message}
        footer={
          <>
            <button
              type="button"
              autoFocus={danger}
              onClick={() => answer(false)}
              className="min-h-11 rounded-lg border border-pp-border bg-white px-4 text-sm font-semibold hover:bg-slate-50"
            >
              {pending?.cancelLabel || "Cancel"}
            </button>
            <button
              type="button"
              autoFocus={!danger}
              onClick={() => answer(true)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-white ${
                danger ? "bg-red-600 hover:bg-red-700" : "bg-pp-accent hover:bg-pp-accent-hover"
              }`}
            >
              {pending?.confirmLabel || "Confirm"}
            </button>
          </>
        }
      />

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-stretch gap-2 sm:left-auto sm:right-4 sm:w-[24rem]"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useToast/useConfirm must be used inside <FeedbackProvider>");
  }
  return ctx;
}

export function useToast() {
  return useFeedback().toast;
}

export function useConfirm() {
  return useFeedback().confirm;
}
