/**
 * 검색 보강용 AI 답변 — 내부 자료 + 웹(Gemini Google Search 그라운딩) RAG.
 * 내부 결과가 부실할 때만 호출하는 용도 (테스트 단계: /search-test 에서 직접 사용).
 * 캐시·DB 저장 없음 — 배포 시 ai_answer 테이블 + 트리거 조건 추가 예정.
 */
import type { ArchiveItem } from '@/types/db';

const MODEL = 'gemini-2.5-flash';

export type WebSource = { title: string; uri: string };
export type AiAnswer = {
  answer: string;
  webSources: WebSource[];
  internalUsed: { id: number; title: string }[];
  error?: string;
};

function buildPrompt(q: string, internal: ArchiveItem[]): string {
  const docs = internal.length
    ? internal
        .slice(0, 5)
        .map((d) => `- ${d.title}: ${d.summary ?? ''}`)
        .join('\n')
    : '(관련 내부 자료 없음)';
  return `당신은 맥비기획 자료실 검색 어시스턴트. 사용자 질문에 실무자 입장에서 도움되게 답하라.

규칙:
- 아래 [내부 자료]가 질문과 관련 있으면 그것을 우선 근거로 반영하라.
- 내부 자료로 부족하면 웹 검색으로 보충하라.
- 한국어. 3~5문장. 구체적으로. 확실하지 않으면 단정하지 말 것.
- 마케팅·홍보 문구 배제, 사실 위주.

질문: ${q}

[내부 자료]
${docs}`;
}

/** 내부 자료 목록을 근거로 Gemini 그라운딩 답변 생성 */
export async function aiAnswer(q: string, internal: ArchiveItem[]): Promise<AiAnswer> {
  const key = process.env.GEMINI_API_KEY;
  const empty = { answer: '', webSources: [], internalUsed: [] };
  if (!key) return { ...empty, error: 'GEMINI_API_KEY 없음' };

  const body = JSON.stringify({
    contents: [{ parts: [{ text: buildPrompt(q, internal) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.3 },
  });

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(30000) }
    );
    if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const data = await resp.json();
    const cand = data?.candidates?.[0] ?? {};
    const answer = (cand.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
    if (!answer) throw new Error('Gemini: empty answer');
    const chunks = cand.groundingMetadata?.groundingChunks ?? [];
    const webSources: WebSource[] = chunks
      .map((c: { web?: { uri?: string; title?: string } }) => c.web)
      .filter((w: unknown): w is { uri: string; title: string } => !!(w as { uri?: string })?.uri)
      .map((w: { uri: string; title?: string }) => ({ uri: w.uri, title: w.title ?? w.uri }))
      .slice(0, 6);
    return {
      answer,
      webSources,
      internalUsed: internal.slice(0, 5).map((d) => ({ id: d.id, title: d.title })),
    };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) };
  }
}
