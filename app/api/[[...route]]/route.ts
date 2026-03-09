import { handle } from "hono/vercel"
import { app } from "./app";

export const runtime = "nodejs"; // axios runtime da ishlamaganligi uchun nodejs ga o'zgartirdik . avval edge edi

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)