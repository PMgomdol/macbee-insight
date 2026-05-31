/**
 * Gemini API 기반 자동 분류
 * 모델: gemini-2.0-flash (무료 tier 충분)
 * 키 없거나 에러 시 휴리스틱 fallback.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';

const CATEGORY_HINT = {
  '면접/채용/이직': ['경력직 채용', '면접 준비', 'AI 면접', '디자인 에이전시', '자기소개서'],
  '기획/PM': ['포트폴리오', '문서 작성', '프로세스'],
  'UX/디자인': ['UI 패턴', '리서치', 'UX 라이팅', '디자인 툴', '브랜딩'],
  '개발/기술': ['협업 도구', '정책·법규', '트렌드'],
  '커리어': ['이직', '성장'],
  '비즈니스/마케팅': ['마케팅 전략', '예산/계획', '데이터 분석'],
};

const FORMATS = ['아티클', '영상', '기획서', '가이드', '템플릿', '세미나'];

function classifyWithAI(url, meta) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  if (!apiKey) {
    return Object.assign({ _aiUsed: false }, heuristicClassify_(url, meta));
  }
  try {
    const result = callGemini_(apiKey, url, meta);
    return Object.assign({ _aiUsed: true }, result);
  } catch (e) {
    console.warn('Gemini 호출 실패, 휴리스틱 fallback:', e);
    return Object.assign({ _aiUsed: false, _aiError: String(e) }, heuristicClassify_(url, meta));
  }
}

function callGemini_(apiKey, url, meta) {
  const prompt = buildPrompt_(url, meta);
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + GEMINI_MODEL + ':generateContent?key=' + apiKey;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const resp = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Gemini ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 200));
  }
  const j = JSON.parse(resp.getContentText());
  const text = j.candidates && j.candidates[0] && j.candidates[0].content
    && j.candidates[0].content.parts[0].text;
  if (!text) throw new Error('Gemini 응답 형식 오류');
  const parsed = JSON.parse(text);
  return normalizeAiResult_(parsed, meta);
}

function buildPrompt_(url, meta) {
  const catLines = Object.keys(CATEGORY_HINT).map(k => '  - ' + k + ': ' + CATEGORY_HINT[k].join(', '));
  return [
    '당신은 IT 기획·PM·UX 자료실의 큐레이터입니다.',
    '주어진 자료를 분석해 아래 JSON 스키마로만 응답하세요. 설명 금지.',
    '',
    '스키마:',
    '{',
    '  "title": "원문 제목 (없으면 핵심을 한 줄로 요약)",',
    '  "summary": "한 줄 설명 (40자 이내, 명사형으로 끝맺음)",',
    '  "mainCategory": "대분류 1개",',
    '  "subCategory": "소분류 1개",',
    '  "tags": ["태그1", "태그2", "태그3"],',
    '  "format": "아티클|영상|기획서|가이드|템플릿|세미나"',
    '}',
    '',
    '대분류·소분류 후보 (가장 가까운 것 매칭, 매우 애매하면 mainCategory="미분류"):',
    catLines.join('\n'),
    '',
    '태그 규칙: 3~5개. 직무/주제/대상을 섞어 검색에 도움되도록.',
    'format 규칙: 영상 플랫폼(youtube 등)이면 "영상", PDF/PPT 다운로드형이면 "기획서" 또는 "가이드", 일반 블로그/뉴스면 "아티클".',
    '',
    '[입력]',
    'URL: ' + url,
    '제목: ' + (meta.title || '(없음)'),
    '설명: ' + (meta.description || '(없음)'),
    '본문 발췌: ' + (meta.bodyText || '').substring(0, 1500),
  ].join('\n');
}

function normalizeAiResult_(p, meta) {
  let main = p.mainCategory || '';
  let sub = p.subCategory || '';
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_HINT, main)) {
    main = '미분류';
    sub = '';
  } else if (CATEGORY_HINT[main].indexOf(sub) < 0 && sub) {
    sub = '';
  }
  let format = (p.format || '').trim();
  if (FORMATS.indexOf(format) < 0) format = '아티클';

  return {
    title: (p.title || meta.title || '').substring(0, 200),
    summary: (p.summary || '').substring(0, 60),
    mainCategory: main,
    subCategory: sub,
    tags: Array.isArray(p.tags) ? p.tags.slice(0, 5).map(String) : [],
    format: format,
  };
}

function heuristicClassify_(url, meta) {
  const text = ((meta.title || '') + ' ' + (meta.description || '') + ' ' + (meta.bodyText || '')).toLowerCase();
  const u = (url || '').toLowerCase();

  let format = '아티클';
  if (/youtube|youtu\.be|vimeo/.test(u)) format = '영상';
  else if (/\.pdf$/.test(u)) format = '가이드';
  else if (/\.(ppt|pptx|key)$/.test(u)) format = '기획서';

  const rules = [
    { kw: ['면접', 'interview', '경력직'], main: '면접/채용/이직', sub: '면접 준비' },
    { kw: ['ai 면접', 'ai interview'], main: '면접/채용/이직', sub: 'AI 면접' },
    { kw: ['이력서', 'resume'], main: '면접/채용/이직', sub: '자기소개서' },
    { kw: ['포트폴리오', 'portfolio'], main: '기획/PM', sub: '포트폴리오' },
    { kw: ['기획서', '스펙', 'prd', '요구사항'], main: '기획/PM', sub: '문서 작성' },
    { kw: ['프로세스', '방법론', 'methodology'], main: '기획/PM', sub: '프로세스' },
    { kw: ['ui ', 'ui/', 'ui 패턴', 'design system'], main: 'UX/디자인', sub: 'UI 패턴' },
    { kw: ['리서치', 'research', '사용자 조사'], main: 'UX/디자인', sub: '리서치' },
    { kw: ['협업', 'collaboration', 'jira', 'figma'], main: '개발/기술', sub: '협업 도구' },
    { kw: ['이직', '커리어', 'career'], main: '커리어', sub: '이직' },
  ];

  let pick = { main: '미분류', sub: '' };
  for (const r of rules) {
    if (r.kw.some(k => text.indexOf(k) >= 0)) { pick = { main: r.main, sub: r.sub }; break; }
  }

  return {
    title: (meta.title || '').substring(0, 200),
    summary: (meta.description || '').substring(0, 60),
    mainCategory: pick.main,
    subCategory: pick.sub,
    tags: extractKeywords_(text).slice(0, 4),
    format: format,
  };
}

function extractKeywords_(text) {
  const stop = new Set(['the', 'and', 'for', 'with', 'this', 'that', '있는', '하는', '대한', '되는', '위한']);
  const counts = {};
  (text.match(/[가-힣A-Za-z][가-힣A-Za-z0-9]{1,15}/g) || []).forEach(w => {
    if (w.length < 2) return;
    if (stop.has(w.toLowerCase())) return;
    counts[w] = (counts[w] || 0) + 1;
  });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
}
