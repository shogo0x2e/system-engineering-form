import { getAppEnv } from "@/lib/server/db"
import { exportSurveyResponsesCsv } from "@/lib/server/survey-service"

function canExport(request: Request, expectedToken: string | undefined) {
  const url = new URL(request.url)
  if (!expectedToken) {
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(url.hostname)
  }
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${expectedToken}`) return true

  return url.searchParams.get("token") === expectedToken
}

export async function GET(request: Request) {
  const env = getAppEnv()
  if (!canExport(request, env.EXPORT_TOKEN)) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const csv = await exportSurveyResponsesCsv(env.DB)
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="survey-responses.csv"`,
      },
    })
  } catch (error) {
    console.error(error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
