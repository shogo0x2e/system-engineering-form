import type { D1DatabaseLike } from "@/lib/server/db"
import type {
  CreateSurveyResponseRecord,
  SurveyResponseRow,
  UpdateSurveyDemographicsRecord,
} from "@/lib/survey/types"

export async function createSurveyResponse(
  db: D1DatabaseLike,
  record: CreateSurveyResponseRecord
) {
  await db
    .prepare(
      `
      INSERT INTO survey_responses (
        id,
        user_key,
        fingerprint_key,
        q1_answer,
        q1_other_text,
        q2_answer,
        q2_other_text,
        q3_answer,
        gender,
        age_group,
        q1_display_order_json,
        q2_display_order_json,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      record.id,
      record.user_key,
      record.fingerprint_key,
      record.q1_answer,
      record.q1_other_text,
      record.q2_answer,
      record.q2_other_text,
      record.q3_answer,
      record.gender,
      record.age_group,
      record.q1_display_order_json,
      record.q2_display_order_json,
      record.completed_at
    )
    .run()
}

export async function updateSurveyDemographics(
  db: D1DatabaseLike,
  record: UpdateSurveyDemographicsRecord
) {
  const result = await db
    .prepare(
      `
      UPDATE survey_responses
      SET
        gender = ?,
        age_group = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `
    )
    .bind(record.gender, record.age_group, record.id)
    .run()

  return result
}

export async function findSurveyResponseById(db: D1DatabaseLike, id: string) {
  return db
    .prepare(
      `
      SELECT
        id,
        user_key,
        fingerprint_key,
        q1_answer,
        q1_other_text,
        q2_answer,
        q2_other_text,
        q3_answer,
        gender,
        age_group,
        q1_display_order_json,
        q2_display_order_json,
        completed_at,
        created_at,
        updated_at
      FROM survey_responses
      WHERE id = ?
    `
    )
    .bind(id)
    .first<SurveyResponseRow>()
}

export async function listSurveyResponses(db: D1DatabaseLike) {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        user_key,
        fingerprint_key,
        q1_answer,
        q1_other_text,
        q2_answer,
        q2_other_text,
        q3_answer,
        gender,
        age_group,
        q1_display_order_json,
        q2_display_order_json,
        completed_at,
        created_at,
        updated_at
      FROM survey_responses
      ORDER BY created_at ASC, id ASC
    `
    )
    .all<SurveyResponseRow>()

  return result.results ?? []
}

