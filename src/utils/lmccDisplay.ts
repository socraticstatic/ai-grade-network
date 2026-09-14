/**
 * GA customer vocabulary for LMCC (Maximum tier) connections.
 * "Live is our only word" — never 'active' on LMCC surfaces. Other connection
 * types keep the shared status enum untouched.
 */

export const isLmccConnection = (c: { configuration?: any } | null | undefined): boolean =>
  c?.configuration?.isLmcc === true;

const LMCC_LABELS: Record<string, string> = {
  Active: 'Live',
  Provisioning: 'Provisioning',
  Pending: 'Pending',
  Inactive: 'Needs attention',
  Failed: 'Needs attention',
  Suspended: 'Needs attention',
};

export function lmccStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  return LMCC_LABELS[status] ?? status;
}

const KEY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Countdown for the 7-day ActivationKey window. */
export function keyExpiryInfo(keyCreatedAt: string, now?: string): { expired: boolean; label: string } {
  const created = Date.parse(keyCreatedAt);
  const at = now ? Date.parse(now) : Date.now();
  const expiresAt = created + KEY_EXPIRY_MS;
  const remaining = expiresAt - at;
  if (remaining <= 0) {
    const d = new Date(expiresAt);
    const label = `Expired ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
    return { expired: true, label };
  }
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const label = days >= 1 ? `Expires in ${days}d ${hours}h` : `Expires in ${hours}h ${minutes}m`;
  return { expired: false, label };
}

/** One call site helper: GA label for LMCC connections, untouched status otherwise.
 *  A Pending LMCC connection whose key aged out reads Expired — derived, never stored. */
export function displayStatus(c: { status?: string; configuration?: any }): string {
  if (!isLmccConnection(c)) return c.status ?? '—';
  if (c.status === 'Pending' && c.configuration?.lmccKeyCreatedAt) {
    if (keyExpiryInfo(c.configuration.lmccKeyCreatedAt).expired) return 'Expired';
  }
  return lmccStatusLabel(c.status);
}
