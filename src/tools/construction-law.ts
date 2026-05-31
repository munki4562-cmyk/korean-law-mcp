/**
 * 건축·건설 법령 프로파일 도구
 *
 * 기존 법령/행정규칙 검색 도구 위에 건축 실무용 라우팅 레이어를 얹는다.
 * 법령 원문은 법제처 API에서 조회하고, 이 도구는 검색 범위와 순서를 좁힌다.
 */

import { z } from "zod"
import type { LawApiClient } from "../lib/api-client.js"
import type { ToolResponse, LooseToolResponse } from "../lib/types.js"
import { truncateSections } from "../lib/schemas.js"
import { formatToolError } from "../lib/errors.js"
import {
  buildDefectStandardRoutePlan,
  buildConstructionDelegationRoutePlan,
  buildConstructionRoutePlan,
  type ConstructionCandidate,
  type ConstructionRoutePlan,
} from "../lib/construction-profile.js"
import { findLaws, type LawInfo } from "../lib/law-search.js"
import { searchLaw } from "./search.js"
import { searchAdminRule } from "./admin-rule.js"
import { getThreeTier } from "./three-tier.js"
import { getLawSystemTree } from "./law-system-tree.js"

export const RouteConstructionQuestionSchema = z.object({
  query: z.string().describe("건축·건설 실무 질문"),
  candidateLimit: z.number().min(1).max(10).default(6).describe("추천 후보 개수"),
})

