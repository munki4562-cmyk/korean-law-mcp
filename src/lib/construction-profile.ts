/**
 * 건축·건설 실무 질문용 도메인 프로파일.
 *
 * 이 파일은 법령 원문을 보관하지 않는다. 사용자 자연어를 건축 실무 축으로
 * 분류하고, 기존 법령/행정규칙/판례 검색 도구에 넘길 우선 검색어를 만든다.
 */

export type ConstructionDomain =
  | "permit"
  | "housing"
  | "quality"
  | "supervision"
  | "defect"
  | "safety"
  | "fire"
  | "energy"
  | "accessibility"
  | "parking"
  | "maintenance"
  | "contract"
  | "local"

export interface ConstructionDomainProfile {
  domain: ConstructionDomain
  label: string
  keywords: string[]
  lawQueries: string[]
  adminRuleQueries: string[]
  decisionQueries: string[]
  kcscHints: string[]
}

export interface ConstructionRouteSignal {
  domain: ConstructionDomain
  label: string
  score: number
  matchedKeywords: string[]
  reason: string
  lawQueries: string[]
  adminRuleQueries: string[]
  decisionQueries: string[]
  kcscHints: string[]
}

export interface ConstructionCandidate {
  query: string
  score: number
  reasons: string[]
}

export interface ConstructionRoutePlan {
  query: string
  isConstructionQuery: boolean
  domains: ConstructionRouteSignal[]
  lawCandidates: ConstructionCandidate[]
  adminRuleCandidates: ConstructionCandidate[]
  decisionQueries: ConstructionCandidate[]
  kcscHints: string[]
  answerFrame: string[]
}

export interface DefectStandardTopic {
  topic: string
  label: string
  keywords: string[]
  standardQueries: string[]
  lawQueries: string[]
  decisionQueries: string[]
  kcscHints: string[]
  siteChecks: string[]
}

export interface DefectStandardRoutePlan {
  query: string
  isConstructionDefectQuery: boolean
  topics: Array<DefectStandardTopic & { score: number; matchedKeywords: string[] }>
  standardCandidates: ConstructionCandidate[]
  lawCandidates: ConstructionCandidate[]
  decisionQueries: ConstructionCandidate[]
  kcscHints: string[]
  siteChecks: string[]
}

export interface ConstructionDelegationRoutePlan {
  query: string
  isConstructionQuery: boolean
  lawCandidates: ConstructionCandidate[]
  adminRuleCandidates: ConstructionCandidate[]
  traceFocus: string[]
  suggestedSteps: string[]
}

export const CONSTRUCTION_ANSWER_FRAME = [
  "결론: 가능 / 불가 / 조건부 가능 / 추가확인 필요",
  "적용 법령: 법률·시행령·시행규칙 조문과 시행일",
  "하위자료: 고시·훈령·예규·지침·별표·별지서식",
  "기술기준 연결: KCS/KDS/표준시방서 확인 축",
  "하자·분쟁 리스크: 하자판정기준·판례·행정심판례",
  "현장 확인사항: 도면·시방서·승인서·검측·사진",
  "조치 근거: 감리/발주처/협력업체 회신에 넣을 근거",
]

const DEFECT_STANDARD_MAIN_QUERY = "공동주택 하자의 조사, 보수비용 산정 및 하자판정기준"

