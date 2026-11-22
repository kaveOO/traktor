/**
 * TRAKTOR icon set (12 Iconography). 24px grid, 2px stroke, round caps/joins, no fills. Never emoji.
 */
export type IconName = "ditch" | "board" | "water" | "drought" | "storm" | "lidar" | "pin" | "tractor";

const PATHS: Record<IconName, React.ReactNode> = {
  ditch: (
    <>
      <path d="M1 6H4 M20 6H23" />
      <path d="M4 6L8 18H16L20 6" />
      <path d="M9.5 14H14.5" />
    </>
  ),
  board: (
    <>
      <path d="M1 5H3.5L7.5 19H16.5L20.5 5H23" />
      <path d="M7 10H17L15.5 16H8.5Z" />
    </>
  ),
  water: (
    <>
      <path d="M3 8Q4.5 6.5 6 8T9 8T12 8T15 8T18 8T21 8" />
      <path d="M3 13Q4.5 11.5 6 13T9 13T12 13T15 13T18 13T21 13" />
      <path d="M3 19H21" />
    </>
  ),
  drought: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M12 2.5V3.5 M17.5 8H18.5 M5.5 8H6.5 M15.9 4.1L16.6 3.4 M7.4 3.4L8.1 4.1" />
      <path d="M3 15H21 M8 15L9.5 18L8 21 M15 15L14 17.5L16 21" />
    </>
  ),
  storm: (
    <>
      <path d="M7 15A4 4 0 0 1 7.5 7.03A5 5 0 0 1 17 8A3.5 3.5 0 0 1 17 15Z" />
      <path d="M12.5 15L10.5 18.5H13.5L11.5 22" />
    </>
  ),
  lidar: (
    <>
      <circle cx="12" cy="3.5" r="1.5" />
      <path d="M11 5L6 13 M12 5V12 M13 5L18 11" />
      <path d="M3 20L7.5 14L11 17L15.5 11L21 16" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21S6 15 6 10A6 6 0 0 1 18 10C18 15 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  tractor: (
    <>
      <path d="M3 15V11H10V6H15L17 11H20.5V16" />
      <path d="M10 11H17" />
      <path d="M5.5 11V8" />
      <circle cx="7.5" cy="16.5" r="3.5" />
      <circle cx="18" cy="17.5" r="2.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  strokeWidth,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? (size >= 64 ? 1.5 : 2)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
