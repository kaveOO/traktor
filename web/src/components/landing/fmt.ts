/** Polish integer with a non-breaking space every 3 digits (also for 4-digit numbers: "1 240"). */
export const fmtInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