export const DEFECT_STANDARD_TOPICS: DefectStandardTopic[] = [
  {
    topic: "waterproofing",
    label: "누수/방수",
    keywords: ["누수", "방수", "지하주차장", "옥상", "외벽", "균열누수", "물샘", "배수", "드레인"],
    standardQueries: [DEFECT_STANDARD_MAIN_QUERY, "하자판정기준 누수", "하자판정기준 방수"],
    lawQueries: ["공동주택관리법", "주택법", "민법"],
    decisionQueries: ["공동주택 누수 하자", "방수 하자 손해배상", "지하주차장 누수 하자"],
    kcscHints: ["방수공사 KCS", "지하구조물 방수", "콘크리트 균열 보수"],
    siteChecks: ["누수 위치와 유입 경로", "강우/살수 재현 여부", "방수층·보호층 시공 기록", "균열 폭과 진행성 사진"],
  },
  {
    topic: "crack",
    label: "균열/콘크리트",
    keywords: ["균열", "크랙", "콘크리트", "슬래브", "벽체", "천장", "처짐", "침하", "철근노출"],
    standardQueries: [DEFECT_STANDARD_MAIN_QUERY, "하자판정기준 균열", "하자판정기준 콘크리트"],
    lawQueries: ["공동주택관리법", "주택법", "건설기술 진흥법", "민법"],
    decisionQueries: ["공동주택 균열 하자", "콘크리트 균열 하자", "천장 균열 하자"],
    kcscHints: ["콘크리트공사 KCS", "균열 보수 KCS", "구조 안전 검토 기준"],
    siteChecks: ["균열 폭·길이·깊이", "구조부/비구조부 구분", "진행성 계측", "누수·철근부식 동반 여부"],
  },
  {
    topic: "condensation_insulation",
    label: "결로/단열",
    keywords: ["결로", "단열", "단열재", "열교", "곰팡이", "창호", "우레탄폼", "충진", "기밀"],
    standardQueries: [DEFECT_STANDARD_MAIN_QUERY, "하자판정기준 결로", "하자판정기준 단열"],
    lawQueries: ["공동주택관리법", "녹색건축물 조성 지원법", "건축법", "주택법"],
    decisionQueries: ["공동주택 결로 하자", "단열 하자", "창호 결로 하자"],
    kcscHints: ["단열공사 KCS", "창호공사 KCS", "건축물 에너지절약설계기준"],
    siteChecks: ["실내외 온습도", "열화상/표면온도", "단열재 누락·틈새", "환기 사용 조건"],
  },
  {
    topic: "finish",
    label: "마감/들뜸/탈락",
    keywords: ["마감", "타일", "들뜸", "탈락", "도배", "도장", "바닥", "마루", "석재", "균열마감"],
    standardQueries: [DEFECT_STANDARD_MAIN_QUERY, "하자판정기준 마감", "하자판정기준 타일"],
    lawQueries: ["공동주택관리법", "주택법", "민법"],
    decisionQueries: ["공동주택 마감 하자", "타일 들뜸 하자", "바닥 마감 하자"],
    kcscHints: ["타일공사 KCS", "도장공사 KCS", "수장공사 KCS"],
    siteChecks: ["들뜸 범위와 타격음", "균열·탈락 면적", "자재 승인서", "시공 시 온습도·양생 기록"],
  },
  {
    topic: "equipment",
    label: "설비/배관/소음",
    keywords: ["설비", "배관", "배수", "급수", "소음", "진동", "악취", "환기", "기계실", "난방"],
    standardQueries: [DEFECT_STANDARD_MAIN_QUERY, "하자판정기준 설비", "하자판정기준 배관"],
    lawQueries: ["공동주택관리법", "주택법", "건축법", "민법"],
    decisionQueries: ["공동주택 설비 하자", "배관 누수 하자", "층간소음 하자"],
    kcscHints: ["기계설비 KCS", "급배수설비 KCS", "환기설비 기준"],
    siteChecks: ["시험성적·수압시험 기록", "소음·진동 측정값", "배관 경로와 접속부", "운전 조건"],
  },
]

const CONSTRUCTION_ANCHOR_KEYWORDS = [
  "건축", "건설", "공사", "시공", "현장", "감리", "준공", "사용승인",
  "착공", "인허가", "허가", "설계", "도면", "시방", "검측", "품질",
  "하자판정", "하자보수", "누수", "균열", "방수", "단열", "소방", "주차장",
  "공동주택", "아파트", "콘크리트", "철근", "가시설", "비계", "동바리",
]

