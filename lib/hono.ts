import { hc } from "hono/client"
import { AppType } from "@/app/api/[[...route]]/app"

// BUG-008: constructing the client at module scope meant one missing NEXT_PUBLIC_API_URL
// crashed every page that imports `client`, not just the request that needed it. Built
// lazily instead, on first actual use.

type Client = ReturnType<typeof hc<AppType>>
let clientInstance: Client | undefined

function getClient(): Client {
  if (!clientInstance) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL is not defined")
    }
    clientInstance = hc<AppType>(API_URL)
  }
  return clientInstance
}

export const client: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const real = getClient()
    const value = Reflect.get(real as object, prop)
    return typeof value === "function" ? value.bind(real) : value
  },
})
