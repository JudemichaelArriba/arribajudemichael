/** Desktop layouts start at Tailwind's `lg` breakpoint. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Where the Projects reel pins and follows the scroll: tall enough for its full-screen stage, and
 * motion allowed. Elsewhere (landscape phones, reduced motion) it is an ordinary block whose strip
 * moves only when asked. Keep in sync with the `reel-pin` variant in app/globals.css.
 */
export const REEL_PIN_QUERY = '(min-height: 520px) and (prefers-reduced-motion: no-preference)';
