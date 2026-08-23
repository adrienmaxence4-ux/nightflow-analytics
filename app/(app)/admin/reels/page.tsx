import { redirect } from "next/navigation";

/**
 * The founder-only Reels page became /social, which every merchant can reach.
 * This redirect exists so the bookmark that was in daily use keeps working.
 */
export default function AdminReelsRedirect() {
  redirect("/social");
}
