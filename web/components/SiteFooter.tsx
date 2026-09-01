import { Suspense } from 'react';
import Link from 'next/link';
import { MessageCircle, Video, FolderOpen, ExternalLink } from 'lucide-react';
import { FooterAdminLink } from './FooterAdminLink';
import { ConsentResetLink } from './ConsentResetLink';

const ROOMS = [
  { label: '1번방', url: 'https://bit.ly/맥비' },
  { label: '2번방', url: 'https://bit.ly/맥비2' },
  { label: '3번방', url: 'https://bit.ly/맥비3' },
  { label: '4번방', url: 'https://bit.ly/맥비4' },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-[#1B1C1F] text-white/55">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
          {/* 사이트 소개 + 문의 */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-white/90">맥비 자료실</h3>
              <p className="text-xs leading-relaxed">
                맥비기획 톡방에서 지식 공유의 일환으로 기획 관련 자료를 모은 곳이에요.
              </p>
            </div>

            {/* 운영팀 — 2026-09 오픈 시 추가 (B안: 이름·닉네임만) */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-white/90">맥비기획 자료실 운영팀</h3>
              <p className="text-xs">맥비 · 안재찬 · 서지연 · 임종헌 · 김소정</p>
            </div>

          </div>

          {/* 맥비기획 채널 */}
          <div className="flex flex-col gap-5">
            {/* 카카오톡 톡방 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-white/90 inline-flex items-center gap-1.5">
                <MessageCircle size={14} aria-hidden /> 카카오톡 톡방
              </h3>
              <p className="text-[11px] text-white/40">
                인원이 비어있는 방에 자유롭게 참여하세요 · 참여코드 <code className="px-1 py-0.5 rounded bg-white/10 text-white/80">macbe</code>
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {ROOMS.map((r) => (
                  <li key={r.label}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-white w-fit transition-colors"
                    >
                      {r.label}
                      <ExternalLink size={10} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* 다른 채널 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-sm text-white/90">다른 채널</h3>
              <ul className="flex flex-col gap-1.5 text-xs">
                <li>
                  <a
                    href="https://www.youtube.com/@맥비IT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-white w-fit transition-colors"
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
                    className="inline-flex items-center gap-1.5 hover:text-white w-fit transition-colors"
                  >
                    <FolderOpen size={13} aria-hidden /> 포트폴리오 공유방 신청
                    <ExternalLink size={10} aria-hidden />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-5 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between text-xs text-white/40">
          <div>© 2026 맥비 자료실 운영팀</div>
          <div className="flex flex-wrap gap-3 items-center">
            <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
            <ConsentResetLink />
            <Suspense fallback={null}><FooterAdminLink /></Suspense>
          </div>
        </div>
      </div>
    </footer>
  );
}
