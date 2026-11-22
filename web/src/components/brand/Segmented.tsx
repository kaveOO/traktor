"use client";

import { radioKeyDown } from "./radio";

/**
 * Segmented choice (radiogroup, roving tabindex). Active = forest fill, cream text; others = 1.5px outline.
 * 2px radius, 44px min height, 400ms colour change.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const values = options.map((o) => o.value);
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-[2px] border-[1.5px] border-forest ${className}`}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => radioKeyDown(e, values, value, onChange)}
            className={`min-h-11 px-3 text-[13px] font-medium transition-colors duration-[400ms] ${i > 0 ? "border-l-[1.5px] border-forest" : ""} ${
              on ? "bg-forest text-cream" : "bg-cream text-forest hover:brightness-[.94]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
