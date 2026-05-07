import { z } from "zod"
import {
  GENDER_OPTION_IDS,
  Q1_OPTION_IDS,
  Q2_OPTION_IDS,
  Q3_OPTION_IDS,
  TERMINAL_Q1_ANSWERS,
} from "@/lib/survey/options"

const terminalQ1Ids = new Set<string>(TERMINAL_Q1_ANSWERS)

const optionalKey = z.string().trim().min(1).max(256).optional().nullable()
const otherText = z.string().trim().min(1).max(500)
const optionalAge = z
  .string()
  .trim()
  .regex(/^(?:[0-9]|[1-9][0-9]|1[01][0-9]|120)$/)
  .optional()
  .nullable()

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export const createSurveyResponseSchema = z
  .object({
    userKey: optionalKey,
    fingerprintKey: optionalKey,
    q1Answer: z.enum(Q1_OPTION_IDS),
    q1OtherText: z.string().trim().max(500).optional().nullable(),
    q2Answer: z.enum(Q2_OPTION_IDS).optional().nullable(),
    q2OtherText: z.string().trim().max(500).optional().nullable(),
    q3Answer: z.enum(Q3_OPTION_IDS).optional().nullable(),
    gender: z.enum(GENDER_OPTION_IDS).optional().nullable(),
    ageGroup: optionalAge,
    q1DisplayOrder: z.array(z.enum(Q1_OPTION_IDS)).optional().nullable(),
    q2DisplayOrder: z.array(z.enum(Q2_OPTION_IDS)).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.q1Answer === "other") {
      const parsed = otherText.safeParse(value.q1OtherText)
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "q1OtherText is required when q1Answer is other",
          path: ["q1OtherText"],
        })
      }
    } else if (hasText(value.q1OtherText)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "q1OtherText is only allowed when q1Answer is other",
        path: ["q1OtherText"],
      })
    }

    if (terminalQ1Ids.has(value.q1Answer)) {
      if (value.q2Answer || hasText(value.q2OtherText)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "q2Answer must be empty when q1Answer is terminal",
          path: ["q2Answer"],
        })
      }
      return
    }

    if (!value.q2Answer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "q2Answer is required unless q1Answer is none or no_answer",
        path: ["q2Answer"],
      })
      return
    }

    if (value.q2Answer === "other") {
      const parsed = otherText.safeParse(value.q2OtherText)
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "q2OtherText is required when q2Answer is other",
          path: ["q2OtherText"],
        })
      }
    } else if (hasText(value.q2OtherText)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "q2OtherText is only allowed when q2Answer is other",
        path: ["q2OtherText"],
      })
    }
  })

export const updateSurveyDemographicsSchema = z
  .object({
    gender: z.enum(GENDER_OPTION_IDS).optional().nullable(),
    ageGroup: optionalAge,
  })
  .refine((value) => value.gender !== undefined || value.ageGroup !== undefined, {
    message: "gender or ageGroup is required",
  })

export type CreateSurveyResponseInput = z.infer<typeof createSurveyResponseSchema>
export type UpdateSurveyDemographicsInput = z.infer<typeof updateSurveyDemographicsSchema>
