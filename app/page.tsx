"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft, XCircle, ChevronUp, ChevronDown } from "lucide-react"

type SurveyEntry = {
  id: string
  timestamp: string
  question1: string
  question1FreeText?: string
  question2: string
  question2FreeText?: string
  gender?: string
  failed?: boolean
}

const STORAGE_KEY = "survey-entries"

const question1Options = [
  { id: "sns", label: "SNS", emoji: "📱" },
  { id: "ai", label: "AIチャット・AI検索", emoji: "🤖" },
  { id: "search", label: "検索エンジン・Webサイト", emoji: "🔍" },
  { id: "video", label: "動画プラットフォーム", emoji: "🎬" },
  { id: "tv", label: "テレビ", emoji: "📺" },
  { id: "print", label: "新聞・雑誌", emoji: "📰" },
  { id: "messaging", label: "メール・チャット・通知", emoji: "💬" },
  { id: "other1", label: "その他", emoji: "✏️", hasFreeText: true },
  { id: "none", label: "特にない / 答えたくない", emoji: "🤷" },
]

const genderOptions = [
  { id: "male", label: "男性" },
  { id: "female", label: "女性" },
  { id: "other", label: "その他" },
]

const question2Options = [
  { id: "volume", label: "情報量が多く、追いきれない", emoji: "📚" },
  { id: "difficult", label: "内容が難しく、理解に時間がかかる", emoji: "🤔" },
  { id: "choices", label: "選択肢が多く、選ぶのに迷う", emoji: "🔀" },
  { id: "endless", label: "調べても次々に情報が出てきて、終わりが見えない", emoji: "🔄" },
  { id: "other2", label: "その他", emoji: "✏️", hasFreeText: true },
  { id: "skip", label: "答えたくない", emoji: "🙅" },
]

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default function SurveyPage() {
  const [currentQuestion, setCurrentQuestion] = useState<1 | 2 | "complete">(1)
  const [entries, setEntries] = useState<SurveyEntry[]>([])
  const [currentEntry, setCurrentEntry] = useState<Partial<SurveyEntry>>({})
  const [showFreeTextInput, setShowFreeTextInput] = useState(false)
  const [freeText, setFreeText] = useState("")
  const [pendingOption, setPendingOption] = useState<{ id: string; label: string } | null>(null)
  const [lastEntryId, setLastEntryId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setEntries(parsed)
      } catch {
        // Invalid JSON, start fresh
      }
    }
    setIsLoaded(true)
  }, [])

  // Save entries to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    }
  }, [entries, isLoaded])

  const handleQuestion1Select = (option: typeof question1Options[0]) => {
    if (option.hasFreeText) {
      setPendingOption(option)
      setShowFreeTextInput(true)
      return
    }
    setCurrentEntry({ question1: option.label })
    setCurrentQuestion(2)
  }

  const handleQuestion2Select = (option: typeof question2Options[0]) => {
    if (option.hasFreeText) {
      setPendingOption(option)
      setShowFreeTextInput(true)
      return
    }
    const entryId = generateId()
    const entry: SurveyEntry = {
      id: entryId,
      timestamp: new Date().toISOString(),
      question1: currentEntry.question1 || "",
      question1FreeText: currentEntry.question1FreeText,
      question2: option.label,
    }
    setEntries((prev) => [...prev, entry])
    setLastEntryId(entryId)
    setCurrentQuestion("complete")
  }

  const handleFreeTextSubmit = () => {
    if (!freeText.trim() || !pendingOption) return

    if (currentQuestion === 1) {
      setCurrentEntry({
        question1: pendingOption.label,
        question1FreeText: freeText.trim(),
      })
      setCurrentQuestion(2)
    } else {
      const entryId = generateId()
      const entry: SurveyEntry = {
        id: entryId,
        timestamp: new Date().toISOString(),
        question1: currentEntry.question1 || "",
        question1FreeText: currentEntry.question1FreeText,
        question2: pendingOption.label,
        question2FreeText: freeText.trim(),
      }
      setEntries((prev) => [...prev, entry])
      setLastEntryId(entryId)
      setCurrentQuestion("complete")
    }
    setFreeText("")
    setShowFreeTextInput(false)
    setPendingOption(null)
  }

  const markLastAsFailed = () => {
    if (!lastEntryId) return
    setEntries((prev) =>
      prev.map((e) => (e.id === lastEntryId ? { ...e, failed: true } : e))
    )
  }

  const selectGender = (gender: string) => {
    if (!lastEntryId) return
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== lastEntryId) return e
        // Toggle: if same gender is clicked, clear it
        if (e.gender === gender) {
          return { ...e, gender: undefined }
        }
        return { ...e, gender }
      })
    )
  }

  const startNewSurvey = () => {
    setCurrentEntry({})
    setLastEntryId(null)
    setCurrentQuestion(1)
  }

  const goBackToQuestion1 = () => {
    setCurrentEntry({})
    setCurrentQuestion(1)
  }

  const downloadCSV = () => {
    const headers = [
      "timestamp",
      "媒体",
      "媒体_自由記述",
      "負担のタイプ",
      "負担のタイプ_自由記述",
      "性別",
      "失敗フラグ",
    ]
    const rows = entries.map((e) => [
      e.timestamp,
      e.question1,
      e.question1FreeText || "",
      e.question2,
      e.question2FreeText || "",
      e.gender || "",
      e.failed ? "1" : "0",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `survey-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const currentOptions = currentQuestion === 1 ? question1Options : question2Options
  const lastEntry = entries.find((e) => e.id === lastEntryId)
  const validEntries = entries.filter((e) => !e.failed)

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-8">
      {currentQuestion !== "complete" ? (
        <>
          <header className="mb-6">
            {currentQuestion === 2 && (
              <button
                onClick={goBackToQuestion1}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">戻る</span>
              </button>
            )}
            <p className="text-sm text-muted-foreground mb-1">
              質問 {currentQuestion} / 2
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">
              {currentQuestion === 1
                ? "最近、情報接触のなかで最も負担・疲労感を感じるものを1つ選んでください。"
                : "その負担・疲労感に最も近い理由を1つ選んでください。"}
            </h1>
          </header>

          <main className="flex-1 flex flex-wrap gap-3 content-start max-w-4xl w-full mx-auto">
            {currentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() =>
                  currentQuestion === 1
                    ? handleQuestion1Select(option as typeof question1Options[0])
                    : handleQuestion2Select(option as typeof question2Options[0])
                }
                className="flex items-center gap-3 min-h-[56px] px-4 rounded-xl border-2 border-border bg-card text-card-foreground transition-all duration-200 hover:border-primary hover:bg-accent active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex-grow basis-[calc(50%-0.375rem)] md:basis-[calc(33.333%-0.5rem)]"
              >
                <span className="text-xl md:text-2xl" role="img" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="text-sm md:text-base font-medium text-left flex-1">
                  {option.label}
                </span>
              </button>
            ))}
          </main>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              ご回答ありがとうございました
            </h2>
            <p className="text-muted-foreground mb-6">
              回答が記録されました。
            </p>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">
                差し支えなければ、性別を教えてください（任意）
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {genderOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => selectGender(option.label)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                      lastEntry?.gender === option.label
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={startNewSurvey} className="w-full">
                もう一度回答する
              </Button>
              {lastEntry && !lastEntry.failed && (
                <Button
                  variant="outline"
                  onClick={markLastAsFailed}
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4" />
                  失敗としてマークする
                </Button>
              )}
              {lastEntry?.failed && (
                <p className="text-sm text-muted-foreground">
                  この回答は失敗としてマークされました
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showFreeTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">その他</h2>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="具体的に教えてください..."
              className="w-full h-32 p-3 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowFreeTextInput(false)
                  setFreeText("")
                  setPendingOption(null)
                }}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleFreeTextSubmit}
                disabled={!freeText.trim()}
              >
                決定
              </Button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 flex items-center justify-end gap-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showStats ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>有効回答数: {validEntries.length} / 全体: {entries.length}</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>統計を表示</span>
            </>
          )}
        </button>
        <Button
          onClick={downloadCSV}
          disabled={entries.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          ダウンロード
        </Button>
      </footer>
    </div>
  )
}
