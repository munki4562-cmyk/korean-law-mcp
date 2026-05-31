#!/usr/bin/env node

const assert = require("assert")

async function testDefectWaterproofRouting() {
  const { buildConstructionRoutePlan } = await import("../build/lib/construction-profile.js")
  const plan = buildConstructionRoutePlan("지하주차장 상부 방수 하자 기준 알려줘")

  assert.ok(plan.isConstructionQuery)
  assert.ok(plan.domains.some(domain => domain.domain === "defect"), plan.domains.map(d => d.domain).join(", "))
  assert.ok(plan.lawCandidates.some(candidate => candidate.query === "공동주택관리법"))
  assert.ok(plan.adminRuleCandidates.some(candidate => candidate.query.includes("하자판정기준")))
  assert.ok(plan.kcscHints.some(hint => hint.includes("KCS")))
}

async function testEnergyInsulationRouting() {
  const { buildConstructionRoutePlan, buildDefectStandardRoutePlan } = await import("../build/lib/construction-profile.js")
  const plan = buildConstructionRoutePlan("단열재 틈새 우레탄폼 충진 법적 근거")
  const defectPlan = buildDefectStandardRoutePlan("단열재 틈새 우레탄폼 충진 하자 기준")

  assert.ok(plan.domains.some(domain => domain.domain === "energy"), plan.domains.map(d => d.domain).join(", "))
  assert.ok(plan.lawCandidates.some(candidate => candidate.query === "녹색건축물 조성 지원법"))
  assert.ok(plan.adminRuleCandidates.some(candidate => candidate.query === "건축물의 에너지절약설계기준"))
  assert.ok(defectPlan.topics.some(topic => topic.topic === "condensation_insulation"))
  assert.ok(defectPlan.standardCandidates.some(candidate => candidate.query.includes("하자판정기준")))
}

async function testQueryRouterUsesConstructionRouter() {
  const { routeQuery } = await import("../build/lib/query-router.js")
  const route = routeQuery("건축허가 사용승인 절차 알려줘")

  assert.strictEqual(route.tool, "route_construction_question")
  assert.strictEqual(route.params.query, "건축허가 사용승인 절차 알려줘")
}

async function testQueryRouterUsesDefectStandard() {
  const { routeQuery } = await import("../build/lib/query-router.js")
  const route = routeQuery("거실 천장 균열이 하자인지 판단해줘")

  assert.strictEqual(route.tool, "search_defect_standard")
  assert.strictEqual(route.params.query, "거실 천장 균열이 하자인지 판단해줘")
}

async function testQueryRouterUsesConstructionDelegation() {
  const { routeQuery } = await import("../build/lib/query-router.js")
  const route = routeQuery("단열재 틈새 우레탄폼 충진 법적 근거 추적해줘")

  assert.strictEqual(route.tool, "trace_construction_delegation")
  assert.strictEqual(route.params.query, "단열재 틈새 우레탄폼 충진 법적 근거 추적해줘")
}

async function testQueryRouterUsesSiteActionBasis() {
  const { routeQuery } = await import("../build/lib/query-router.js")
  const route = routeQuery("감리가 단열 시공 지적하면 뭐라고 회신해?")

  assert.strictEqual(route.tool, "make_site_action_basis")
  assert.strictEqual(route.params.query, "감리가 단열 시공 지적하면 뭐라고 회신해?")
}

async function testQueryRouterDoesNotHijackGenericDefect() {
  const { routeQuery } = await import("../build/lib/query-router.js")
  const route = routeQuery("자동차 하자 환불 가능한가?")

  assert.notStrictEqual(route.tool, "route_construction_question")
}

async function testRouteToolOutput() {
  const { routeConstructionQuestion } = await import("../build/tools/construction-law.js")
  const result = await routeConstructionQuestion({}, {
    query: "감리가 단열 시공 지적하면 근거 뭐 대야 해?",
    candidateLimit: 5,
  })
  const text = result.content[0].text

  assert.ok(text.includes("건축 법령 라우팅 결과"))
  assert.ok(text.includes("우선 조회 법령"))
  assert.ok(text.includes("답변 프레임"))
}

