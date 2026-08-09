/**
 * Gemini 2.5 Flash로 자료 자동 분류·요약·태그 생성.
 * GEMINI_API_KEY 환경변수 없으면 휴리스틱 fallback.
 */

const MODEL = 'gemini-2.5-flash';

const CATEGORIES = {
  '면접/채용/이직': ['경력직 채용', '면접 준비', 'AI 면접', '디자인 에이전시', '자기소개서'],
  '기획/PM': ['포트폴리오', '문서 작성', '프로세스'],
  'UX/디자인': ['UI 패턴', '리서치', 'UX 라이팅', '디자인 툴', '브랜딩'],
  '개발/기술': ['협업 도구', '정책·법규', '트렌드'],
  '커리어': ['이직', '성장'],
  '비즈니스/마케팅': ['마케팅 전략', '예산/계획', '데이터 분석'],
} as const;

const FORMATS = ['아티클', '영상', '기획서', '가이드', '템플릿', '세미나'];

export type ClassifyResult = {
  title: string;
  summary: string;
  mainCategory: string;
  subCategory: string;
  tags: string[];
  format: string;
  aiUsed: boolean;
  error?: string;
};

/**
 * 멀티모달 inline data — 이미지/PDF 바이트를 직접 Gemini에 전송해 시각 분석.
 * mime: image/png · image/jpeg · application/pdf 등 / data: base64 string
 * Gemini 2.5 Flash inline 한도: 20MB. 그 이상은 호출 측에서 null 처리.
 */
export type InlineData = { mime: string; base64: string };

export async function classify(
  url: string,
  meta: { title: string; description: string; body?: string },
  inline?: InlineData | null,
  videoUrl?: string | null
): Promise<ClassifyResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ...heuristic(url, meta), aiUsed: false };

  const prompt = videoUrl ? buildVideoPrompt(url, meta)
    : inline ? buildVisionPrompt(url, meta)
    : buildPrompt(url, meta);
  const parts: Array<
    { text: string }
    | { inline_data: { mime_type: string; data: string } }
    | { file_data: { file_uri: string } }
  > = [{ text: prompt }];
  if (inline) parts.push({ inline_data: { mime_type: inline.mime, data: inline.base64 } });
  if (videoUrl) parts.push({ file_data: { file_uri: videoUrl } });

  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          title_ko: { type: 'string' },
          summary_ko: { type: 'string' },
          main_category: { type: 'string', enum: Object.keys(CATEGORIES) },
          sub_category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          format: { type: 'string', enum: FORMATS },
        },
        required: ['title_ko', 'summary_ko', 'main_category', 'format', 'tags'],
      },
      temperature: 0.2,
    },
  });
  const timeout = inline || videoUrl ? 30000 : 15000;

  try {
    let resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(timeout) }
    );
    // 429(쿼터/레이트리밋)는 잠깐 쉬고 1회 재시도
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 2500));
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(timeout) }
      );
    }
    if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini: empty response');
    const out = JSON.parse(text);
    return {
      title: String(out.title_ko || meta.title).slice(0, 200),
      summary: String(out.summary_ko || meta.description).slice(0, 500),
      mainCategory: out.main_category || '미분류',
      subCategory: out.sub_category || '',
      tags: Array.isArray(out.tags) ? out.tags.slice(0, 6) : [],
      format: out.format || guessFormat(url),
      aiUsed: true,
    };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    console.error('Gemini classify error:', err);
    return { ...heuristic(url, meta), aiUsed: false, error: err };
  }
}

function buildVisionPrompt(url: string, meta: { title: string; description: string }) {
  return `당신은 맥비기획 자료실 큐레이션 어시스턴트.
첨부된 파일(이미지 또는 PDF)을 직접 보고 자료실 등록용 정보를 JSON으로 반환.

힌트:
- 파일 URL: ${url}
- 파일명 추정 제목: ${meta.title}

규칙:
- title_ko, summary_ko는 한글. 파일에 영문이 보이면 번역해서 한글 제목/요약 작성.
- summary_ko는 1문장. 파일에 보이는 실제 내용("어떤 자료이고 무슨 주제를 다루는지")을 구체적으로.
  파일명만 가지고 추측하지 말 것 — 본문/이미지에서 본 것만 기술.
  **명사구로 마무리** — "~을 정리한 자료", "~용 템플릿", "~을 담은 가이드" 형태. "~합니다/~입니다" 종결어미 금지.
  내용이 흐릿하거나 알 수 없으면 "확인 불가" 명시.
- main_category: ${Object.keys(CATEGORIES).join(' | ')} 중 1개
- sub_category: main에 맞는 것 (${Object.entries(CATEGORIES).map(([m, subs]) => `${m}=[${subs.join(',')}]`).join('; ')})
- tags: 3~6개. 파일에서 본 핵심 키워드. 한글 우선. 너무 일반적인 단어(UI, 디자인) 단독 금지
- format: ${FORMATS.join(' | ')} 중 1개. 이미지면 보통 '템플릿' 또는 '가이드'`;
}

