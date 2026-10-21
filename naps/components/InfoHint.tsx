"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

export function InfoHint({
  text,
  title,
  label,
}: {
  text: string;
  title?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center align-middle ml-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label || title || "More information"}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-700 focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        {label && <span className="text-[11px] underline decoration-dotted">{label}</span>}
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl z-50 pointer-events-none text-left block"
        >
          {title && <span className="block font-bold text-emerald-300 mb-0.5">{title}</span>}
          {text}
        </span>
      )}
    </span>
  );
}