function makeFakeApiClient() {
  return {
    searchLaw: async (query) => `
      <root>
        <law>
          <법령명한글>${query}</법령명한글>
          <법령약칭명></법령약칭명>
          <법령ID>FAKE_LAW_ID</법령ID>
          <법령일련번호>123456</법령일련번호>
          <공포일자>20260101</공포일자>
          <법령구분명>법률</법령구분명>
        </law>
      </root>
    `,
    searchAdminRule: async ({ query }) => `
      <root>
        <admrul>
          <행정규칙명>${query}</행정규칙명>
          <행정규칙일련번호>654321</행정규칙일련번호>
          <행정규칙ID>FAKE_RULE_ID</행정규칙ID>
          <발령일자>20260101</발령일자>
          <행정규칙종류>고시</행정규칙종류>
          <소관부처명>국토교통부</소관부처명>
        </admrul>
      </root>
    `,
    fetchApi: async ({ target, type }) => {
      if (target !== "lsStmd") return ""
      if (type === "XML") {
        return `
          <법령체계도>
            <행정규칙>
              <고시>
                <기본정보>
                  <행정규칙명>건축물의 에너지절약설계기준</행정규칙명>
                  <행정규칙일련번호>777</행정규칙일련번호>
                  <시행일자>20260101</시행일자>
                </기본정보>
              </고시>
            </행정규칙>
          </법령체계도>
        `
      }
      return JSON.stringify({
        법령체계도: {
          기본정보: {
            법령명: "녹색건축물 조성 지원법",
            법종구분: { content: "법률" },
            제개정구분: { content: "일부개정" },
            시행일자: "20260101",
            공포일자: "20251201",
            공포번호: "12345",
          },
          상하위법: {
            법률: {
              시행령: { 기본정보: { 법령명: "녹색건축물 조성 지원법 시행령", 법종구분: { content: "대통령령" } } },
              시행규칙: { 기본정보: { 법령명: "녹색건축물 조성 지원법 시행규칙", 법종구분: { content: "국토교통부령" } } },
            },
          },
          관련법령: {},
        },
      })
    },
    getThreeTier: async () => JSON.stringify({
      LspttnThdCmpLawXService: {
        기본정보: {
          법령ID: "FAKE_LAW_ID",
          법령명: "녹색건축물 조성 지원법",
          시행령ID: "FAKE_DECREE_ID",
          시행령명: "녹색건축물 조성 지원법 시행령",
          시행규칙ID: "FAKE_RULE_ID",
          시행규칙명: "녹색건축물 조성 지원법 시행규칙",
          삼단비교존재여부: "Y",
          삼단비교기준: "L",
        },
        위임조문삼단비교: {
          법률조문: {
            조번호: "0014",
            조가지번호: "00",
            조제목: "에너지 절약계획서 제출",
            조내용: "대통령령으로 정하는 건축물은 에너지 절약계획서를 제출하여야 한다.",
            시행령조문: {
              조번호: "0010",
              조가지번호: "00",
              법령명: "녹색건축물 조성 지원법 시행령",
              조제목: "에너지 절약계획서 제출 대상",
              조내용: "국토교통부령으로 정하는 바에 따른다.",
            },
            위임행정규칙목록: {
              위임행정규칙: {
                위임행정규칙명: "건축물의 에너지절약설계기준",
              },
            },
          },
        },
      },
    }),
  }
}

async function testSearchToolsUseProfileCandidates() {
  const {
    searchConstructionLaw,
    searchConstructionAdminRule,
    searchDefectStandard,
    traceConstructionDelegation,
    makeSiteActionBasis,
  } = await import("../build/tools/construction-law.js")
  const fakeApiClient = makeFakeApiClient()

  const lawResult = await searchConstructionLaw(fakeApiClient, {
    query: "단열재 틈새 우레탄폼 충진 법적 근거",
    display: 1,
    candidateLimit: 2,
    includeAdminRules: false,
  })
  assert.ok(lawResult.content[0].text.includes("녹색건축물 조성 지원법"))

  const ruleResult = await searchConstructionAdminRule(fakeApiClient, {
    query: "지하주차장 상부 방수 하자 기준",
    display: 1,
    candidateLimit: 2,
    includeOriginalQuery: false,
  })
  assert.ok(ruleResult.content[0].text.includes("하자판정기준"))

  const defectResult = await searchDefectStandard(fakeApiClient, {
    query: "지하주차장 상부 방수 누수 하자 기준",
    display: 1,
    candidateLimit: 2,
    includeRelatedLaws: true,
  })
  assert.ok(defectResult.content[0].text.includes("하자판정기준 검색 결과"))
  assert.ok(defectResult.content[0].text.includes("공동주택관리법"))
  assert.ok(defectResult.content[0].text.includes("현장 확인사항"))

  const delegationResult = await traceConstructionDelegation(fakeApiClient, {
    query: "단열재 틈새 우레탄폼 충진 법적 근거",
    candidateLimit: 1,
    includeThreeTier: true,
    includeSystemTree: true,
    includeAdminRules: true,
  })
  assert.ok(delegationResult.content[0].text.includes("건축 위임관계 추적 플랜"))
  assert.ok(delegationResult.content[0].text.includes("3단비교 위임조문"))
  assert.ok(delegationResult.content[0].text.includes("건축물의 에너지절약설계기준"))

  const actionResult = await makeSiteActionBasis(fakeApiClient, {
    query: "단열재 틈새 우레탄폼 충진을 감리가 지적했는데 뭐라고 회신해?",
    audience: "감리",
    stance: "근거회신",
    display: 1,
    candidateLimit: 1,
    includeDefectStandard: true,
    includeDelegation: true,
  })
  assert.ok(actionResult.content[0].text.includes("현장 조치 근거 패키지"))
  assert.ok(actionResult.content[0].text.includes("감리 회신 초안"))
  assert.ok(actionResult.content[0].text.includes("법령 근거 후보"))
  assert.ok(actionResult.content[0].text.includes("회신 전 금지사항"))
}

async function main() {
  await testDefectWaterproofRouting()
  await testEnergyInsulationRouting()
  await testQueryRouterUsesConstructionRouter()
  await testQueryRouterUsesDefectStandard()
  await testQueryRouterUsesConstructionDelegation()
  await testQueryRouterUsesSiteActionBasis()
  await testQueryRouterDoesNotHijackGenericDefect()
  await testRouteToolOutput()
  await testSearchToolsUseProfileCandidates()
  console.log("✅ construction profile tests passed")
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
