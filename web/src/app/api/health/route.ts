import { connection } from "next/server";
import { json } from "../_lib/util";

export async function GET() {
  await connection();
  return json({ ok: true, sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local", demo: true, time: new Date().toISOString() });
}
