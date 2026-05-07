import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/server/db"
import { saveOptionalDemographics } from "@/lib/server/survey-service"
import { updateSurveyDemographicsSchema } from "@/lib/survey/schema"

const paramsSchema = z.object({
  id: z.string().trim().min(1).max(128),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = paramsSchema.safeParse(await context.params)
  if (!params.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSurveyDemographicsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const response = await saveOptionalDemographics(getDb(), params.data.id, parsed.data)
    if (!response) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "internal_error" }, { status: 500 })
  }
}

