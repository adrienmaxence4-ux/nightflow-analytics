import { env } from "@/lib/env";

/**
 * True when the email belongs to the admin allowlist (ADMIN_EMAILS). Used to
 * restrict the demo/test-data tools to the project owner so real customers
 * never see — or trigger — them. Case-insensitive.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.toLowerCase());
}