function buildPrompt(url: string, meta: { title: string; description: string; body?: string }) {
  return `당신은 맥비기획 자료실 큐레이션 어시스턴트.
다음 글을 보고 자료실 등록용 정보를 JSON으로 반환.

URL: ${url}
페이지 제목: ${meta.title}
페이지 설명(og): ${meta.description}${meta.body ? `\n\n본문 발췌:\n${meta.body}` : ''}

규칙:
- title_ko, summary_ko는 한글. 영문 원본이면 번역.
- summary_ko는 1문장. "이 글이 무엇에 대한 무슨 내용인지" 명확히.
  **명사구로 마무리** — "~하는 글", "~을 다루는 아티클", "~을 정리한 글" 형태.
  "~합니다/~입니다/~한다" 같은 종결어미로 끝내지 말 것.
  ${meta.body ? '**본문 발췌를 기준으로 작성**. og 설명이 사이트 소개/광고문구면 무시하고 본문 내용 우선.' : '알 수 없으면 "확인 불가".'}
- title_ko도 본문과 og 제목이 다르면 실제 글 내용에 맞는 쪽으로.
- main_category: ${Object.keys(CATEGORIES).join(' | ')} 중 1개
- sub_category: main에 맞는 것 (${Object.entries(CATEGORIES).map(([m, subs]) => `${m}=[${subs.join(',')}]`).join('; ')})
- tags: 3~6개. 한글 우선. 고유명사는 한글+영문 병기 가능. 너무 일반적인 단어(UI, 디자인) 단독 금지
- format: ${FORMATS.join(' | ')} 중 1개`;
}

function buildVideoPrompt(url: string, meta: { title: string; description: string }) {
  return `당신은 맥비기획 자료실 큐레이션 어시스턴트.
첨부된 YouTube 영상을 직접 시청(화면 + 음성/자막)하고 자료실 등록용 정보를 JSON으로 반환.

참고 힌트:
- 영상 URL: ${url}
- 영상 원제목: ${meta.title || '(불명)'}
- 영상 설명: ${meta.description || '(불명)'}

규칙:
- title_ko: 영상 실제 내용을 반영한 한글 제목. 원제목이 적절하면 그대로/번역, 낚시성이면 내용 기반으로 재작성.
- summary_ko: 1문장. 영상이 실제로 다루는 핵심(무슨 주제를 어떻게 설명·시연하는지)을 구체적으로. 제목 반복 금지. 힌트만 베끼지 말고 영상에서 본 내용 기술.
  **명사구로 마무리** — "~을 설명하는 영상", "~을 시연하는 강의" 형태. "~합니다/~입니다" 종결어미 금지.
- main_category: ${Object.keys(CATEGORIES).join(' | ')} 중 1개
- sub_category: main에 맞는 것 (${Object.entries(CATEGORIES).map(([m, subs]) => `${m}=[${subs.join(',')}]`).join('; ')})
- tags: 3~6개. 영상 핵심 키워드. 한글 우선. 너무 일반적인 단어 단독 금지
- format: '영상' 고정`;
}

