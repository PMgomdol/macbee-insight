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

export async function classify(
  url: string,
  meta: { title: string; description: string }
): Promise<ClassifyResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ...heuristic(url, meta), aiUsed: false };

  const prompt = buildPrompt(url, meta);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
              required: ['title_ko', 'summary_ko', 'main_category', 'format'],
            },
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
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

function buildPrompt(url: string, meta: { title: string; description: string }) {
  return `당신은 맥비기획 자료실 큐레이션 어시스턴트.
다음 URL의 메타데이터를 보고 자료실 등록용 정보를 JSON으로 반환.

URL: ${url}
페이지 제목: ${meta.title}
페이지 설명: ${meta.description}

규칙:
- title_ko, summary_ko는 한글. 영문 원본이면 번역.
- summary_ko는 1문장. "이 자료가 무엇에 대한 무슨 내용인지" 명확히. 알 수 없으면 "확인 불가".
- main_category: ${Object.keys(CATEGORIES).join(' | ')} 중 1개
- sub_category: main에 맞는 것 (${Object.entries(CATEGORIES).map(([m, subs]) => `${m}=[${subs.join(',')}]`).join('; ')})
- tags: 3~6개. 한글 우선. 고유명사는 한글+영문 병기 가능. 너무 일반적인 단어(UI, 디자인) 단독 금지
- format: ${FORMATS.join(' | ')} 중 1개`;
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
    tags: [],
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