export const CONSTRUCTION_DOMAIN_PROFILES: ConstructionDomainProfile[] = [
  {
    domain: "permit",
    label: "인허가/사용승인",
    keywords: [
      "건축허가", "허가", "신고", "착공", "사용승인", "준공", "용도변경",
      "대수선", "건폐율", "용적률", "높이", "일조", "대지", "도로", "건축선",
    ],
    lawQueries: [
      "건축법",
      "건축법 시행령",
      "건축법 시행규칙",
      "국토의 계획 및 이용에 관한 법률",
    ],
    adminRuleQueries: [
      "건축허가표준설계도서",
      "건축물의 설계도서 작성기준",
    ],
    decisionQueries: ["건축허가 사용승인", "건축허가 거부처분", "용도변경 건축법"],
    kcscHints: ["인허가 자체는 법령 중심, 상세 시공성은 관련 KCS/KDS 별도 확인"],
  },
  {
    domain: "housing",
    label: "공동주택/주택사업",
    keywords: [
      "공동주택", "아파트", "주택", "사업계획승인", "분양", "입주자", "관리주체",
      "장기수선", "입주자대표", "하자보수보증", "사용검사",
    ],
    lawQueries: [
      "주택법",
      "주택법 시행령",
      "공동주택관리법",
      "공동주택관리법 시행령",
    ],
    adminRuleQueries: [
      "주택건설공사 감리업무 세부기준",
      "공동주택 하자의 조사, 보수비용 산정 및 하자판정기준",
    ],
    decisionQueries: ["공동주택 하자", "주택법 사업계획승인", "공동주택관리법 하자보수"],
    kcscHints: ["공동주택 공종별 KCS, 주택건설공사 감리 기준 연결"],
  },
  {
    domain: "quality",
    label: "품질관리/시공기준",
    keywords: [
      "품질", "품질관리", "품질시험", "검측", "자재승인", "시공상세도", "시방서",
      "시험성적서", "콘크리트", "철근", "마감", "방수", "단열재", "타설",
    ],
    lawQueries: [
      "건설기술 진흥법",
      "건설기술 진흥법 시행령",
      "건축법",
    ],
    adminRuleQueries: [
      "건설공사 품질관리 업무지침",
      "건설공사 사업관리방식 검토기준 및 업무수행지침",
    ],
    decisionQueries: ["건설공사 품질관리", "시공상 하자 품질관리"],
    kcscHints: ["KCS 공통공사", "공종별 KCS", "KDS 설계기준"],
  },
  {
    domain: "supervision",
    label: "감리/건설사업관리",
    keywords: [
      "감리", "상주감리", "비상주감리", "건설사업관리", "CM", "감리자",
      "감리보고", "시정지시", "검측요청", "승인", "검사",
    ],
    lawQueries: [
      "건축법",
      "건설기술 진흥법",
      "주택법",
    ],
    adminRuleQueries: [
      "건축공사 감리세부기준",
      "주택건설공사 감리업무 세부기준",
      "건설공사 사업관리방식 검토기준 및 업무수행지침",
    ],
    decisionQueries: ["건축공사 감리 책임", "감리 시정지시", "건설사업관리 책임"],
    kcscHints: ["감리 지적 내용이 공종 기준이면 해당 KCS/KDS 확인"],
  },
  {
    domain: "defect",
    label: "하자/분쟁",
    keywords: [
      "하자", "하자판정", "하자보수", "보수비", "하자담보", "분쟁", "입주민",
      "CS", "누수", "균열", "결로", "곰팡이", "방수", "들뜸", "탈락", "처짐",
    ],
    lawQueries: [
      "공동주택관리법",
      "주택법",
      "건축법",
      "민법",
    ],
    adminRuleQueries: [
      "공동주택 하자의 조사, 보수비용 산정 및 하자판정기준",
    ],
    decisionQueries: ["공동주택 하자", "누수 하자", "균열 하자", "하자보수 손해배상"],
    kcscHints: ["하자 항목별 관련 KCS", "방수·콘크리트·마감 공종 KCS"],
  },
  {
    domain: "safety",
    label: "안전/중대재해",
    keywords: [
      "안전", "산업안전", "중대재해", "위험성평가", "추락", "낙하", "가시설",
      "비계", "동바리", "굴착", "흙막이", "타워크레인", "안전관리계획",
    ],
    lawQueries: [
      "산업안전보건법",
      "중대재해 처벌 등에 관한 법률",
      "건설기술 진흥법",
      "시설물의 안전 및 유지관리에 관한 특별법",
    ],
    adminRuleQueries: [
      "건설공사 안전관리 업무수행 지침",
      "산업안전보건기준에 관한 규칙",
    ],
    decisionQueries: ["건설현장 산업안전", "중대재해 건설현장", "안전관리계획 건설공사"],
    kcscHints: ["가설공사 KCS", "흙막이·비계·동바리 관련 KCS/KDS"],
  },
  {
    domain: "fire",
    label: "소방/피난방화",
    keywords: [
      "소방", "피난", "방화", "내화", "방화구획", "스프링클러", "제연", "소화전",
      "화재안전", "방염", "대피",
    ],
    lawQueries: [
      "소방시설 설치 및 관리에 관한 법률",
      "건축법",
      "화재의 예방 및 안전관리에 관한 법률",
    ],
    adminRuleQueries: [
      "건축물의 피난ㆍ방화구조 등의 기준에 관한 규칙",
      "국가화재안전기준",
    ],
    decisionQueries: ["소방시설 설치", "방화구획 건축법", "피난 방화 기준"],
    kcscHints: ["건축 피난·방화 관련 KDS/KCS, 소방 설비 기준 별도 확인"],
  },
  {
    domain: "energy",
    label: "에너지/단열/녹색건축",
    keywords: [
      "에너지", "녹색건축", "단열", "단열재", "열교", "기밀", "결로", "창호",
      "우레탄폼", "충진", "에너지절약", "제로에너지", "성능",
    ],
    lawQueries: [
      "녹색건축물 조성 지원법",
      "건축법",
      "주택법",
    ],
    adminRuleQueries: [
      "건축물의 에너지절약설계기준",
      "녹색건축 인증 기준",
    ],
    decisionQueries: ["단열 하자", "결로 하자", "에너지절약설계기준"],
    kcscHints: ["단열공사 KCS", "창호공사 KCS", "결로 방지 관련 설계기준"],
  },
  {
    domain: "accessibility",
    label: "장애인 편의/BF",
    keywords: [
      "장애인", "편의시설", "BF", "무장애", "경사로", "엘리베이터", "화장실",
      "점자블록", "출입구", "복도", "승강기",
    ],
    lawQueries: [
      "장애인ㆍ노인ㆍ임산부 등의 편의증진 보장에 관한 법률",
      "건축법",
      "승강기 안전관리법",
    ],
    adminRuleQueries: [
      "장애물 없는 생활환경 인증에 관한 규칙",
      "장애인ㆍ노인ㆍ임산부 등의 편의증진 보장에 관한 법률 시행규칙",
    ],
    decisionQueries: ["장애인 편의시설 설치의무", "BF 인증 건축물"],
    kcscHints: ["BF 상세 치수는 관련 고시·시방·도면 기준 함께 확인"],
  },
  {
    domain: "parking",
    label: "주차장/교통",
    keywords: [
      "주차", "주차장", "주차대수", "부설주차장", "기계식주차", "차로", "램프",
      "장애인주차", "전기차", "충전시설",
    ],
    lawQueries: [
      "주차장법",
      "건축법",
      "국토의 계획 및 이용에 관한 법률",
    ],
    adminRuleQueries: [
      "주차장법 시행규칙",
      "기계식주차장치의 안전기준 및 검사기준 등에 관한 규정",
    ],
    decisionQueries: ["부설주차장 설치기준", "주차장법 건축허가"],
    kcscHints: ["주차장 구조·포장·방수 공종 KCS 확인"],
  },
  {
    domain: "maintenance",
    label: "유지관리/시설물안전",
    keywords: [
      "유지관리", "정기점검", "정밀점검", "안전진단", "시설물", "건축물관리",
      "해체", "철거", "점검", "보수보강", "노후화",
    ],
    lawQueries: [
      "건축물관리법",
      "시설물의 안전 및 유지관리에 관한 특별법",
      "공동주택관리법",
    ],
    adminRuleQueries: [
      "건축물관리점검지침",
      "시설물의 안전 및 유지관리 실시 등에 관한 지침",
    ],
    decisionQueries: ["건축물관리 점검", "시설물 안전진단", "건축물 해체 허가"],
    kcscHints: ["보수보강 KCS", "안전점검 결과와 공종별 보수 기준 연결"],
  },
  {
    domain: "contract",
    label: "계약/하도급/책임",
    keywords: [
      "하도급", "협력업체", "도급", "계약", "변경계약", "설계변경", "공사비",
      "지체상금", "클레임", "책임", "손해배상", "대금", "기성",
    ],
    lawQueries: [
      "건설산업기본법",
      "하도급거래 공정화에 관한 법률",
      "민법",
      "국가를 당사자로 하는 계약에 관한 법률",
    ],
    adminRuleQueries: [
      "건설공사 하도급 심사기준",
      "공사계약 일반조건",
    ],
    decisionQueries: ["건설공사 하도급", "공사대금 설계변경", "지체상금 건설공사"],
    kcscHints: ["계약 쟁점은 도급계약·시방서·특기시방과 KCS 우선순위 확인"],
  },
  {
    domain: "local",
    label: "조례/심의/지역기준",
    keywords: [
      "조례", "서울시", "경기도", "구청", "시청", "지자체", "건축위원회",
      "심의", "경관", "도시계획", "지구단위", "인허가 조건",
    ],
    lawQueries: [
      "건축법",
      "국토의 계획 및 이용에 관한 법률",
      "경관법",
    ],
    adminRuleQueries: [
      "건축위원회 심의기준",
      "지구단위계획수립지침",
    ],
    decisionQueries: ["건축위원회 심의", "건축 조례", "지구단위계획 건축허가"],
    kcscHints: ["조례/심의는 지역별 기준 우선, 시공 상세는 KCS 별도 확인"],
  },
]

