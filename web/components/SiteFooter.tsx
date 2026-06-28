import { Suspense } from 'react';
import { MessageCircle, Video, FolderOpen, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import { FooterAdminLink } from './FooterAdminLink';

const ROOMS = [
  { label: '1번방', url: 'https://bit.ly/맥비' },
  { label: '2번방', url: 'https://bit.ly/맥비2' },
  { label: '3번방', url: 'https://bit.ly/맥비3' },
  { label: '4번방', url: 'https://bit.ly/맥비4' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] mt-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
          {/* 사이트 소개 + 모토 + 운영팀 */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-[var(--fg)]">맥비기획 자료실</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                맥비기획 톡방에서 지식 공유의 일환으로 기획 관련 자료를 모은 곳이에요.
              </p>
            </div>

            <div className="text-xs">
              <div className="font-semibold text-[var(--muted)] mb-1.5">운영팀</div>
              <ul className="flex flex-col gap-1 text-[var(--muted-2)]">
                <li><span className="text-[var(--muted)]">정비팀</span> 전용구</li>
                <li><span className="text-[var(--muted)]">운영팀</span> 서지연</li>
                <li><span className="text-[var(--muted)]">구독팀</span> 이종석</li>
              </ul>
            </div>
          </div>

          {/* 맥비기획 채널 + 문의 */}
          <div className="flex flex-col gap-5">
            {/* 카카오톡 톡방 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-[var(--fg)] inline-flex items-center gap-1.5">
                <MessageCircle size={14} aria-hidden /> 카카오톡 톡방
              </h3>
              <p className="text-[11px] text-[var(--muted-2)]">
                인원이 비어있는 방에 자유롭게 참여하세요 · 참여코드 <code className="px-1 py-0.5 rounded bg-[var(--card)] text-[var(--muted)]">macbe</code>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {ROOMS.map((r) => (
                  <a
                    key={r.label}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-2 py-2 rounded-[var(--r-md)] bg-[#FEE500] text-[#191919] font-semibold text-xs hover:opacity-90 transition"
                  >
                    {r.label}
                  </a>
                ))}
              </div>
            </div>

            {/* 다른 채널 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-[var(--fg)]">다른 채널</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
                <li>
                  <a
                    href="https://www.youtube.com/@맥비IT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] w-fit"
                  >
                    <Video size={13} aria-hidden /> 유튜브 @맥비IT
                    <ExternalLink size={10} aria-hidden />
                  </a>
                </li>
                <li>
                  <a
                    href="https://bit.ly/맥비기획포폴공유"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] w-fit"
                  >
                    <FolderOpen size={13} aria-hidden /> 포트폴리오 공유방 신청
                    <ExternalLink size={10} aria-hidden />
                  </a>
                </li>
              </ul>
            </div>

            {/* 문의 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-[var(--fg)]">문의</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
                <li className="inline-flex items-center gap-1.5">
                  <MessageSquare size={13} aria-hidden /> 톡장(맥비) ID
                  <code className="px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--fg)]">iam219</code>
                </li>
                <li>
                  <a
                    href="mailto:macbe219@naver.com"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] w-fit"
                  >
                    <Mail size={13} aria-hidden /> macbe219@naver.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-8 pt-5 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between text-xs text-[var(--muted-2)]">
          <div>© 2026 맥비기획 자료실 운영팀</div>
          <div className="flex flex-wrap gap-3">
            <Suspense fallback={null}><FooterAdminLink /></Suspense>
          </div>
        </div>
      </div>
    </footer>
  );
}
