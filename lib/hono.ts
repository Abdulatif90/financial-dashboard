import { hc } from "hono/client"
import { AppType } from "@/app/api/[[...route]]/route"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) { 
  throw new Error("NEXT_PUBLIC_API_URL is not defined")
}
export const client = hc<AppType>(API_URL)