const CONSTRUCTION_LAW_CATALOG: Array<{
  query: string
  aliases: string[]
  keywords: string[]
}> = [
  {
    query: "건축법",
    aliases: ["건축법", "건축허가", "사용승인", "착공신고"],
    keywords: ["건축", "건축허가", "사용승인", "착공", "용도변경", "대수선"],
  },
  {
    query: "주택법",
    aliases: ["주택법", "사업계획승인", "사용검사"],
    keywords: ["주택", "공동주택", "사업계획승인", "분양", "사용검사"],
  },
  {
    query: "공동주택관리법",
    aliases: ["공동주택관리법", "공동주택", "하자보수"],
    keywords: ["공동주택", "관리주체", "입주자", "하자", "장기수선"],
  },
  {
    query: "건설기술 진흥법",
    aliases: ["건설기술진흥법", "건진법", "건설기술 진흥법"],
    keywords: ["품질관리", "안전관리계획", "건설사업관리", "감리", "건설기술"],
  },
  {
    query: "건설산업기본법",
    aliases: ["건설산업기본법", "건산법"],
    keywords: ["건설업", "하도급", "도급", "시공자", "건설공사"],
  },
  {
    query: "건축물관리법",
    aliases: ["건축물관리법"],
    keywords: ["유지관리", "건축물관리", "해체", "철거", "점검"],
  },
  {
    query: "시설물의 안전 및 유지관리에 관한 특별법",
    aliases: ["시설물안전법", "시설물의 안전 및 유지관리에 관한 특별법"],
    keywords: ["시설물", "안전진단", "정밀점검", "유지관리"],
  },
  {
    query: "산업안전보건법",
    aliases: ["산업안전보건법", "산안법"],
    keywords: ["산업안전", "안전보건", "추락", "위험성평가"],
  },
  {
    query: "중대재해 처벌 등에 관한 법률",
    aliases: ["중대재해처벌법", "중대재해 처벌 등에 관한 법률"],
    keywords: ["중대재해", "안전보건관리체계", "경영책임자"],
  },
  {
    query: "소방시설 설치 및 관리에 관한 법률",
    aliases: ["소방시설법", "소방시설 설치 및 관리에 관한 법률"],
    keywords: ["소방", "스프링클러", "소화전", "화재안전"],
  },
  {
    query: "화재의 예방 및 안전관리에 관한 법률",
    aliases: ["화재예방법", "화재의 예방 및 안전관리에 관한 법률"],
    keywords: ["화재", "소방안전관리", "피난", "방화"],
  },
  {
    query: "녹색건축물 조성 지원법",
    aliases: ["녹색건축법", "녹색건축물 조성 지원법"],
    keywords: ["녹색건축", "에너지", "단열", "제로에너지"],
  },
  {
    query: "장애인ㆍ노인ㆍ임산부 등의 편의증진 보장에 관한 법률",
    aliases: ["장애인등편의법", "편의증진법"],
    keywords: ["장애인", "편의시설", "BF", "무장애"],
  },
  {
    query: "주차장법",
    aliases: ["주차장법"],
    keywords: ["주차", "부설주차장", "기계식주차", "주차대수"],
  },
  {
    query: "승강기 안전관리법",
    aliases: ["승강기안전관리법", "승강기 안전관리법"],
    keywords: ["승강기", "엘리베이터", "검사", "안전관리"],
  },
  {
    query: "하도급거래 공정화에 관한 법률",
    aliases: ["하도급법", "하도급거래 공정화에 관한 법률"],
    keywords: ["하도급", "협력업체", "대금", "부당특약"],
  },
  {
    query: "집합건물의 소유 및 관리에 관한 법률",
    aliases: ["집합건물법", "집합건물의 소유 및 관리에 관한 법률"],
    keywords: ["집합건물", "구분소유", "공용부분", "하자담보", "관리단"],
  },
  {
    query: "도시 및 주거환경정비법",
    aliases: ["도시정비법", "도시 및 주거환경정비법"],
    keywords: ["정비사업", "재개발", "재건축", "조합"],
  },
  {
    query: "국토의 계획 및 이용에 관한 법률",
    aliases: ["국토계획법", "국토의 계획 및 이용에 관한 법률"],
    keywords: ["도시계획", "용도지역", "지구단위", "건폐율", "용적률"],
  },
]

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[「」『』"']/g, " ")
    .replace(/[(){}\[\],.;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function detectDefectStandardTopics(query: string): DefectStandardRoutePlan["topics"] {
  const normalized = normalizeText(query)
  const compactQuery = compact(query)
  return DEFECT_STANDARD_TOPICS
    .map(topic => {
      const matchedKeywords = topic.keywords.filter(keyword => includesTerm(normalized, compactQuery, keyword))
      const score = matchedKeywords.reduce((sum, keyword) => sum + keywordWeight(keyword), 0)
      return { ...topic, score, matchedKeywords }
    })
    .filter(topic => topic.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "ko"))
}

export function isLikelyConstructionDefectQuery(query: string): boolean {
  const normalized = normalizeText(query)
  const compactQuery = compact(query)
  if (includesTerm(normalized, compactQuery, DEFECT_STANDARD_MAIN_QUERY)) return true
  if (/하자\s*판정|하자\s*기준|하자\s*보수|하자로\s*볼|하자인지|하자담보/.test(query) && isLikelyConstructionQuery(query)) {
    return true
  }
  return detectDefectStandardTopics(query).length > 0 && includesTerm(normalized, compactQuery, "하자")
}

export function buildDefectStandardRoutePlan(query: string, limit = 6): DefectStandardRoutePlan {
  const topics = detectDefectStandardTopics(query).slice(0, limit)
  const standardCandidates = new Map<string, ConstructionCandidate>()
  const lawCandidates = new Map<string, ConstructionCandidate>()
  const decisionCandidates = new Map<string, ConstructionCandidate>()

  pushCandidate(standardCandidates, DEFECT_STANDARD_MAIN_QUERY, 100, "하자판정기준 기본 검색")

  for (const topic of topics) {
    topic.standardQueries.forEach((standardQuery, index) => {
      pushCandidate(standardCandidates, standardQuery, Math.max(8, topic.score - index * 4), `${topic.label}: ${topic.matchedKeywords.join(", ")}`)
    })
    topic.lawQueries.forEach((lawQuery, index) => {
      pushCandidate(lawCandidates, lawQuery, Math.max(6, topic.score - index * 3), `${topic.label} 관련 법령`)
    })
    topic.decisionQueries.forEach((decisionQuery, index) => {
      pushCandidate(decisionCandidates, decisionQuery, Math.max(6, topic.score - index * 2), `${topic.label} 판례/해석례 검색`)
    })
  }

  if (lawCandidates.size === 0) {
    pushCandidate(lawCandidates, "공동주택관리법", 20, "하자 일반 기본 법령")
    pushCandidate(lawCandidates, "주택법", 16, "주택 하자 보조 법령")
    pushCandidate(lawCandidates, "민법", 12, "하자담보·손해배상 일반 법령")
  }

  const kcscHints = Array.from(new Set(topics.flatMap(topic => topic.kcscHints))).slice(0, limit)
  const siteChecks = Array.from(new Set(topics.flatMap(topic => topic.siteChecks))).slice(0, limit)

  return {
    query,
    isConstructionDefectQuery: isLikelyConstructionDefectQuery(query),
    topics,
    standardCandidates: sortedCandidates(standardCandidates, limit),
    lawCandidates: sortedCandidates(lawCandidates, limit),
    decisionQueries: sortedCandidates(decisionCandidates, limit),
    kcscHints,
    siteChecks,
  }
}

function compact(value: string): string {
  return normalizeText(value).replace(/\s+/g, "")
}

function includesTerm(query: string, compactQuery: string, term: string): boolean {
  const normalizedTerm = normalizeText(term)
  if (!normalizedTerm) return false
  return query.includes(normalizedTerm) || compactQuery.includes(compact(normalizedTerm))
}

function keywordWeight(keyword: string): number {
  const length = compact(keyword).length
  if (length >= 6) return 16
  if (length >= 4) return 12
  return 8
}

function pushCandidate(
  map: Map<string, ConstructionCandidate>,
  query: string,
  score: number,
  reason: string
) {
  const existing = map.get(query)
  if (existing) {
    existing.score += score
    if (!existing.reasons.includes(reason)) existing.reasons.push(reason)
    return
  }
  map.set(query, { query, score, reasons: [reason] })
}

function sortedCandidates(map: Map<string, ConstructionCandidate>, limit: number): ConstructionCandidate[] {
  return Array.from(map.values())
    .sort((a, b) => b.score - a.score || a.query.localeCompare(b.query, "ko"))
    .slice(0, limit)
}

export function normalizeConstructionQuery(query: string): string {
  return normalizeText(query)
}

export function detectConstructionDomains(query: string): ConstructionRouteSignal[] {
  const normalized = normalizeText(query)
  const compactQuery = compact(query)
  const signals: ConstructionRouteSignal[] = []

  for (const profile of CONSTRUCTION_DOMAIN_PROFILES) {
    const matchedKeywords = profile.keywords.filter(keyword => includesTerm(normalized, compactQuery, keyword))
    if (matchedKeywords.length === 0) continue

    const score = matchedKeywords.reduce((sum, keyword) => sum + keywordWeight(keyword), 0)
    signals.push({
      domain: profile.domain,
      label: profile.label,
      score,
      matchedKeywords,
      reason: `${profile.label}: ${matchedKeywords.slice(0, 5).join(", ")}`,
      lawQueries: profile.lawQueries,
      adminRuleQueries: profile.adminRuleQueries,
      decisionQueries: profile.decisionQueries,
      kcscHints: profile.kcscHints,
    })
  }

  return signals.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "ko"))
}

