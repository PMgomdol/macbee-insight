import { Suspense } from 'react';
import Link from 'next/link';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { FooterAdminLink } from './FooterAdminLink';

const KAKAO_OPENCHAT_URL = 'https://open.kakao.com/'; // TODO: 실제 맥비기획 오픈채팅 링크로 교체
const ARCHIVE_SHEET_URL = 'https://bit.ly/맥비톡방-자료실';

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] mt-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          {/* 소개 + 운영팀 */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-sm text-[var(--fg)]">맥비기획 자료실</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              맥비기획 톡방에서 지식 공유의 일환으로 기획 관련 자료를 모은 곳이에요.
            </p>
            <div className="text-xs mt-2">
              <div className="font-semibold text-[var(--muted)] mb-1.5">운영팀</div>
              <ul className="flex flex-col gap-1 text-[var(--muted-2)]">
                <li><span className="text-[var(--muted)]">정비팀</span> 전용구</li>
                <li><span className="text-[var(--muted)]">운영팀</span> 서지연</li>
                <li><span className="text-[var(--muted)]">구독팀</span> 이종석</li>
              </ul>
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="flex flex-col gap-2.5">
            <h3 className="font-bold text-sm text-[var(--fg)]">빠른 이동</h3>
            <nav className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
              <Link href="/files" className="hover:text-[var(--accent)] w-fit">양식·템플릿</Link>
              <Link href="/insights" className="hover:text-[var(--accent)] w-fit">아티클·영상</Link>
              <Link href="/faq" className="hover:text-[var(--accent)] w-fit">실무 Q&amp;A</Link>
              <Link href="/submit" className="hover:text-[var(--accent)] w-fit">자료 등록</Link>
            </nav>
          </div>

          {/* 함께해요 */}
          <div className="flex flex-col gap-2.5">
            <h3 className="font-bold text-sm text-[var(--fg)]">함께해요</h3>
            <a
              href={KAKAO_OPENCHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] bg-[#FEE500] text-[#191919] font-semibold text-xs w-fit hover:opacity-90 transition"
            >
              <MessageCircle size={14} aria-hidden />
              카카오톡 오픈채팅 참여
            </a>
            <a
              href={ARCHIVE_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] w-fit"
            >
              자료실 원본 시트 보기
              <ExternalLink size={11} aria-hidden />
            </a>
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
