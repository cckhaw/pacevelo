/**
 * Soft-deprecated: Google Health requires Google's CASA security assessment
 * to leave OAuth "Testing" mode, which we've chosen not to pursue for now.
 * Existing google_health challenges and already-connected employee accounts
 * keep working - this only hides the option from *new* challenges and the
 * "Connect Google Health" prompt for employees who haven't connected yet.
 * Flip back to true to re-offer it.
 */
export const GOOGLE_HEALTH_ENABLED = false;
