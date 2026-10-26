"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, Inbox } from "lucide-react";
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`status-badge ${tone || String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {children}
    </span>
  );
}
export function Empty({
  title = "Nothing here yet",
  copy = "Your records will appear here.",
}: {
  title?: string;
  copy?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      className={`product-modal ${wide ? "wide" : ""}`}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
}
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return <span className={`avatar avatar-${index % 4}`}>{initials(name)}</span>;
}
export function date(value: string, options?: Intl.DateTimeFormatOptions) {
  return value && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleDateString(
        "en-MY",
        options ?? { day: "numeric", month: "short", year: "numeric" },
      )
    : "Not set";
}
export function inputDate(value?: string) {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 16);
}
export function toIso(value: FormDataEntryValue | null) {
  return new Date(String(value)).toISOString();
}