/** 키워드 사전 기반 태그 추출 — heuristic용. 본 사전은 자료실 실제 태그 빈도 기준 */
const TAG_DICT: Array<{ pat: RegExp; tag: string }> = [
  { pat: /피그마|figma/i, tag: '피그마' },
  { pat: /스케치|sketch/i, tag: '스케치' },
  { pat: /adobe xd|어도비 xd|adobexd|\bxd\b/i, tag: 'Adobe XD' },
  { pat: /노션|notion/i, tag: '노션' },
  { pat: /프로토타입|prototyp/i, tag: '프로토타이핑' },
  { pat: /디자인 시스템|design system/i, tag: '디자인시스템' },
  { pat: /와이어프레임|wireframe/i, tag: '와이어프레임' },
  { pat: /기획서|화면설계|스토리보드/i, tag: '기획서' },
  { pat: /UX 라이팅|ux writing|마이크로카피/i, tag: 'UX 라이팅' },
  { pat: /UX 리서치|user research|사용자 인터뷰|사용성/i, tag: '리서치' },
  { pat: /UI 패턴|ui pattern/i, tag: 'UI 패턴' },
  { pat: /브랜딩|브랜드|branding|\bbx\b/i, tag: '브랜딩' },
  { pat: /면접|interview|면접관/i, tag: '면접' },
  { pat: /채용|이직|hiring|recruit/i, tag: '채용' },
  { pat: /자기소개서|이력서|포트폴리오|커리어/i, tag: '커리어' },
  { pat: /PM 면접|프로덕트 매니저 면접/i, tag: 'PM면접' },
  { pat: /\bpm\b|프로덕트 매니저|제품 기획자/i, tag: 'PM' },
  { pat: /서비스 기획|service planning/i, tag: '서비스 기획' },
  { pat: /RFP|제안서|제안요청서/i, tag: 'RFP' },
  { pat: /마케팅|marketing/i, tag: '마케팅' },
  { pat: /콘텐츠 마케팅|content marketing/i, tag: '콘텐츠마케팅' },
  { pat: /광고|advertis/i, tag: '광고' },
  { pat: /\bAI\b|인공지능|머신러닝|GPT|LLM|챗GPT/i, tag: 'AI' },
  { pat: /데이터 분석|data analy|시각화|BI|대시보드/i, tag: '데이터 분석' },
  { pat: /개인정보|약관|법규|컴플라이언스/i, tag: '정책법규' },
  { pat: /트렌드|trend/i, tag: '트렌드' },
  { pat: /튜토리얼|tutorial|how to|how-to/i, tag: '튜토리얼' },
  { pat: /가이드|guide|매뉴얼/i, tag: '가이드' },
  { pat: /템플릿|template|샘플|양식/i, tag: '템플릿' },
  { pat: /플러그인|plugin/i, tag: '플러그인' },
  { pat: /협업|collaborat/i, tag: '협업' },
  { pat: /성장|성장 단계|growth/i, tag: '성장' },
];

function extractTags(blob: string, max = 6): string[] {
  const found: string[] = [];
  for (const { pat, tag } of TAG_DICT) {
    if (pat.test(blob) && !found.includes(tag)) {
      found.push(tag);
      if (found.length >= max) break;
    }
  }
  return found;
}

function heuristic(url: string, meta: { title: string; description: string }): Omit<ClassifyResult, 'aiUsed'> {
  const t = meta.title.toLowerCase();
  const d = meta.description.toLowerCase();
  const blob = `${url} ${t} ${d}`;
  let main = '기획/PM';
  let sub = '프로세스';

  if (/figma|피그마|sketch|스케치|ui|ux|디자인|design/.test(blob)) {
    main = 'UX/디자인';
    if (/figma|피그마|sketch|스케치|xd|axure/.test(blob)) sub = '디자인 툴';
    else if (/리서치|research/.test(blob)) sub = '리서치';
    else if (/브랜드|brand/.test(blob)) sub = '브랜딩';
    else if (/라이팅|writing|카피/.test(blob)) sub = 'UX 라이팅';
    else sub = 'UI 패턴';
  } else if (/면접|채용|이직|interview|hiring/.test(blob)) {
    main = '면접/채용/이직';
    sub = '면접 준비';
  } else if (/마케팅|marketing|광고/.test(blob)) {
    main = '비즈니스/마케팅';
    sub = '마케팅 전략';
  } else if (/개발|코딩|api|github|개발자/.test(blob)) {
    main = '개발/기술';
    sub = '협업 도구';
  } else if (/커리어|성장|growth|career/.test(blob)) {
    main = '커리어';
    sub = '성장';
  }

  return {
    title: meta.title,
    summary: meta.description,
    mainCategory: main,
    subCategory: sub,
    tags: extractTags(blob),
    format: guessFormat(url),
  };
}

function guessFormat(url: string): string {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(u)) return '영상';
  if (/figma\.com\/community|figma\.com\/file/.test(u)) return '템플릿';
  if (/\.pdf($|\?)/.test(u)) return '가이드';
  return '아티클';
}
