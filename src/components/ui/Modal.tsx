"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** alertdialog for confirmations that need an answer */
  role?: "dialog" | "alertdialog";
  hideClose?: boolean;
};

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Accessible modal built on the native <dialog> element:
 * focus is trapped by the browser, Esc closes it, and it renders in the top layer.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  role = "dialog",
  hideClose = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`pp-pop m-auto w-[calc(100vw-2rem)] ${SIZES[size]} rounded-2xl border border-pp-border bg-white p-0 text-pp-primary shadow-2xl backdrop:bg-slate-950/50`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold leading-snug">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1 text-sm text-pp-muted">
                  {description}
                </div>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-pp-muted hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          {children && <div className="overflow-y-auto px-5 pt-4">{children}</div>}
          {footer && (
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-pp-border bg-slate-50 px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
          {!footer && <div className="h-5" />}
        </div>
      )}
    </dialog>
  );
}