export function isLikelyConstructionQuery(query: string): boolean {
  const normalized = normalizeText(query)
  const compactQuery = compact(query)
  if (CONSTRUCTION_ANCHOR_KEYWORDS.some(keyword => includesTerm(normalized, compactQuery, keyword))) {
    return true
  }
  if (
    includesTerm(normalized, compactQuery, "하자") &&
    ["공동주택", "아파트", "누수", "균열", "결로", "방수", "마감", "천장", "주차장"].some(keyword => (
      includesTerm(normalized, compactQuery, keyword)
    ))
  ) {
    return true
  }
  return CONSTRUCTION_LAW_CATALOG.some(law => (
    includesTerm(normalized, compactQuery, law.query) ||
    law.aliases.some(alias => includesTerm(normalized, compactQuery, alias))
  ))
}

export function getConstructionLawCandidates(query: string, limit = 6): ConstructionCandidate[] {
  const normalized = normalizeText(query)
  const compactQuery = compact(query)
  const domains = detectConstructionDomains(query)
  const candidates = new Map<string, ConstructionCandidate>()

  for (const domain of domains) {
    domain.lawQueries.forEach((lawQuery, index) => {
      pushCandidate(candidates, lawQuery, Math.max(4, domain.score - index * 3), domain.reason)
    })
  }

  for (const law of CONSTRUCTION_LAW_CATALOG) {
    if (includesTerm(normalized, compactQuery, law.query)) {
      pushCandidate(candidates, law.query, 80, "법령명 직접 매칭")
    }
    for (const alias of law.aliases) {
      if (includesTerm(normalized, compactQuery, alias)) {
        pushCandidate(candidates, law.query, 60, `약칭/현장용어 매칭: ${alias}`)
      }
    }
    const matchedKeywords = law.keywords.filter(keyword => includesTerm(normalized, compactQuery, keyword))
    if (matchedKeywords.length > 0) {
      pushCandidate(
        candidates,
        law.query,
        matchedKeywords.reduce((sum, keyword) => sum + keywordWeight(keyword), 0),
        `법령 키워드 매칭: ${matchedKeywords.slice(0, 4).join(", ")}`
      )
    }
  }

  if (candidates.size === 0 && isLikelyConstructionQuery(query)) {
    pushCandidate(candidates, "건축법", 20, "건축 일반 질문 기본 법령")
    pushCandidate(candidates, "건설기술 진흥법", 16, "건설 품질·안전 일반 보조 법령")
  }

  return sortedCandidates(candidates, limit)
}

