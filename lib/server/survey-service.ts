import type { D1DatabaseLike } from "@/lib/server/db"
import {
  createSurveyResponse,
  findSurveyResponseById,
  listSurveyResponses,
  updateSurveyDemographics,
} from "@/lib/server/survey-repository"
import type {
  CreateSurveyResponseInput,
  UpdateSurveyDemographicsInput,
} from "@/lib/survey/schema"
import type {
  CreateSurveyResponseRecord,
  SurveyResponse,
  SurveyResponseRow,
} from "@/lib/survey/types"

function toNullableText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toDisplayOrderJson(value: string[] | null | undefined) {
  return value ? JSON.stringify(value) : null
}

function nowIso() {
  return new Date().toISOString()
}

function toSurveyResponse(row: SurveyResponseRow): SurveyResponse {
  return {
    id: row.id,
    userKey: row.user_key,
    fingerprintKey: row.fingerprint_key,
    q1Answer: row.q1_answer,
    q1OtherText: row.q1_other_text,
    q2Answer: row.q2_answer,
    q2OtherText: row.q2_other_text,
    q3Answer: row.q3_answer,
    gender: row.gender,
    ageGroup: row.age_group,
    q1DisplayOrderJson: row.q1_display_order_json,
    q2DisplayOrderJson: row.q2_display_order_json,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toCreateRecord(input: CreateSurveyResponseInput): CreateSurveyResponseRecord {
  return {
    id: crypto.randomUUID(),
    user_key: toNullableText(input.userKey),
    fingerprint_key: toNullableText(input.fingerprintKey),
    q1_answer: input.q1Answer,
    q1_other_text: input.q1Answer === "other" ? toNullableText(input.q1OtherText) : null,
    q2_answer: input.q2Answer ?? null,
    q2_other_text: input.q2Answer === "other" ? toNullableText(input.q2OtherText) : null,
    q3_answer: input.q3Answer ?? null,
    gender: input.gender ?? null,
    age_group: input.ageGroup ?? null,
    q1_display_order_json: toDisplayOrderJson(input.q1DisplayOrder),
    q2_display_order_json: toDisplayOrderJson(input.q2DisplayOrder),
    completed_at: nowIso(),
  }
}

export async function submitSurveyResponse(
  db: D1DatabaseLike,
  input: CreateSurveyResponseInput
) {
  const record = toCreateRecord(input)
  await createSurveyResponse(db, record)

  const row = await findSurveyResponseById(db, record.id)
  if (!row) {
    throw new Error("Created survey response was not found")
  }

  return toSurveyResponse(row)
}

export async function saveOptionalDemographics(
  db: D1DatabaseLike,
  id: string,
  input: UpdateSurveyDemographicsInput
) {
  const existing = await findSurveyResponseById(db, id)
  if (!existing) {
    return null
  }

  await updateSurveyDemographics(db, {
    id,
    gender: input.gender === undefined ? existing.gender : input.gender,
    age_group: input.ageGroup === undefined ? existing.age_group : input.ageGroup,
  })

  const row = await findSurveyResponseById(db, id)
  return row ? toSurveyResponse(row) : null
}

const csvHeaders = [
  "id",
  "user_key",
  "fingerprint_key",
  "q1_answer",
  "q1_other_text",
  "q2_answer",
  "q2_other_text",
  "q3_answer",
  "gender",
  "age_group",
  "q1_display_order_json",
  "q2_display_order_json",
  "completed_at",
  "created_at",
  "updated_at",
] as const

function csvCell(value: string | null | undefined) {
  const text = value ?? ""
  return `"${text.replace(/"/g, '""')}"`
}

export async function exportSurveyResponsesCsv(db: D1DatabaseLike) {
  const rows = await listSurveyResponses(db)
  const lines = [
    csvHeaders.join(","),
    ...rows.map((row) => csvHeaders.map((header) => csvCell(row[header])).join(",")),
  ]

  return `\uFEFF${lines.join("\n")}`
}

