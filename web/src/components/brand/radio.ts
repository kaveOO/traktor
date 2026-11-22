import type { KeyboardEvent } from "react";

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Roving-tabindex radio group (WAI-ARIA radiogroup pattern).
 * Put `tabIndex={on ? 0 : -1}` on each `role="radio"` and call this from its onKeyDown.
 * Arrows move and select (wrapping), Home/End jump. The event is stopped so page-level shortcuts don't also fire.
 */
export function radioKeyDown<T>(e: KeyboardEvent<HTMLElement>, values: readonly T[], current: T, select: (v: T) => void) {
  const n = values.length;
  if (!n) return;
  let i = Math.max(0, values.indexOf(current));
  if (e.key in STEP) i = (i + STEP[e.key] + n) % n;
  else if (e.key === "Home") i = 0;
  else if (e.key === "End") i = n - 1;
  else return;
  e.preventDefault();
  e.stopPropagation();
  select(values[i]);
  const group = e.currentTarget.closest('[role="radiogroup"]');
  group?.querySelectorAll<HTMLElement>('[role="radio"]')[i]?.focus();
}