export function getConstructionAdminRuleCandidates(query: string, limit = 6): ConstructionCandidate[] {
  const domains = detectConstructionDomains(query)
  const candidates = new Map<string, ConstructionCandidate>()

  for (const domain of domains) {
    domain.adminRuleQueries.forEach((ruleQuery, index) => {
      pushCandidate(candidates, ruleQuery, Math.max(4, domain.score - index * 3), domain.reason)
    })
  }

  if (candidates.size === 0 && isLikelyConstructionQuery(query)) {
    pushCandidate(candidates, query, 10, "건축 실무 질문 원문 검색")
  }

  return sortedCandidates(candidates, limit)
}

export function getConstructionDecisionQueries(query: string, limit = 6): ConstructionCandidate[] {
  const domains = detectConstructionDomains(query)
  const candidates = new Map<string, ConstructionCandidate>()

  for (const domain of domains) {
    domain.decisionQueries.forEach((decisionQuery, index) => {
      pushCandidate(candidates, decisionQuery, Math.max(4, domain.score - index * 2), domain.reason)
    })
  }

  if (candidates.size === 0 && isLikelyConstructionQuery(query)) {
    pushCandidate(candidates, query, 10, "건축 실무 질문 원문 검색")
  }

  return sortedCandidates(candidates, limit)
}

