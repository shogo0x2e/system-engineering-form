"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
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
  ArrowLeft,
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
      className={`flex min-h-[64px] basis-full items-center gap-3 rounded-lg border-2 bg-card px-4 text-card-foreground transition-all duration-200 hover:border-primary hover:bg-accent active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(33.333%-0.5rem)] ${
        selected ? "border-primary bg-primary/10" : "border-border"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 text-left text-sm font-medium md:text-base">{label}</span>
    </button>
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
      className={`flex min-h-11 items-center gap-2 rounded-md border bg-background px-3 text-left text-sm font-medium transition-colors hover:border-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
  const q2Answer = watch("q2Answer")
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
    setValue("q2Answer", null)
    setValue("q2OtherText", null)

    if (answer === "other") {
      setFreeText("")
      setFreeTextTarget("q1")
      return
    }

    setValue("q1Answer", answer)
    setValue("q1OtherText", null)
    setStep(isTerminalQ1(answer) ? "q3" : "q2")
  }

  const handleQ2Select = (answer: Q2Answer) => {
    setErrorMessage(null)

    if (answer === "other") {
      setFreeText("")
      setFreeTextTarget("q2")
      return
    }

    setValue("q2Answer", answer)
    setValue("q2OtherText", null)
    setStep("q3")
  }

  const submitFreeText = () => {
    const text = freeText.trim()
    if (!text || !freeTextTarget) return

    if (freeTextTarget === "q1") {
      setValue("q1Answer", "other")
      setValue("q1OtherText", text)
      setValue("q2Answer", null)
      setValue("q2OtherText", null)
      setStep("q2")
    } else {
      setValue("q2Answer", "other")
      setValue("q2OtherText", text)
      setStep("q3")
    }

    setFreeText("")
    setFreeTextTarget(null)
  }

  const submitCoreResponse = async () => {
    const values = getValues()
    if (!values.q1Answer || !values.q3Answer) {
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
    if (isTerminalQ1(q1Answer)) {
      setStep("q1")
      return
    }
    setStep("q2")
  }

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col md:min-h-[calc(100vh-4rem)]">
        {step === "start" && (
          <main className="flex flex-1 flex-col justify-center gap-8">
            <section className="max-w-3xl">
              <p className="mb-3 text-sm font-medium text-muted-foreground">情報疲労アンケート</p>
              <h1 className="text-2xl font-bold leading-tight md:text-4xl">
                最近の情報接触で感じる負担について教えてください。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                氏名・メールアドレスは取得しません。回答は研究・発表での集計に使い、個人が特定される形では扱いません。
              </p>
            </section>
            <div>
              <Button onClick={resetAttempt} size="lg">
                回答をはじめる
              </Button>
            </div>
          </main>
        )}

        {step === "q1" && (
          <>
            <header className="mb-6">
              <p className="mb-1 text-sm text-muted-foreground">質問 1 / 3</p>
              <h1 className="text-balance text-xl font-bold md:text-2xl">
                最近の情報接触のなかで、最も負担・疲労感を感じるものを1つ選んでください。
              </h1>
            </header>
            <main className="flex flex-1 flex-wrap content-start gap-3">
              {q1Options.map((option) => (
                <OptionButton
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={q1Answer === option.id}
                  onClick={() => handleQ1Select(option.id)}
                />
              ))}
            </main>
          </>
        )}

        {step === "q2" && (
          <>
            <header className="mb-6">
              <button
                type="button"
                onClick={() => setStep("q1")}
                className="mb-4 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">戻る</span>
              </button>
              <p className="mb-1 text-sm text-muted-foreground">質問 2 / 3</p>
              <h1 className="text-balance text-xl font-bold md:text-2xl">
                Q1で選んだものについて、その負担・疲労感に最も近い理由を1つ選んでください。
              </h1>
            </header>
            <main className="flex flex-1 flex-wrap content-start gap-3">
              {q2Options.map((option) => (
                <OptionButton
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={q2Answer === option.id}
                  onClick={() => handleQ2Select(option.id)}
                />
              ))}
            </main>
          </>
        )}

        {step === "q3" && (
          <>
            <header className="mb-6">
              <button
                type="button"
                onClick={goBackFromQ3}
                className="mb-4 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">戻る</span>
              </button>
              <p className="mb-1 text-sm text-muted-foreground">質問 3 / 3</p>
              <h1 className="text-balance text-xl font-bold md:text-2xl">
                AIチャット・AI検索への慣れに最も近いものを1つ選んでください。
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">回答しない場合は「回答しない」を選んでください。</p>
            </header>
            <main className="flex flex-1 flex-wrap content-start gap-3">
              {Q3_OPTIONS.map((option) => (
                <OptionButton
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={q3Answer === option.id}
                  onClick={() => setValue("q3Answer", option.id)}
                />
              ))}
            </main>
            <footer className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
              {errorMessage && <p className="text-sm text-destructive sm:mr-auto">{errorMessage}</p>}
              <Button onClick={submitCoreResponse} disabled={isSubmitting || !q3Answer}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                次へ
              </Button>
            </footer>
          </>
        )}

        {step === "complete" && (
          <main className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <Check className="mb-4 h-10 w-10 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold md:text-3xl">ご協力ありがとうございました！</h1>
            <p className="mt-3 text-sm text-muted-foreground">本体の回答は送信済みです。</p>

            <section className="mt-8 w-full max-w-2xl rounded-lg border border-border bg-muted/40 p-4 text-left shadow-sm md:p-5">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">任意項目</p>
                <h2 className="mt-1 text-base font-semibold text-foreground">結果の解釈の参考にするため、任意項目にもご協力ください。</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">入力しない場合は、このままページを閉じてください。</p>
              </div>

              {demographicsSubmitted && (
                <p className="mb-4 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  任意項目を送信しました。
                </p>
              )}

              <div className="space-y-5">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">性別</h3>
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
                  <h3 className="text-sm font-semibold text-muted-foreground">年齢</h3>
                  <label className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-card-foreground transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                    />
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">歳</span>
                  </label>
                </section>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                <Button
                  onClick={submitDemographics}
                  disabled={isSubmitting || demographicsSubmitted || !hasDemographicsInput}
                  className="sm:ml-auto"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  任意項目を送信する
                </Button>
              </div>
            </section>

            <Button onClick={resetAttempt} variant="ghost" className="mt-6">
              もう一度回答する
            </Button>
          </main>
        )}
      </div>

      {freeTextTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">その他</h2>
            <textarea
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder="具体的に教えてください"
              className="h-32 w-full resize-none rounded-lg border border-border bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              <Button className="flex-1" onClick={submitFreeText} disabled={!freeText.trim()}>
                決定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
