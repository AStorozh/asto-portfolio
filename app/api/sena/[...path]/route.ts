import { handle } from "@/lib/sena-api/router";

// Closed API for Sena (the owner's personal assistant). Details: lib/sena-api/*.
// Without the SENA_SITE_KEY key in the environment it responds 404, as if the address does not exist.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ path: string[] }> };
const run = async (req: Request, ctx: Ctx) => handle(req, (await ctx.params).path);

export const GET = run;
export const POST = run;
export const PUT = run;
export const PATCH = run;
export const DELETE = run;
