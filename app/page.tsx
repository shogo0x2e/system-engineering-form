"use client"

import { type ReactNode, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  GENDER_OPTIONS,
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  TERMINAL_Q1_ANSWERS,
  type GenderAnswer,
  type Q1Answer,
  type Q2Answer,
  type Q3Answer,
} from "@/lib/survey/options"
import {
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Check,
  CircleHelp,
  CircleSlash,
  ClipboardList,
  ListChecks,
  Loader2,
  Lock,
  Newspaper,
  PlaySquare,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Sprout,
  Target,
  Tv,
  UserRound,
  type LucideIcon,
} from "lucide-react"

type Step = "start" | "q1" | "q2" | "q3" | "complete"
type ProgressStep = Exclude<Step, "start">

type SurveyResponsePayload = {
  response?: {
    id: string
  }
  error?: string
}

type SurveyFormValues = {
  q1Answer: Q1Answer | null
  q1OtherText: string | null
  q2Answer: Q2Answer | null
  q2OtherText: string | null
  q3Answer: Q3Answer | null
  gender: GenderAnswer | null
  ageGroup: string | null
}

const defaultFormValues: SurveyFormValues = {
  q1Answer: null,
  q1OtherText: null,
  q2Answer: null,
  q2OtherText: null,
  q3Answer: null,
  gender: null,
  ageGroup: null,
}

const q1Tail = ["other", "none", "no_answer"] satisfies Q1Answer[]
const q2Tail = ["other", "no_answer"] satisfies Q2Answer[]
const terminalQ1Answers = new Set<string>(TERMINAL_Q1_ANSWERS)
const progressSteps = [
  { id: "q1", label: "Q1" },
  { id: "q2", label: "Q2" },
  { id: "q3", label: "Q3" },
  { id: "complete", label: "完了" },
] as const satisfies readonly { id: ProgressStep; label: string }[]

const iconMap: Record<string, LucideIcon> = {
  sns: Share2,
  ai_chat_search: Bot,
  search_engine_web: Search,
  video_platform: PlaySquare,
  tv: Tv,
  newspaper_magazine: Newspaper,
  email_chat_notification: Bell,
  other: CircleHelp,
  none: CircleSlash,
  no_answer: Lock,
  too_much_information: ClipboardList,
  difficult_to_understand: Brain,
  too_many_choices: ListChecks,
  endless_information: RefreshCw,
  never_used: BookOpen,
  rarely_used: Sprout,
  sometimes_uncertain: CircleHelp,
  basic_familiar: Sparkles,
  purposeful_use: Target,
  male: UserRound,
  female: UserRound,
}

function shuffle<T>(items: readonly T[]) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function randomizeWithTail<T extends { id: string }>(options: readonly T[], tailIds: readonly string[]) {
  const tail = options.filter((option) => tailIds.includes(option.id))
  const randomized = shuffle(options.filter((option) => !tailIds.includes(option.id)))
  return [...randomized, ...tail]
}

function createDisplayOrders() {
  const q1Options = randomizeWithTail(Q1_OPTIONS, q1Tail)
  const q2Options = randomizeWithTail(Q2_OPTIONS, q2Tail)

  return {
    q1Options,
    q2Options,
    q1DisplayOrder: q1Options.map((option) => option.id),
    q2DisplayOrder: q2Options.map((option) => option.id),
  }
}

function isTerminalQ1(answer: Q1Answer | null) {
  return answer ? terminalQ1Answers.has(answer) : false
}

