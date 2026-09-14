import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";
import { log } from "./logger";

/** Error shape for every route: `{ error: { code, message } }`. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return NextResponse.json(
      { error: { code: "VALIDATION", message: `${where}${first?.message ?? "Invalid input"}` } },
      { status: 400 },
    );
  }
  log.error("unhandled_route_error", { name: error instanceof Error ? error.name : typeof error });
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong" } },
    { status: 500 },
  );
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** Parse a JSON body against a schema; malformed JSON becomes a VALIDATION error. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("VALIDATION", "Body must be valid JSON");
  }
  return schema.parse(raw);
}

/** Wrap a route handler so thrown errors become the standard error shape. */
export function route<Ctx>(
  handler: (req: Request, ctx: Ctx) => Promise<NextResponse>,
): (req: Request, ctx: Ctx) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
