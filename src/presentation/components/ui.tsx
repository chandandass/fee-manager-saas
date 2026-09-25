"use client";

import { cn } from "@/lib/utils";
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, useEffect } from "react";
import { X } from "lucide-react";

export function Card({
  children,
  className,
  glass = false,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        glass
          ? "glass-card rounded-2xl p-4 shadow-sm"
          : "bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 hover-lift transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200/80 active:scale-[0.98]",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 active:scale-[0.98]",
    danger:
      "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100/80 active:scale-[0.98]",
    success:
      "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-green-700 active:scale-[0.98]",
    outline:
      "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs font-semibold rounded-xl",
    md: "px-4 py-2.5 text-sm font-semibold rounded-xl",
    lg: "px-5 py-3 text-base font-semibold rounded-2xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 text-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const styles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/10",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80 ring-1 ring-rose-500/10",
    info: "bg-blue-50 text-blue-700 border-blue-200/80 ring-1 ring-blue-500/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border shadow-xs transition-all",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 pt-1">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center glass-card rounded-2xl border border-dashed border-slate-300 p-6">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center mb-3 shadow-inner">
        <span className="text-2xl">📋</span>
      </div>
      <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "blue",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "red" | "purple";
  icon?: React.ElementType;
}) {
  const accents = {
    blue: {
      bar: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50/80 text-blue-600 border-blue-100",
    },
    green: {
      bar: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50/80 text-emerald-600 border-emerald-100",
    },
    amber: {
      bar: "from-amber-500 to-orange-600",
      bg: "bg-amber-50/80 text-amber-600 border-amber-100",
    },
    red: {
      bar: "from-rose-500 to-red-600",
      bg: "bg-rose-50/80 text-rose-600 border-rose-100",
    },
    purple: {
      bar: "from-purple-500 to-violet-600",
      bg: "bg-purple-50/80 text-purple-600 border-purple-100",
    },
  };
  const config = accents[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs p-4 hover-lift transition-all">
      <div
        className={cn(
          "absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b",
          config.bar
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {value}
          </p>
          {sub && <p className="text-xs font-medium text-slate-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
              config.bg
            )}
          >
            <Icon size={18} strokeWidth={2.2} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 border border-slate-100 transform transition-transform duration-200">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function IconButton({
  href,
  onClick,
  variant = "default",
  children,
  title,
}: {
  href?: string;
  onClick?: () => void;
  variant?: "default" | "whatsapp" | "call";
  children?: ReactNode;
  title?: string;
}) {
  const styles = {
    default: "bg-slate-100 text-slate-600 hover:bg-slate-200/80 active:scale-95",
    whatsapp:
      "bg-[#25D366] text-white border border-[#1ebe5d]/40 hover:bg-[#20c05a] active:scale-95 shadow-md shadow-green-500/20",
    call:
      "bg-blue-500 text-white border border-blue-400/40 hover:bg-blue-600 active:scale-95 shadow-md shadow-blue-500/20",
  };
  const className = cn(
    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
    styles[variant]
  );

  // Built-in icons per variant
  const defaultIcon =
    variant === "whatsapp" ? (
      // Official WhatsApp logo SVG
      <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.13 6.742 3.047 9.371L1.052 31.15l5.957-1.91A15.928 15.928 0 0 0 16.004 32C24.828 32 32 24.822 32 16S24.828 0 16.004 0zm9.394 22.617c-.39 1.098-1.934 2.01-3.17 2.275-.844.18-1.946.324-5.654-1.214-4.748-1.97-7.805-6.79-8.04-7.105-.228-.315-1.916-2.552-1.916-4.867 0-2.314 1.214-3.444 1.645-3.882.39-.39.867-.487 1.157-.487.14 0 .267.006.38.012.333.014.502.032.72.56.271.654.932 2.267 1.014 2.432.084.166.167.39.053.617-.105.235-.198.34-.365.53-.166.19-.324.334-.49.539-.151.178-.323.37-.133.703.19.327.847 1.396 1.818 2.261 1.25 1.112 2.295 1.457 2.66 1.608.27.11.592.086.79-.126.252-.275.562-.732.878-1.184.228-.322.516-.36.82-.247.308.105 1.95.92 2.285 1.085.334.166.557.247.638.384.08.136.08.784-.31 1.882z"/>
      </svg>
    ) : variant === "call" ? (
      // PhoneCall icon
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.67 12 19.79 19.79 0 0 1 1.63 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        <polyline points="16 2 20 2 20 6"/>
        <line x1="15" y1="7" x2="20" y2="2"/>
      </svg>
    ) : null;

  const content = children ?? defaultIcon;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} title={title}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} title={title}>
      {content}
    </button>
  );
}