function StepProgress({ current }: { current: ProgressStep }) {
  const currentIndex = progressSteps.findIndex((step) => step.id === current)
  const progressPercent = (currentIndex / (progressSteps.length - 1)) * 100

  return (
    <div className="relative ml-auto w-[224px] max-w-[68%] pt-1" aria-label="アンケートの進行状況">
      <div className="absolute left-4 right-4 top-[10px] h-px bg-[#c5ccd6]" aria-hidden="true">
        <div className="h-px bg-[#0b66e4]" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="relative grid grid-cols-4">
        {progressSteps.map((step, index) => {
          const active = index === currentIndex
          const complete = index < currentIndex

          return (
            <div key={step.id} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "h-3 w-3 rounded-full border bg-white",
                  active && "border-[#0b66e4] bg-[#0b66e4] ring-2 ring-[#d7e7ff]",
                  complete && "border-[#0b66e4] bg-[#0b66e4]",
                  !active && !complete && "border-[#b9c0ca] bg-[#b9c0ca]"
                )}
                aria-hidden="true"
              />
              <span className={cn("text-[11px] font-semibold", active ? "text-[#0b66e4]" : "text-[#8a94a3]")}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SurveyFrame({
  questionNumber,
  current,
  title,
  subtitle,
  children,
  footer,
  note,
}: {
  questionNumber: 1 | 2 | 3
  current: ProgressStep
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer: ReactNode
  note?: ReactNode
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-[18px] border border-[#d9e5f3] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <header className="px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0b66e4] text-lg font-bold text-white shadow-[0_8px_18px_rgba(11,102,228,0.28)]">
            Q{questionNumber}
          </div>
          <StepProgress current={current} />
        </div>
        <div className="mx-auto mt-4 max-w-[440px] text-center">
          {subtitle}
          <h1 className="text-balance text-[19px] font-bold leading-8 text-[#111827] sm:text-[21px]">{title}</h1>
        </div>
      </header>

      <main className="flex-1 px-5 pb-4 sm:px-6">{children}</main>

      {note && <div className="px-5 pb-3 text-[12px] leading-5 text-[#6b7280] sm:px-6">{note}</div>}

      <footer className="mt-auto bg-[#f7fbff] px-5 py-4 sm:px-6">{footer}</footer>
    </section>
  )
}

function QuestionFooter({
  backLabel = "戻る",
  nextLabel,
  onBack,
  onNext,
  disabled,
  loading,
  errorMessage,
}: {
  backLabel?: string
  nextLabel: string
  onBack: () => void
  onNext: () => void
  disabled?: boolean
  loading?: boolean
  errorMessage?: string | null
}) {
  return (
    <div className="space-y-2">
      {errorMessage && <p className="text-sm font-medium text-destructive">{errorMessage}</p>}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 min-w-[98px] rounded-md border-[#b8c2d0] bg-white px-5 text-base font-semibold text-[#6b7280] hover:bg-[#f1f5f9]"
        >
          {backLabel}
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={disabled || loading}
          className="h-11 min-w-[132px] rounded-md bg-[#0b66e4] px-6 text-base font-bold text-white shadow-[0_8px_18px_rgba(11,102,228,0.22)] hover:bg-[#0757c4]"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}

function OptionButton({
  id,
  label,
  selected,
  onClick,
}: {
  id: string
  label: string
  selected?: boolean
  onClick: () => void
}) {
  const Icon = iconMap[id] ?? CircleHelp

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[58px] w-full items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#84b8ff] hover:bg-[#f7fbff] focus:outline-none focus:ring-2 focus:ring-[#0b66e4] focus:ring-offset-2",
        selected ? "border-[#0b66e4] bg-[#eef6ff]" : "border-[#d9e2ec]"
      )}
    >
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
          selected ? "border-[#0b66e4]" : "border-[#a8b2c0]"
        )}
        aria-hidden="true"
      >
        {selected && <span className="h-[10px] w-[10px] rounded-full bg-[#0b66e4]" />}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#4b5563]">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-[16px] font-semibold leading-6">{label}</span>
    </button>
  )
}

function Q3Scale({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-10 shrink-0 flex-col items-center pt-1 text-[12px] font-semibold text-[#111827]">
        <span>低い</span>
        <div className="relative my-2 min-h-[350px] w-4 flex-1 rounded-full bg-gradient-to-b from-[#dbeafe] via-[#93c5fd] to-[#60a5fa]">
          <span className="absolute -bottom-3 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent border-t-[#60a5fa]" />
        </div>
        <span className="mt-3">高い</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  )
}

function DemographicChoiceButton({
  id,
  label,
  selected,
  onClick,
}: {
  id: string
  label: string
  selected?: boolean
  onClick: () => void
}) {
  const Icon = iconMap[id] ?? CircleHelp

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md border bg-white px-3 text-left text-sm font-semibold text-[#111827] transition-colors hover:border-[#84b8ff] hover:bg-[#f7fbff] focus:outline-none focus:ring-2 focus:ring-[#0b66e4] focus:ring-offset-2",
        selected ? "border-[#0b66e4] bg-[#eef6ff]" : "border-[#d7dee8]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden="true" />
      {label}
    </button>
  )
}

export default function SurveyPage() {
  const [attemptKey, setAttemptKey] = useState(0)
  const [step, setStep] = useState<Step>("start")
  const [responseId, setResponseId] = useState<string | null>(null)
  const [freeText, setFreeText] = useState("")
  const [freeTextTarget, setFreeTextTarget] = useState<"q1" | "q2" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [demographicsSubmitted, setDemographicsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { getValues, reset, setValue, watch } = useForm<SurveyFormValues>({
    defaultValues: defaultFormValues,
  })

  const q1Answer = watch("q1Answer")
  const q1OtherText = watch("q1OtherText")
  const q2Answer = watch("q2Answer")
  const q2OtherText = watch("q2OtherText")
  const q3Answer = watch("q3Answer")
  const gender = watch("gender")
  const ageGroup = watch("ageGroup")
  const hasDemographicsInput = Boolean(gender || ageGroup?.trim())

  const { q1Options, q2Options, q1DisplayOrder, q2DisplayOrder } = useMemo(
    () => createDisplayOrders(),
    [attemptKey]
  )

  const resetAttempt = () => {
    setAttemptKey((value) => value + 1)
    setStep("q1")
    reset(defaultFormValues)
    setResponseId(null)
    setFreeText("")
    setFreeTextTarget(null)
    setDemographicsSubmitted(false)
    setErrorMessage(null)
  }

  const handleQ1Select = (answer: Q1Answer) => {
    setErrorMessage(null)
    const currentAnswer = getValues("q1Answer")

    if (currentAnswer !== answer) {
      setValue("q2Answer", null)
      setValue("q2OtherText", null)
    }

    if (answer === "other") {
      setFreeText(getValues("q1OtherText") ?? "")
      setFreeTextTarget("q1")
      return
    }

    setValue("q1Answer", answer)
    setValue("q1OtherText", null)
  }

  const handleQ2Select = (answer: Q2Answer) => {
    setErrorMessage(null)

    if (answer === "other") {
      setFreeText(getValues("q2OtherText") ?? "")
      setFreeTextTarget("q2")
      return
    }

    setValue("q2Answer", answer)
    setValue("q2OtherText", null)
  }

  const submitFreeText = () => {
    const text = freeText.trim()
    if (!text || !freeTextTarget) return

    if (freeTextTarget === "q1") {
      setValue("q1Answer", "other")
      setValue("q1OtherText", text)
      setValue("q2Answer", null)
      setValue("q2OtherText", null)
    } else {
      setValue("q2Answer", "other")
      setValue("q2OtherText", text)
    }

    setFreeText("")
    setFreeTextTarget(null)
    setErrorMessage(null)
  }

  const goNextFromQ1 = () => {
    const values = getValues()

    if (!values.q1Answer) {
      setErrorMessage("Q1を選択してください。")
      return
    }

    setErrorMessage(null)
    if (isTerminalQ1(values.q1Answer)) {
      setValue("q2Answer", null)
      setValue("q2OtherText", null)
      setStep("q3")
      return
    }

    setStep("q2")
  }

  const goNextFromQ2 = () => {
    const values = getValues()

    if (!values.q2Answer) {
      setErrorMessage("Q2を選択してください。")
      return
    }

    setErrorMessage(null)
    setStep("q3")
  }

  const submitCoreResponse = async () => {
    const values = getValues()
    if (!values.q1Answer) {
      setErrorMessage("Q1を選択してください。")
      setStep("q1")
      return
    }
    if (!isTerminalQ1(values.q1Answer) && !values.q2Answer) {
      setErrorMessage("Q2を選択してください。")
      setStep("q2")
      return
    }
    if (!values.q3Answer) {
      setErrorMessage("Q3を選択してください。回答しない場合は「回答しない」を選んでください。")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch("/api/survey/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          q1Answer: values.q1Answer,
          q1OtherText: values.q1OtherText,
          q2Answer: isTerminalQ1(values.q1Answer) ? null : values.q2Answer,
          q2OtherText: isTerminalQ1(values.q1Answer) ? null : values.q2OtherText,
          q3Answer: values.q3Answer,
          q1DisplayOrder,
          q2DisplayOrder,
        }),
      })
      const payload = (await res.json().catch(() => null)) as SurveyResponsePayload | null

      if (!res.ok || !payload?.response?.id) {
        throw new Error(payload?.error ?? "回答を保存できませんでした。")
      }

      setResponseId(payload.response.id)
      setStep("complete")
    } catch {
      setErrorMessage("回答を保存できませんでした。時間をおいてもう一度お試しください。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitDemographics = async () => {
    const values = getValues()
    const ageGroup = values.ageGroup?.trim() || null

    if (!responseId) {
      return
    }

    if (!values.gender && !ageGroup) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/survey/responses/${responseId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gender: values.gender, ageGroup }),
      })

      if (!res.ok) {
        throw new Error("optional demographics update failed")
      }

      setDemographicsSubmitted(true)
    } catch {
      setErrorMessage("任意項目を保存できませんでした。時間をおいてもう一度お試しください。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const goBackFromQ3 = () => {
    setErrorMessage(null)
    if (isTerminalQ1(q1Answer)) {
      setStep("q1")
      return
    }
    setStep("q2")
  }

  return (
    <div className="min-h-screen bg-[#f3f7fc] p-3 text-[#111827] sm:p-5">
      {step === "start" && (
        <main className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[560px] flex-col justify-center">
          <section className="rounded-[18px] border border-[#d9e5f3] bg-white px-6 py-8 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
            <p className="mb-3 text-sm font-semibold text-[#0b66e4]">情報疲労アンケート</p>
            <h1 className="text-balance text-2xl font-bold leading-9 sm:text-3xl">
              最近の情報接触で感じる負担について教えてください。
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#6b7280]">
              氏名・メールアドレスは取得しません。回答は研究・発表での集計に使い、個人が特定される形では扱いません。
            </p>
            <Button
              onClick={resetAttempt}
              size="lg"
              className="mt-8 rounded-md bg-[#0b66e4] px-7 font-bold text-white hover:bg-[#0757c4]"
            >
              回答をはじめる
            </Button>
          </section>
        </main>
      )}

      {step === "q1" && (
        <SurveyFrame
          questionNumber={1}
          current="q1"
          title="最近の情報接触のなかで、最も負担・疲労感を感じるものを1つ選んでください。"
          footer={
            <QuestionFooter
              onBack={() => setStep("start")}
              onNext={goNextFromQ1}
              nextLabel="次へ"
              disabled={!q1Answer}
              errorMessage={errorMessage}
            />
          }
        >
          <div className="flex flex-col gap-2">
            {q1Options.map((option) => (
              <OptionButton
                key={option.id}
                id={option.id}
                label={
                  option.id === "other" && q1Answer === "other" && q1OtherText
                    ? `その他：${q1OtherText}`
                    : option.label
                }
                selected={q1Answer === option.id}
                onClick={() => handleQ1Select(option.id)}
              />
            ))}
          </div>
        </SurveyFrame>
      )}

      {step === "q2" && (
        <SurveyFrame
          questionNumber={2}
          current="q2"
          title="Q1で選んだものについて、負担・疲労感に最も近い理由を1つ選んでください。"
          footer={
            <QuestionFooter
              onBack={() => {
                setErrorMessage(null)
                setStep("q1")
              }}
              onNext={goNextFromQ2}
              nextLabel="次へ"
              disabled={!q2Answer}
              errorMessage={errorMessage}
            />
          }
        >
          <div className="flex flex-col gap-3">
            {q2Options.map((option) => (
              <OptionButton
                key={option.id}
                id={option.id}
                label={
                  option.id === "other" && q2Answer === "other" && q2OtherText
                    ? `その他：${q2OtherText}`
                    : option.label
                }
                selected={q2Answer === option.id}
                onClick={() => handleQ2Select(option.id)}
              />
            ))}
          </div>
        </SurveyFrame>
      )}

      {step === "q3" && (
        <SurveyFrame
          questionNumber={3}
          current="q3"
          title="AIチャット・AI検索への慣れに最も近いものを1つ選んでください。"
          subtitle={
            <span className="mb-2 inline-flex rounded-md border border-[#0b66e4] px-2 py-0.5 text-xs font-bold text-[#0b66e4]">
              必須
            </span>
          }
          note="※回答しない場合は「回答しない」を選んでください。"
          footer={
            <QuestionFooter
              onBack={goBackFromQ3}
              onNext={submitCoreResponse}
              nextLabel="回答を送信"
              disabled={!q3Answer}
              loading={isSubmitting}
              errorMessage={errorMessage}
            />
          }
        >
          <div>
            <Q3Scale>
              {Q3_OPTIONS.filter((option) => option.id !== "no_answer").map((option) => (
                <OptionButton
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={q3Answer === option.id}
                  onClick={() => {
                    setErrorMessage(null)
                    setValue("q3Answer", option.id)
                  }}
                />
              ))}
            </Q3Scale>
            <div className="ml-[52px] mt-4 border-t border-dashed border-[#d9e2ec] pt-4">
              {Q3_OPTIONS.filter((option) => option.id === "no_answer").map((option) => (
                <OptionButton
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={q3Answer === option.id}
                  onClick={() => {
                    setErrorMessage(null)
                    setValue("q3Answer", option.id)
                  }}
                />
              ))}
            </div>
          </div>
        </SurveyFrame>
      )}

      {step === "complete" && (
        <main className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[560px] flex-col justify-center">
          <section className="rounded-[18px] border border-[#d9e5f3] bg-white px-5 py-8 text-center shadow-[0_18px_48px_rgba(15,23,42,0.10)] sm:px-6">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0b66e4] text-white">
              <Check className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl">ご協力ありがとうございました！</h1>
            <p className="mt-3 text-sm text-[#6b7280]">本体の回答は送信済みです。</p>

            <section className="mt-7 rounded-lg bg-[#f3f5f8] p-4 text-left sm:p-5">
              <div className="mb-5">
                <p className="text-xs font-bold text-[#0b66e4]">任意項目</p>
                <h2 className="mt-1 text-base font-bold text-[#111827]">
                  結果の解釈の参考にするため、性別・年齢にもご協力ください。
                </h2>
                <p className="mt-2 text-xs leading-6 text-[#6b7280]">入力しない場合は、このままページを閉じてください。</p>
              </div>

              {demographicsSubmitted ? (
                <div className="flex items-center gap-3 rounded-md bg-white px-4 py-3 text-[#0b66e4]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b66e4] text-white">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">任意項目を送信しました。</p>
                    <p className="mt-1 text-xs text-[#6b7280]">追加のご協力ありがとうございました。</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-5">
                    <section className="space-y-2">
                      <h3 className="text-sm font-bold text-[#4b5563]">性別</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {GENDER_OPTIONS.map((option) => (
                          <DemographicChoiceButton
                            key={option.id}
                            id={option.id}
                            label={option.id === "other" ? "その他" : option.label}
                            selected={gender === option.id}
                            onClick={() => setValue("gender", option.id)}
                          />
                        ))}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-sm font-bold text-[#4b5563]">年齢</h3>
                      <label className="flex min-h-11 items-center gap-2 rounded-md border border-[#d7dee8] bg-white px-3 text-[#111827] transition-colors focus-within:border-[#0b66e4] focus-within:ring-2 focus-within:ring-[#0b66e4] focus-within:ring-offset-2">
                        <Calendar className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden="true" />
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={120}
                          value={ageGroup ?? ""}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, "").slice(0, 3)
                            const value = digits ? String(Math.min(Number(digits), 120)) : null
                            setValue("ageGroup", value)
                          }}
                          placeholder="例: 20"
                          aria-label="年齢"
                          className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#9ca3af]"
                        />
                        <span className="shrink-0 text-xs font-semibold text-[#6b7280]">歳</span>
                      </label>
                    </section>
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    {errorMessage && <p className="text-sm font-medium text-destructive">{errorMessage}</p>}
                    <Button
                      onClick={submitDemographics}
                      disabled={isSubmitting || !hasDemographicsInput}
                      className="ml-auto rounded-md bg-[#0b66e4] px-5 font-bold text-white hover:bg-[#0757c4]"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      任意項目を送信する
                    </Button>
                  </div>
                </>
              )}
            </section>
          </section>
        </main>
      )}

      {freeTextTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#d9e2ec] bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">その他</h2>
            <textarea
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder="具体的に教えてください"
              className="h-32 w-full resize-none rounded-lg border border-[#d9e2ec] bg-white p-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0b66e4]"
              autoFocus
            />
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFreeText("")
                  setFreeTextTarget(null)
                }}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1 bg-[#0b66e4] text-white hover:bg-[#0757c4]"
                onClick={submitFreeText}
                disabled={!freeText.trim()}
              >
                決定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
