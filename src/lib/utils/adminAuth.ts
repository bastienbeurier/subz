import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Call at the top of every /api/admin/* route handler (except /login).
 * Returns a 401 response if the session cookie is missing or invalid;
 * returns null if the request is authenticated (caller should continue).
 */
export async function requireAdminAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("subz_admin_session");
  if (session?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