export const SearchConstructionLawSchema = z.object({
  query: z.string().describe("건축·건설 실무 질문 또는 검색어"),
  display: z.number().min(1).max(20).default(5).describe("후보 법령별 검색 결과 개수"),
  candidateLimit: z.number().min(1).max(8).default(5).describe("우선 검색할 법령 후보 개수"),
  includeAdminRules: z.boolean().default(false).describe("관련 고시·지침 후보 검색도 함께 수행"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
})

export const SearchConstructionAdminRuleSchema = z.object({
  query: z.string().describe("건축·건설 실무 질문 또는 고시·지침 검색어"),
  display: z.number().min(1).max(20).default(5).describe("후보별 검색 결과 개수"),
  candidateLimit: z.number().min(1).max(8).default(5).describe("우선 검색할 하위자료 후보 개수"),
  includeOriginalQuery: z.boolean().default(false).describe("프로파일 후보와 함께 원문 검색어도 추가 검색"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
})

export const SearchDefectStandardSchema = z.object({
  query: z.string().describe("공동주택·건축 하자 여부/하자판정기준 관련 질문"),
  display: z.number().min(1).max(20).default(5).describe("후보별 검색 결과 개수"),
  candidateLimit: z.number().min(1).max(8).default(5).describe("우선 검색할 후보 개수"),
  includeRelatedLaws: z.boolean().default(true).describe("공동주택관리법/주택법/민법 등 관련 법령 검색 포함"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
})

export const TraceConstructionDelegationSchema = z.object({
  query: z.string().describe("건축·건설 법령의 위임관계/법적 근거/하위자료 추적 질문"),
  lawName: z.string().optional().describe("직접 지정할 기준 법령명. 없으면 건축 프로파일로 후보를 추정"),
  candidateLimit: z.number().min(1).max(5).default(3).describe("추적할 법령 후보 개수"),
  includeThreeTier: z.boolean().default(true).describe("3단비교 위임조문 조회 포함"),
  includeSystemTree: z.boolean().default(true).describe("법령체계도 조회 포함"),
  includeAdminRules: z.boolean().default(true).describe("관련 고시·훈령·예규·지침 검색 포함"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
})

export const MakeSiteActionBasisSchema = z.object({
  query: z.string().describe("현장 조치 근거를 만들 건축·건설 실무 질문"),
  audience: z.enum(["감리", "발주처", "협력업체", "CS", "내부"]).default("감리").describe("회신/조치문 대상"),
  stance: z.enum(["추가확인", "보완시공", "근거회신", "하자대응", "시공승인"]).default("추가확인").describe("현장 대응 방향"),
  display: z.number().min(1).max(10).default(3).describe("근거 검색 후보별 표시 결과 개수"),
  candidateLimit: z.number().min(1).max(5).default(3).describe("우선 검색할 후보 개수"),
  includeDefectStandard: z.boolean().default(true).describe("하자/결로/누수/균열 등인 경우 하자판정기준 검색 포함"),
  includeDelegation: z.boolean().default(true).describe("법률→시행령→시행규칙→고시 위임관계 추적 포함"),
  apiKey: z.string().optional().describe("법제처 Open API 인증키(OC). 사용자가 제공한 경우 전달"),
})

export type RouteConstructionQuestionInput = z.infer<typeof RouteConstructionQuestionSchema>
export type SearchConstructionLawInput = z.infer<typeof SearchConstructionLawSchema>
export type SearchConstructionAdminRuleInput = z.infer<typeof SearchConstructionAdminRuleSchema>
export type SearchDefectStandardInput = z.infer<typeof SearchDefectStandardSchema>
export type TraceConstructionDelegationInput = z.infer<typeof TraceConstructionDelegationSchema>
export type MakeSiteActionBasisInput = z.infer<typeof MakeSiteActionBasisSchema>

function formatCandidateList(candidates: ConstructionCandidate[], emptyText: string): string {
  if (candidates.length === 0) return emptyText
  return candidates
    .map((candidate, index) => {
      const reasons = candidate.reasons.slice(0, 2).join(" / ")
      return `${index + 1}. ${candidate.query} (score ${candidate.score})${reasons ? ` - ${reasons}` : ""}`
    })
    .join("\n")
}

function formatRoutePlan(plan: ConstructionRoutePlan): string {
  const domainText = plan.domains.length > 0
    ? plan.domains.map((domain, index) => (
      `${index + 1}. ${domain.label} (score ${domain.score}) - ${domain.matchedKeywords.join(", ")}`
    )).join("\n")
    : "건축 도메인 키워드를 뚜렷하게 잡지 못했습니다. 원문 검색 또는 법령명 직접 검색을 병행하세요."

  const kcscText = plan.kcscHints.length > 0
    ? plan.kcscHints.map((hint, index) => `${index + 1}. ${hint}`).join("\n")
    : "KCSC 연결 축은 질문 유형이 더 구체화되면 제안됩니다."

  return [
    `건축 법령 라우팅 결과: "${plan.query}"`,
    "",
    `건축 질문 판정: ${plan.isConstructionQuery ? "YES" : "LOW_CONFIDENCE"}`,
    "",
    "▶ 질문 유형",
    domainText,
    "",
    "▶ 우선 조회 법령",
    formatCandidateList(plan.lawCandidates, "추천 법령 후보 없음"),
    "",
    "▶ 우선 조회 하위자료",
    formatCandidateList(plan.adminRuleCandidates, "추천 고시·지침 후보 없음"),
    "",
    "▶ 판례/해석례 검색어",
    formatCandidateList(plan.decisionQueries, "추천 판례·해석례 검색어 없음"),
    "",
    "▶ KCSC 연결 힌트",
    kcscText,
    "",
    "▶ 추천 실행 순서",
    `1. route_construction_question(query="${plan.query}")`,
    `2. search_construction_law(query="${plan.query}")`,
    `3. search_construction_admin_rule(query="${plan.query}")`,
    `4. 필요 시 search_decisions(domain="precedent" 또는 "interpretation")`,
    `5. 기술기준 쟁점은 construction-standards-mcp의 KCS/KDS 검색과 연결`,
    "",
    "▶ 답변 프레임",
    plan.answerFrame.map((item, index) => `${index + 1}. ${item}`).join("\n"),
  ].join("\n")
}

function formatDefectPlan(plan: ReturnType<typeof buildDefectStandardRoutePlan>): string {
  const topicText = plan.topics.length > 0
    ? plan.topics.map((topic, index) => (
      `${index + 1}. ${topic.label} (score ${topic.score}) - ${topic.matchedKeywords.join(", ")}`
    )).join("\n")
    : "세부 하자 유형을 뚜렷하게 잡지 못했습니다. 누수/균열/결로/마감/설비처럼 공종·현상을 더 넣으면 정확도가 올라갑니다."

  const kcscText = plan.kcscHints.length > 0
    ? plan.kcscHints.map((hint, index) => `${index + 1}. ${hint}`).join("\n")
    : "공종이 특정되면 관련 KCS/KDS 기준을 연결하세요."

  const siteCheckText = plan.siteChecks.length > 0
    ? plan.siteChecks.map((check, index) => `${index + 1}. ${check}`).join("\n")
    : "사진, 위치, 범위, 발생 시점, 사용 조건, 시공 기록을 우선 확보하세요."

  return [
    `하자판정 라우팅 결과: "${plan.query}"`,
    "",
    `건축 하자 질문 판정: ${plan.isConstructionDefectQuery ? "YES" : "LOW_CONFIDENCE"}`,
    "",
    "▶ 하자 유형",
    topicText,
    "",
    "▶ 하자판정기준 후보",
    formatCandidateList(plan.standardCandidates, "추천 하자판정기준 후보 없음"),
    "",
    "▶ 관련 법령 후보",
    formatCandidateList(plan.lawCandidates, "추천 관련 법령 후보 없음"),
    "",
    "▶ 판례/해석례 검색어",
    formatCandidateList(plan.decisionQueries, "추천 판례·해석례 검색어 없음"),
    "",
    "▶ KCSC 연결 힌트",
    kcscText,
    "",
    "▶ 현장 확인사항",
    siteCheckText,
  ].join("\n")
}

function formatDelegationPlan(plan: ReturnType<typeof buildConstructionDelegationRoutePlan>): string {
  return [
    `건축 위임관계 추적 플랜: "${plan.query}"`,
    "",
    `건축 질문 판정: ${plan.isConstructionQuery ? "YES" : "LOW_CONFIDENCE"}`,
    "",
    "▶ 추적 초점",
    plan.traceFocus.map((focus, index) => `${index + 1}. ${focus}`).join("\n"),
    "",
    "▶ 기준 법령 후보",
    formatCandidateList(plan.lawCandidates, "추천 법령 후보 없음"),
    "",
    "▶ 하위자료 후보",
    formatCandidateList(plan.adminRuleCandidates, "추천 고시·지침 후보 없음"),
    "",
    "▶ 실행 순서",
    plan.suggestedSteps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
  ].join("\n")
}

function isSubordinateLawQuery(query: string): boolean {
  return /시행령|시행규칙|기준에 관한 규칙|산업안전보건기준|피난ㆍ방화구조|주차장법 시행규칙/.test(query)
}

function trimToolText(text: string, maxLength = 4500): string {
  if (text.length <= maxLength) return text.trim()
  const sliced = text.slice(0, maxLength)
  const lastNewline = sliced.lastIndexOf("\n")
  const clean = lastNewline > 0 ? sliced.slice(0, lastNewline) : sliced
  return `${clean}\n   ⚠️ 이 후보 검색 결과가 길어 일부만 표시했습니다.`
}

function formatSearchSection(
  title: string,
  candidate: ConstructionCandidate,
  result: LooseToolResponse,
  sourceTool: string
): string {
  const reason = candidate.reasons.slice(0, 2).join(" / ")
  const status = result.isError ? " [NOT_FOUND / FAILED]" : ""
  const body = result.content[0]?.text || ""
  return [
    `▶ ${title}: ${candidate.query}${status}`,
    `source_tool: ${sourceTool}`,
    reason ? `reason: ${reason}` : "",
    "",
    trimToolText(body),
  ].filter(Boolean).join("\n")
}

function formatLawInfo(law: LawInfo): string {
  return `${law.lawName} (lawId=${law.lawId || "N/A"}, mst=${law.mst || "N/A"}, type=${law.lawType || "N/A"})`
}

function formatToolSection(title: string, result: LooseToolResponse, maxLength = 6500): string {
  const status = result.isError ? " [NOT_FOUND / FAILED]" : ""
  const body = result.content[0]?.text || ""
  return [`▶ ${title}${status}`, "", trimToolText(body, maxLength)].join("\n")
}

function isDefectRelatedQuery(query: string): boolean {
  return /하자|하자판정|하자보수|누수|균열|결로|곰팡이|들뜸|탈락|배관|설비|마감/.test(query)
}

function formatSiteActionIntro(
  input: MakeSiteActionBasisInput,
  routePlan: ConstructionRoutePlan,
  defectPlan: ReturnType<typeof buildDefectStandardRoutePlan>
): string {
  const domains = routePlan.domains.length > 0
    ? routePlan.domains.slice(0, 4).map(domain => domain.label).join(", ")
    : "건축 일반"
  const issueType = defectPlan.isConstructionDefectQuery
    ? `하자 검토(${defectPlan.topics.slice(0, 3).map(topic => topic.label).join(", ") || "유형 미상"})`
    : domains

  const conclusionByStance: Record<MakeSiteActionBasisInput["stance"], string> = {
    추가확인: "현재 단계에서는 조건부 판단입니다. 설계도서, 시방서, 승인자재, 검측기록, 현장 사진을 대조한 뒤 조치 범위를 확정해야 합니다.",
    보완시공: "보완시공 필요성이 있는 사안입니다. 보완 범위, 사용 자재, 검측 기준, 완료 사진 기록을 먼저 확정해야 합니다.",
    근거회신: "근거 회신이 필요한 사안입니다. 법령·고시·시방서·설계도서의 적용 순서를 확인한 뒤 회신 문구를 확정해야 합니다.",
    하자대응: "하자 리스크가 있는 사안입니다. 하자판정기준, 관련 법령, KCS/KDS, 현장 증빙을 함께 검토해야 합니다.",
    시공승인: "시공 승인 여부를 판단해야 하는 사안입니다. 승인도서, 특기시방, 자재승인서, 관련 고시 기준 충족 여부를 확인해야 합니다.",
  }

  return [
    `현장 조치 근거 패키지: "${input.query}"`,
    "",
    `대상: ${input.audience}`,
    `대응 방향: ${input.stance}`,
    `쟁점 유형: ${issueType}`,
    "",
    "▶ 결론 초안",
    conclusionByStance[input.stance],
    "",
    "▶ 적용 기준 축",
    `1. 법령: ${formatCandidateList(routePlan.lawCandidates.slice(0, 4), "법령 후보 없음")}`,
    `2. 하위자료: ${formatCandidateList(routePlan.adminRuleCandidates.slice(0, 4), "고시·지침 후보 없음")}`,
    `3. 기술기준: ${(routePlan.kcscHints.length > 0 ? routePlan.kcscHints : ["관련 KCS/KDS 공종 기준 확인"]).slice(0, 4).join(" / ")}`,
  ].join("\n")
}

function formatSiteChecklist(
  routePlan: ConstructionRoutePlan,
  defectPlan: ReturnType<typeof buildDefectStandardRoutePlan>
): string {
  const checks = [
    "설계도면, 특기시방서, 표준시방서 적용 순서 확인",
    "자재승인서, 시험성적서, 시공상세도, 제조사 시방 확인",
    "감리 지시사항, 회의록, 검측요청서, 검측결과 서면 확보",
    "시공 전·중·후 사진과 위치도, 범위, 치수 기록",
    "보완시공 시 사용 자재, 보완 범위, 재검측 기준 명시",
    ...defectPlan.siteChecks,
  ]
  const uniqueChecks = Array.from(new Set(checks)).slice(0, 10)
  const kcsc = routePlan.kcscHints.length > 0
    ? routePlan.kcscHints.map((hint, index) => `${index + 1}. ${hint}`).join("\n")
    : "1. 공종별 KCS/KDS 기준 확인\n2. 사내 표준상세·품질점검표 확인"

  return [
    "▶ 현장 확인 체크리스트",
    uniqueChecks.map((check, index) => `${index + 1}. ${check}`).join("\n"),
    "",
    "▶ KCSC/기술기준 연결",
    kcsc,
  ].join("\n")
}

function makeReplyDraft(
  input: MakeSiteActionBasisInput,
  routePlan: ConstructionRoutePlan,
  defectPlan: ReturnType<typeof buildDefectStandardRoutePlan>
): string {
  const basis = [
    ...routePlan.lawCandidates.slice(0, 2).map(candidate => candidate.query),
    ...routePlan.adminRuleCandidates.slice(0, 2).map(candidate => candidate.query),
  ]
  const basisText = basis.length > 0 ? basis.join(", ") : "관련 법령 및 하위기준"
  const defectText = defectPlan.isConstructionDefectQuery
    ? " 하자판정 가능성도 함께 검토하겠습니다."
    : ""

  const drafts: Record<MakeSiteActionBasisInput["audience"], string> = {
    감리: `본 건은 ${basisText} 및 설계도서·시방서 적용 여부를 확인한 뒤 조치 범위를 확정하겠습니다.${defectText} 현장 확인자료와 보완계획을 정리하여 검측 기준과 함께 제출하겠습니다.`,
    발주처: `본 건은 ${basisText}에 따른 적용 기준과 현장 시공 상태를 대조해 검토하겠습니다.${defectText} 확인 결과에 따라 보완 필요 범위, 일정, 증빙자료를 정리해 보고드리겠습니다.`,
    협력업체: `본 건은 ${basisText}, 승인도서, 자재승인 기준을 기준으로 재확인합니다. 해당 부위의 시공 상태, 사용 자재, 사진 자료를 제출하고 보완 필요 시 보완 범위와 재검측 일정을 회신해 주시기 바랍니다.`,
    CS: `본 건은 현장 확인 및 관련 기준 검토가 필요한 사항입니다.${defectText} 위치, 범위, 발생 시점, 사진 자료를 확보한 뒤 기준 부합 여부와 조치 방향을 안내드리겠습니다.`,
    내부: `본 건은 ${basisText}, KCS/KDS, 사내기준을 함께 대조해야 합니다.${defectText} 우선 증빙자료를 확보하고 법령 근거, 기술기준, 하자 리스크, 보완 범위를 분리해 검토하겠습니다.`,
  }

  return [
    `▶ ${input.audience} 회신 초안`,
    drafts[input.audience],
    "",
    "▶ 회신 전 금지사항",
    "1. 원문 조문·고시 본문 확인 전 단정 표현 금지",
    "2. 하자 여부를 사진만으로 확정하지 않기",
    "3. 설계도서와 특기시방서 확인 전 임의 자재·공법 승인 금지",
    "4. 구두 지시만으로 조치하지 말고 회의록·검측서·사진을 남기기",
  ].join("\n")
}

async function safeCall(
  toolName: string,
  call: () => Promise<LooseToolResponse>
): Promise<LooseToolResponse> {
  try {
    return await call()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: "text", text: `[FAILED] ${toolName}: ${message}` }],
      isError: true,
    }
  }
}

export async function routeConstructionQuestion(
  _apiClient: LawApiClient,
  input: RouteConstructionQuestionInput
): Promise<ToolResponse> {
  try {
    const plan = buildConstructionRoutePlan(input.query, input.candidateLimit)
    return {
      content: [{ type: "text", text: formatRoutePlan(plan) }],
    }
  } catch (error) {
    return formatToolError(error, "route_construction_question")
  }
}

export async function searchConstructionLaw(
  apiClient: LawApiClient,
  input: SearchConstructionLawInput
): Promise<ToolResponse> {
  try {
    const plan = buildConstructionRoutePlan(input.query, input.candidateLimit)
    const candidates = plan.lawCandidates.length > 0
      ? plan.lawCandidates
      : [{ query: input.query, score: 1, reasons: ["건축 프로파일 후보 없음 - 원문 검색"] }]

    const results = await Promise.all(candidates.map(async (candidate) => {
      const result = await safeCall("search_law", () => searchLaw(apiClient, {
        query: candidate.query,
        display: input.display,
        apiKey: input.apiKey,
      }))
      return { candidate, result }
    }))

    const sections = [
      formatRoutePlan(plan),
      "",
      "━━━ 건축 법령 우선 검색 결과 ━━━",
      ...results.map(({ candidate, result }) => formatSearchSection("법령 후보", candidate, result, "search_law")),
    ]

    if (input.includeAdminRules) {
      const adminResult = await searchConstructionAdminRule(apiClient, {
        query: input.query,
        display: input.display,
        candidateLimit: input.candidateLimit,
        includeOriginalQuery: false,
        apiKey: input.apiKey,
      })
      sections.push("", "━━━ 관련 하위자료 검색 결과 ━━━", adminResult.content[0]?.text || "")
    }

    return {
      content: [{ type: "text", text: truncateSections(sections.join("\n\n"), 50000, 7000) }],
      isError: results.every(({ result }) => !!result.isError),
    }
  } catch (error) {
    return formatToolError(error, "search_construction_law")
  }
}

export async function searchConstructionAdminRule(
  apiClient: LawApiClient,
  input: SearchConstructionAdminRuleInput
): Promise<ToolResponse> {
  try {
    const plan = buildConstructionRoutePlan(input.query, input.candidateLimit)
    const candidateMap = new Map<string, ConstructionCandidate>()

    for (const candidate of plan.adminRuleCandidates) {
      candidateMap.set(candidate.query, candidate)
    }

    if (input.includeOriginalQuery && !candidateMap.has(input.query)) {
      candidateMap.set(input.query, {
        query: input.query,
        score: 1,
        reasons: ["사용자 원문 추가 검색"],
      })
    }

    if (candidateMap.size === 0) {
      candidateMap.set(input.query, {
        query: input.query,
        score: 1,
        reasons: ["하위자료 후보 없음 - 원문 검색"],
      })
    }

    const candidates = Array.from(candidateMap.values()).slice(0, input.candidateLimit)
    const results = await Promise.all(candidates.map(async (candidate) => {
      const sourceTool = isSubordinateLawQuery(candidate.query) ? "search_law" : "search_admin_rule"
      const result = sourceTool === "search_law"
        ? await safeCall("search_law", () => searchLaw(apiClient, {
          query: candidate.query,
          display: input.display,
          apiKey: input.apiKey,
        }))
        : await safeCall("search_admin_rule", () => searchAdminRule(apiClient, {
          query: candidate.query,
          display: input.display,
          apiKey: input.apiKey,
        }))
      return { candidate, result, sourceTool }
    }))

    const output = [
      `건축 하위자료 검색 결과: "${input.query}"`,
      "",
      "▶ 우선 조회 하위자료 후보",
      formatCandidateList(candidates, "추천 고시·지침 후보 없음"),
      "",
      "━━━ 검색 결과 ━━━",
      ...results.map(({ candidate, result, sourceTool }) => (
        formatSearchSection("하위자료 후보", candidate, result, sourceTool)
      )),
    ].join("\n\n")

    return {
      content: [{ type: "text", text: truncateSections(output, 50000, 7000) }],
      isError: results.every(({ result }) => !!result.isError),
    }
  } catch (error) {
    return formatToolError(error, "search_construction_admin_rule")
  }
}

export async function searchDefectStandard(
  apiClient: LawApiClient,
  input: SearchDefectStandardInput
): Promise<ToolResponse> {
  try {
    const plan = buildDefectStandardRoutePlan(input.query, input.candidateLimit)
    const standardResults = await Promise.all(plan.standardCandidates.map(async (candidate) => {
      const result = await safeCall("search_admin_rule", () => searchAdminRule(apiClient, {
        query: candidate.query,
        display: input.display,
        apiKey: input.apiKey,
      }))
      return { candidate, result }
    }))

    const sections = [
      formatDefectPlan(plan),
      "",
      "━━━ 하자판정기준 검색 결과 ━━━",
      ...standardResults.map(({ candidate, result }) => (
        formatSearchSection("하자판정기준 후보", candidate, result, "search_admin_rule")
      )),
    ]

    if (input.includeRelatedLaws) {
      const lawResults = await Promise.all(plan.lawCandidates.map(async (candidate) => {
        const result = await safeCall("search_law", () => searchLaw(apiClient, {
          query: candidate.query,
          display: input.display,
          apiKey: input.apiKey,
        }))
        return { candidate, result }
      }))
      sections.push(
        "",
        "━━━ 관련 법령 검색 결과 ━━━",
        ...lawResults.map(({ candidate, result }) => (
          formatSearchSection("관련 법령 후보", candidate, result, "search_law")
        )),
      )
    }

    sections.push(
      "",
      "━━━ 다음 조회 제안 ━━━",
      "1. 위 검색 결과의 행정규칙ID로 get_admin_rule을 호출해 하자판정기준 본문 확인",
      "2. 관련 법령 MST로 get_law_text를 호출해 하자보수·책임 조문 확인",
      "3. 판례는 search_decisions(domain=\"precedent\")에 위 판례/해석례 검색어 사용",
      "4. 기술 쟁점은 construction-standards-mcp에서 KCS/KDS 공종 기준 확인",
    )

    return {
      content: [{ type: "text", text: truncateSections(sections.join("\n\n"), 50000, 7000) }],
      isError: standardResults.every(({ result }) => !!result.isError),
    }
  } catch (error) {
    return formatToolError(error, "search_defect_standard")
  }
}

export async function traceConstructionDelegation(
  apiClient: LawApiClient,
  input: TraceConstructionDelegationInput
): Promise<ToolResponse> {
  try {
    const plan = buildConstructionDelegationRoutePlan(input.lawName || input.query, input.candidateLimit)
    const lawCandidateQueries = input.lawName
      ? [{ query: input.lawName, score: 100, reasons: ["사용자 지정 법령"] }]
      : plan.lawCandidates

    const lawMatches: Array<{ candidate: ConstructionCandidate; laws: LawInfo[] }> = []
    for (const candidate of lawCandidateQueries.slice(0, input.candidateLimit)) {
      const laws = await findLaws(apiClient, candidate.query, input.apiKey, 1, 50)
      lawMatches.push({ candidate, laws })
    }

    const selectedLaws = lawMatches
      .flatMap(({ laws }) => laws)
      .filter((law, index, arr) => arr.findIndex(other => other.mst === law.mst && other.lawId === law.lawId) === index)
      .slice(0, input.candidateLimit)

    const sections: string[] = [
      formatDelegationPlan(plan),
      "",
      "━━━ 법령 식별 결과 ━━━",
      selectedLaws.length > 0
        ? selectedLaws.map((law, index) => `${index + 1}. ${formatLawInfo(law)}`).join("\n")
        : "[NOT_FOUND] 기준 법령을 식별하지 못했습니다. 법령명을 직접 지정해 재시도하세요.",
    ]

    if (selectedLaws.length === 0) {
      return {
        content: [{ type: "text", text: sections.join("\n\n") }],
        isError: true,
      }
    }

    for (const law of selectedLaws) {
      sections.push("", `━━━ ${law.lawName} 위임관계 추적 ━━━`)

      if (input.includeSystemTree) {
        const systemTree = await safeCall("get_law_system_tree", () => getLawSystemTree(apiClient, {
          mst: law.mst,
          lawId: law.lawId,
          apiKey: input.apiKey,
        }))
        sections.push(formatToolSection("상하위법·행정규칙 체계", systemTree))
      }

      if (input.includeThreeTier) {
        const threeTier = await safeCall("get_three_tier", () => getThreeTier(apiClient, {
          mst: law.mst,
          lawId: law.lawId,
          knd: "2",
          apiKey: input.apiKey,
        }))
        sections.push(formatToolSection("3단비교 위임조문", threeTier))
      }
    }

    if (input.includeAdminRules && plan.adminRuleCandidates.length > 0) {
      const adminResults = await Promise.all(plan.adminRuleCandidates.slice(0, input.candidateLimit).map(async (candidate) => {
        const result = await safeCall("search_admin_rule", () => searchAdminRule(apiClient, {
          query: candidate.query,
          display: 5,
          apiKey: input.apiKey,
        }))
        return { candidate, result }
      }))
      sections.push(
        "",
        "━━━ 관련 고시·지침 후보 검색 ━━━",
        ...adminResults.map(({ candidate, result }) => (
          formatSearchSection("하위자료 후보", candidate, result, "search_admin_rule")
        )),
      )
    }

    sections.push(
      "",
      "━━━ 해석 가이드 ━━━",
      "1. 법률 조문이 '대통령령으로 정한다'면 시행령을 확인하세요.",
      "2. 시행령이 '국토교통부령으로 정한다'면 시행규칙을 확인하세요.",
      "3. 시행규칙 또는 조문이 '국토교통부장관이 정하여 고시'라고 하면 고시·지침 본문까지 내려가야 합니다.",
      "4. 현장 답변에는 법률 조문만 쓰지 말고, 실제 치수·서식·판정기준이 있는 하위자료까지 함께 인용하세요.",
    )

    return {
      content: [{ type: "text", text: truncateSections(sections.join("\n\n"), 50000, 8000) }],
    }
  } catch (error) {
    return formatToolError(error, "trace_construction_delegation")
  }
}

export async function makeSiteActionBasis(
  apiClient: LawApiClient,
  input: MakeSiteActionBasisInput
): Promise<ToolResponse> {
  try {
    const routePlan = buildConstructionRoutePlan(input.query, input.candidateLimit)
    const defectPlan = buildDefectStandardRoutePlan(input.query, input.candidateLimit)
    const shouldIncludeDefect = input.includeDefectStandard && (
      defectPlan.isConstructionDefectQuery || isDefectRelatedQuery(input.query)
    )

    const [lawBasis, adminBasis, defectBasis, delegationBasis] = await Promise.all([
      safeCall("search_construction_law", () => searchConstructionLaw(apiClient, {
        query: input.query,
        display: input.display,
        candidateLimit: input.candidateLimit,
        includeAdminRules: false,
        apiKey: input.apiKey,
      })),
      safeCall("search_construction_admin_rule", () => searchConstructionAdminRule(apiClient, {
        query: input.query,
        display: input.display,
        candidateLimit: input.candidateLimit,
        includeOriginalQuery: false,
        apiKey: input.apiKey,
      })),
      shouldIncludeDefect
        ? safeCall("search_defect_standard", () => searchDefectStandard(apiClient, {
          query: input.query,
          display: input.display,
          candidateLimit: input.candidateLimit,
          includeRelatedLaws: false,
          apiKey: input.apiKey,
        }))
        : Promise.resolve({
          content: [{ type: "text", text: "하자판정기준 검색은 이 질문에서 자동 포함하지 않았습니다." }],
          isError: false,
        } satisfies LooseToolResponse),
      input.includeDelegation
        ? safeCall("trace_construction_delegation", () => traceConstructionDelegation(apiClient, {
          query: input.query,
          candidateLimit: Math.min(input.candidateLimit, 2),
          includeThreeTier: true,
          includeSystemTree: true,
          includeAdminRules: false,
          apiKey: input.apiKey,
        }))
        : Promise.resolve({
          content: [{ type: "text", text: "위임관계 추적은 입력 옵션에 따라 생략했습니다." }],
          isError: false,
        } satisfies LooseToolResponse),
    ])

    const sections = [
      formatSiteActionIntro(input, routePlan, defectPlan),
      "",
      formatSiteChecklist(routePlan, defectPlan),
      "",
      makeReplyDraft(input, routePlan, defectPlan),
      "",
      "━━━ 근거 검색 묶음 ━━━",
      formatToolSection("법령 근거 후보", lawBasis, 5500),
      "",
      formatToolSection("고시·지침·하위자료 후보", adminBasis, 5500),
      "",
      formatToolSection("하자판정기준 후보", defectBasis, 5000),
      "",
      formatToolSection("위임관계 추적", delegationBasis, 6500),
      "",
      "━━━ 최종 사용 방법 ━━━",
      "1. 위 검색 결과에서 실제 조문·고시 본문을 열어 시행일과 조문 번호를 확인하세요.",
      "2. 회신에는 법령명만 쓰지 말고 조문, 고시명, 도면·시방서 번호, 검측 기록을 함께 적으세요.",
      "3. 현장 조치는 보완 범위, 자재, 작업자, 완료일, 재검측 기준을 표로 남기세요.",
      "4. 하자·분쟁 가능성이 있으면 사진 원본, 위치도, 측정값, 입주민/감리 지적 이력을 별도 보관하세요.",
    ]

    return {
      content: [{ type: "text", text: truncateSections(sections.join("\n\n"), 50000, 8000) }],
      isError: lawBasis.isError && adminBasis.isError && defectBasis.isError && delegationBasis.isError,
    }
  } catch (error) {
    return formatToolError(error, "make_site_action_basis")
  }
}
