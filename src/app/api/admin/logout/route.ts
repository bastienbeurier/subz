import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/utils/adminAuth";

export async function POST() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("subz_admin_session");
  return res;
}
