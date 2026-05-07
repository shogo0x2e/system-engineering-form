import { NextResponse } from "next/server"
import { getDb } from "@/lib/server/db"
import { submitSurveyResponse } from "@/lib/server/survey-service"
import { createSurveyResponseSchema } from "@/lib/survey/schema"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createSurveyResponseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const response = await submitSurveyResponse(getDb(), parsed.data)
    return NextResponse.json({ response }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "internal_error" }, { status: 500 })
  }
}

