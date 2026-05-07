import type {
  AgeGroupAnswer,
  GenderAnswer,
  Q1Answer,
  Q2Answer,
  Q3Answer,
} from "@/lib/survey/options"

export type SurveyResponse = {
  id: string
  userKey: string | null
  fingerprintKey: string | null
  q1Answer: Q1Answer
  q1OtherText: string | null
  q2Answer: Q2Answer | null
  q2OtherText: string | null
  q3Answer: Q3Answer | null
  gender: GenderAnswer | null
  ageGroup: AgeGroupAnswer | null
  q1DisplayOrderJson: string | null
  q2DisplayOrderJson: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type SurveyResponseRow = {
  id: string
  user_key: string | null
  fingerprint_key: string | null
  q1_answer: Q1Answer
  q1_other_text: string | null
  q2_answer: Q2Answer | null
  q2_other_text: string | null
  q3_answer: Q3Answer | null
  gender: GenderAnswer | null
  age_group: AgeGroupAnswer | null
  q1_display_order_json: string | null
  q2_display_order_json: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type CreateSurveyResponseRecord = Omit<SurveyResponseRow, "created_at" | "updated_at">

export type UpdateSurveyDemographicsRecord = {
  id: string
  gender: GenderAnswer | null
  age_group: AgeGroupAnswer | null
}

