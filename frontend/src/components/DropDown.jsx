import { LANGUAGE_LABELS, MONACO_LANGUAGE_MAP } from "../data/problems";
import { useState } from "react";

const languages = Object.keys(LANGUAGE_LABELS);

export default function LanguageDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative text-sm z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#313244] text-[#cdd6f4] hover:border-[#89b4fa] transition-colors font-mono text-xs"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        {LANGUAGE_LABELS[value]}
        <svg
          className={`w-3 h-3 transition-transform text-[#6c7086] ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-36 bg-[#1e1e2e] border border-[#313244] rounded-lg shadow-2xl z-50 overflow-hidden">
          {languages.map((l) => (
            <button
              key={l}
              onClick={() => { onChange(l); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-[#313244]
                ${l === value ? "text-emerald-400 bg-[#313244]" : "text-[#cdd6f4]"}`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}