export function buildConstructionRoutePlan(query: string, limit = 6): ConstructionRoutePlan {
  const domains = detectConstructionDomains(query)
  const kcscHints = Array.from(new Set(domains.flatMap(domain => domain.kcscHints))).slice(0, limit)

  return {
    query,
    isConstructionQuery: isLikelyConstructionQuery(query),
    domains: domains.slice(0, limit),
    lawCandidates: getConstructionLawCandidates(query, limit),
    adminRuleCandidates: getConstructionAdminRuleCandidates(query, limit),
    decisionQueries: getConstructionDecisionQueries(query, limit),
    kcscHints,
    answerFrame: CONSTRUCTION_ANSWER_FRAME,
  }
}

export function buildConstructionDelegationRoutePlan(query: string, limit = 5): ConstructionDelegationRoutePlan {
  const constructionPlan = buildConstructionRoutePlan(query, limit)
  const lawCandidates = new Map<string, ConstructionCandidate>()
  const adminRuleCandidates = new Map<string, ConstructionCandidate>()
  const normalized = normalizeText(query)
  const compactQuery = compact(query)

  for (const candidate of constructionPlan.lawCandidates) {
    pushCandidate(lawCandidates, candidate.query, candidate.score, candidate.reasons.join(" / "))
  }
  for (const candidate of constructionPlan.adminRuleCandidates) {
    pushCandidate(adminRuleCandidates, candidate.query, candidate.score, candidate.reasons.join(" / "))
  }

  if (lawCandidates.size === 0 && constructionPlan.isConstructionQuery) {
    pushCandidate(lawCandidates, "건축법", 20, "건축 위임관계 기본 법령")
    pushCandidate(lawCandidates, "건설기술 진흥법", 16, "건설 기술·품질 위임관계 기본 법령")
  }

  const traceFocus: string[] = []
  if (includesTerm(normalized, compactQuery, "시행령")) traceFocus.push("법률 → 시행령")
  if (includesTerm(normalized, compactQuery, "시행규칙")) traceFocus.push("시행령/법률 → 시행규칙")
  if (/(고시|훈령|예규|지침|기준)/.test(query)) traceFocus.push("법률/시행령/시행규칙 → 고시·훈령·예규·지침")
  if (/(별표|별지|서식)/.test(query)) traceFocus.push("하위법령 별표·별지서식")
  if (/(위임|근거|법적\s*근거|상위법|하위법|체계|3단)/.test(query)) traceFocus.push("위임조문·인용조문 확인")
  if (traceFocus.length === 0) {
    traceFocus.push("법률 → 시행령 → 시행규칙 → 행정규칙 체계 확인")
  }

  const suggestedSteps = [
    "법령 후보를 search_law/findLaws로 식별해 MST/lawId 확보",
    "get_law_system_tree로 상하위법·행정규칙 체계 확인",
    "get_three_tier(knd=2)로 위임조문 확인",
    "필요 시 관련 고시·지침을 search_admin_rule/get_admin_rule로 본문 확인",
  ]

  return {
    query,
    isConstructionQuery: constructionPlan.isConstructionQuery,
    lawCandidates: sortedCandidates(lawCandidates, limit),
    adminRuleCandidates: sortedCandidates(adminRuleCandidates, limit),
    traceFocus: Array.from(new Set(traceFocus)),
    suggestedSteps,
  }
}
