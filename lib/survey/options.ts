export const Q1_OPTION_IDS = [
  "sns",
  "ai_chat_search",
  "search_engine_web",
  "video_platform",
  "tv",
  "newspaper_magazine",
  "email_chat_notification",
  "other",
  "none",
  "no_answer",
] as const

export const Q1_OPTIONS = [
  { id: "sns", label: "SNS" },
  { id: "ai_chat_search", label: "AIチャット・AI検索" },
  { id: "search_engine_web", label: "検索エンジン・Webサイト" },
  { id: "video_platform", label: "動画プラットフォーム" },
  { id: "tv", label: "テレビ" },
  { id: "newspaper_magazine", label: "新聞・雑誌" },
  { id: "email_chat_notification", label: "メール・チャット・通知" },
  { id: "other", label: "その他" },
  { id: "none", label: "特にない" },
  { id: "no_answer", label: "答えたくない" },
] as const

export const Q2_OPTION_IDS = [
  "too_much_information",
  "difficult_to_understand",
  "too_many_choices",
  "endless_information",
  "other",
  "no_answer",
] as const

export const Q2_OPTIONS = [
  { id: "too_much_information", label: "情報量が多く、追いきれない" },
  { id: "difficult_to_understand", label: "内容が難しく、理解に時間がかかる" },
  { id: "too_many_choices", label: "選択肢が多く、選ぶのに迷う" },
  { id: "endless_information", label: "調べても次々に情報が出てきて、終わりが見えない" },
  { id: "other", label: "その他" },
  { id: "no_answer", label: "答えたくない" },
] as const

export const Q3_OPTION_IDS = [
  "never_used",
  "rarely_used",
  "sometimes_uncertain",
  "basic_familiar",
  "purposeful_use",
  "no_answer",
] as const

export const Q3_OPTIONS = [
  { id: "never_used", label: "使ったことがない" },
  { id: "rarely_used", label: "使ったことはあるが、ほとんど使わない" },
  { id: "sometimes_uncertain", label: "必要なときに使うが、使い方にはまだ迷う" },
  { id: "basic_familiar", label: "よく使っており、基本的な使い方には慣れている" },
  { id: "purposeful_use", label: "よく使っており、目的に応じて使い分けられる" },
  { id: "no_answer", label: "回答しない" },
] as const

export const GENDER_OPTION_IDS = ["male", "female", "other", "no_answer"] as const

export const GENDER_OPTIONS = [
  { id: "male", label: "男性" },
  { id: "female", label: "女性" },
  { id: "other", label: "その他 / 上記に当てはまらない" },
  { id: "no_answer", label: "回答しない" },
] as const

export type Q1Answer = (typeof Q1_OPTION_IDS)[number]
export type Q2Answer = (typeof Q2_OPTION_IDS)[number]
export type Q3Answer = (typeof Q3_OPTION_IDS)[number]
export type GenderAnswer = (typeof GENDER_OPTION_IDS)[number]

export const TERMINAL_Q1_ANSWERS = ["none", "no_answer"] as const satisfies readonly Q1Answer[]
