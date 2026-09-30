/**
 * Strava's official "Connect with Strava" button artwork (public/strava/),
 * shown as supplied - Strava's brand guidelines forbid altering it - at its
 * specified 48px height, with the 2x file for high-density screens. Used
 * wherever the app sends someone to Strava's authorization screen.
 */
export function ConnectWithStravaImage({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official brand asset; must be served untouched, not re-encoded by the image optimizer
    <img
      src="/strava/connect-with-strava.png"
      srcSet="/strava/connect-with-strava.png 1x, /strava/connect-with-strava@2x.png 2x"
      alt="Connect with Strava"
      width={237}
      height={48}
      className={className}
    />
  );
}
