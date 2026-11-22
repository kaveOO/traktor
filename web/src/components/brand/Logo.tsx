/**
 * TRAKTOR logo, Guidelines 1.0 §02. Artwork copied path-for-path from docs/brand/pages/02-logo.html and
 * 03-logo-system.html. Never re-type, rearrange, stretch, outline, shadow or recolour it.
 *
 * The mark: a square of soil with a ditch cut into it and a board across the top; the empty space is the T.
 * Lockups: primary (default wherever there is width) · stacked (square / portrait) · mark (boards, stickers,
 * icons) · wordmark (when the mark is already nearby).
 * Clear space: x = board height (3/16 of the mark) on every side; use `LOGO_CLEAR_SPACE` × mark size.
 * Minimum: mark 16 px, lockup 120 px wide (enforced below).
 * Colourways: cream on forest, forest on cream, cream on soil. On the dark field pattern: cream, top left.
 * On the colour pattern: always inside a forest block.
 */
export type LogoColor = "forest" | "cream";
export type LogoLockup = "primary" | "stacked" | "wordmark";
const FILL: Record<LogoColor, string> = { forest: "#1F3A22", cream: "#F3ECDD" };

/** Clear space as a fraction of the mark size (board height 9/48 = 3/16). */
export const LOGO_CLEAR_SPACE = 3 / 16;
export const LOGO_MIN_MARK_PX = 16;
export const LOGO_MIN_LOCKUP_PX = 120;

/** 48×48 mark: board (0-9) + soil with the ditch cut (15-48). */
const MARK = "M0 0H48V9H0Z M0 15H15.0L19.0 39H29.0L33.0 15H48V48H0Z";
const WORDMARK = "M284.32 686.0V138.52H24.78V-0.91H710.92V138.52H451.15V686.0Z M866.67 686.0V-0.91H1332.85Q1408.1 -0.91 1457.31 27.84Q1506.53 56.6 1531.13 105.61Q1555.72 154.62 1555.72 215.84Q1555.72 280.9 1524.99 333.36Q1494.26 385.82 1434.1 414.75L1575.64 686.0H1389.49L1269.56 443.4H1033.49V686.0ZM1033.49 313.67H1294.77Q1337.22 313.67 1361.3 287.99Q1385.37 262.32 1385.37 219.28Q1385.37 191.05 1374.71 171.28Q1364.05 151.51 1343.87 141.01Q1323.69 130.5 1294.77 130.5H1033.49Z M1649.68 686.0 1949.8 -0.91H2144.87L2445.36 686.0H2264.92L2212.2 559.14H1873.78L1821.2 686.0ZM1926.67 429.92H2159.08L2094.43 270.79Q2090.22 260.42 2083.49 242.9Q2076.75 225.39 2069.69 205.64Q2062.64 185.89 2056.33 168.1Q2050.03 150.31 2046.56 140.41H2039.81Q2033.07 159.71 2023.9 184.72Q2014.73 209.74 2006.08 233.03Q1997.44 256.33 1991.32 271.13Z M2588.67 686.0V-0.91H2755.49V329.22L3095.72 -0.91H3305.34L3015.98 280.99L3311.09 686.0H3107.31L2897.11 388.44L2755.49 508.64V686.0Z M3644.32 686.0V138.52H3384.78V-0.91H4070.92V138.52H3811.15V686.0Z M4578.44 698.0Q4455.45 698.0 4365.98 657.64Q4276.51 617.27 4228.54 537.96Q4180.57 458.65 4180.57 342.6Q4180.57 225.58 4228.54 146.63Q4276.51 67.68 4365.98 27.39Q4455.45 -12.91 4578.44 -12.91Q4702.7 -12.91 4791.8 27.39Q4880.91 67.68 4928.87 146.63Q4976.84 225.58 4976.84 342.6Q4976.84 458.65 4928.87 537.96Q4880.91 617.27 4791.8 657.64Q4702.7 698.0 4578.44 698.0ZM4578.63 565.79Q4631.05 565.79 4672.88 551.98Q4714.72 538.18 4744.43 511.61Q4774.14 485.03 4789.99 445.97Q4805.84 406.91 4805.84 356.83V328.04Q4805.84 277.69 4789.99 238.64Q4774.14 199.58 4744.43 173.07Q4714.72 146.56 4672.88 132.93Q4631.05 119.3 4578.63 119.3Q4526.22 119.3 4484.38 132.93Q4442.55 146.56 4412.91 173.07Q4383.27 199.58 4367.79 238.64Q4352.3 277.69 4352.3 328.04V356.83Q4352.3 406.91 4367.79 445.97Q4383.27 485.03 4412.91 511.61Q4442.55 538.18 4484.38 551.98Q4526.22 565.79 4578.63 565.79Z M5169.67 686.0V-0.91H5635.85Q5711.1 -0.91 5760.31 27.84Q5809.53 56.6 5834.13 105.61Q5858.72 154.62 5858.72 215.84Q5858.72 280.9 5827.99 333.36Q5797.26 385.82 5737.1 414.75L5878.64 686.0H5692.49L5572.56 443.4H5336.49V686.0ZM5336.49 313.67H5597.77Q5640.22 313.67 5664.3 287.99Q5688.37 262.32 5688.37 219.28Q5688.37 191.05 5677.71 171.28Q5667.05 151.51 5646.87 141.01Q5626.69 130.5 5597.77 130.5H5336.49Z";

