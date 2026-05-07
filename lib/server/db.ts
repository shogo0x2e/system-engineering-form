import { getCloudflareContext } from "@opennextjs/cloudflare"

export type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike
  run<T = unknown>(): Promise<D1ResultLike<T>>
  all<T = unknown>(): Promise<D1ResultLike<T>>
  first<T = unknown>(): Promise<T | null>
}

export type D1ResultLike<T = unknown> = {
  success: boolean
  results?: T[]
  error?: string
}

export type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike
}

export type AppEnv = {
  DB: D1DatabaseLike
  EXPORT_TOKEN?: string
}

export function getAppEnv(): AppEnv {
  const { env } = getCloudflareContext()
  return env as unknown as AppEnv
}

export function getDb(): D1DatabaseLike {
  return getAppEnv().DB
}