/* Geometry from the artwork */
const PRIMARY = { w: 7157.3, h: 926.1, markScale: 19.2937, word: "translate(1278.6 120.1)" };
const STACKED = { w: 5853.9, h: 2991.0, mark: "translate(2048.9 0) scale(36.5866)", word: "translate(-24.8 2305.0)" };
const WORD = { x: 24.8, w: 5853.9, h: 686 };

/**
 * Logo lockup. `height` = rendered height in px. Default: primary (mark + wordmark on one line).
 * Width is derived; the primary/wordmark lockup is never drawn narrower than 120 px.
 */
export function Logo({
  height = 20,
  color = "forest",
  lockup = "primary",
  className,
}: {
  height?: number;
  color?: LogoColor;
  lockup?: LogoLockup;
  className?: string;
}) {
  const fill = FILL[color];
  const style = { display: "block", flex: "0 0 auto" } as const;

  if (lockup === "stacked") {
    const h = Math.max(height, (LOGO_MIN_LOCKUP_PX * STACKED.h) / STACKED.w);
    return (
      <svg viewBox={`0 0 ${STACKED.w} ${STACKED.h}`} width={(STACKED.w / STACKED.h) * h} height={h} role="img" aria-label="TRAKTOR" className={className} style={style}>
        <path transform={STACKED.mark} d={MARK} fill={fill} />
        <path transform={STACKED.word} d={WORDMARK} fill={fill} />
      </svg>
    );
  }

  if (lockup === "wordmark") {
    const h = Math.max(height, (LOGO_MIN_LOCKUP_PX * WORD.h) / WORD.w);
    return (
      <svg viewBox={`${WORD.x} 0 ${WORD.w} ${WORD.h}`} width={(WORD.w / WORD.h) * h} height={h} role="img" aria-label="TRAKTOR" className={className} style={style}>
        <path d={WORDMARK} fill={fill} />
      </svg>
    );
  }

  const h = Math.max(height, (LOGO_MIN_LOCKUP_PX * PRIMARY.h) / PRIMARY.w);
  return (
    <svg viewBox={`0 0 ${PRIMARY.w} ${PRIMARY.h}`} width={(PRIMARY.w / PRIMARY.h) * h} height={h} role="img" aria-label="TRAKTOR" className={className} style={style}>
      <path transform={`scale(${PRIMARY.markScale})`} d={MARK} fill={fill} />
      <path transform={PRIMARY.word} d={WORDMARK} fill={fill} />
    </svg>
  );
}

/** The square mark alone (boards, stickers, app icon). Min 16 px. Decorative unless `title` is given. */
export function LogoMark({
  size = 32,
  color = "forest",
  title,
  className,
}: {
  size?: number;
  color?: LogoColor;
  title?: string;
  className?: string;
}) {
  const s = Math.max(size, LOGO_MIN_MARK_PX);
  return (
    <svg
      viewBox="0 0 48 48"
      width={s}
      height={s}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path d={MARK} fill={FILL[color]} />
    </svg>
  );
}

/** @deprecated alias of `LogoMark` (the 1.0 mark is square). Kept for older imports. */
export function LogoSymbol(props: { size?: number; color?: LogoColor; className?: string }) {
  return <LogoMark {...props} />;
}
