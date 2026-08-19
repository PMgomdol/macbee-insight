import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 · 맥비 자료실',
  description: '맥비 자료실이 수집하는 개인정보 항목과 이용·보관·문의 방법을 안내합니다.',
};

const UPDATED = '2026년 8월 19일';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">개인정보처리방침</h1>
        <p className="text-sm text-[var(--muted)]">시행일: {UPDATED}</p>
      </section>

      <p className="text-sm leading-relaxed text-[var(--fg)]">
        맥비 자료실 운영팀(이하 &lsquo;운영팀&rsquo;)은 이용자의 개인정보를 중요하게 생각하며,
        「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 맥비 자료실(이하 &lsquo;서비스&rsquo;)에서
        어떤 개인정보를 어떻게 수집·이용·보관하는지 안내합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <p>서비스는 회원가입 절차 없이 열람할 수 있으며, 아래 상황에서만 개인정보를 수집합니다. 이름·이메일은 모두 선택 입력입니다.</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li><b>자료 제안</b>: 제안자 이름/닉네임(선택), 이메일(선택 — 검토 결과 회신용)</li>
          <li><b>의견·문의(피드백)</b>: 이름(선택), 이메일(선택 — 답변용), 그리고 문의 처리를 위해 접속 기기 정보(User-Agent)와 작성 시점의 페이지 주소가 자동 저장됩니다.</li>
          <li><b>운영진 신청</b>: Google 계정 로그인을 통한 이메일, 이름/닉네임, 신청 사유</li>
          <li><b>자동 수집(이용 분석)</b>: 쿠키, 서비스 이용 기록, 접속 기기·브라우저 정보 (아래 &lsquo;4. 쿠키 및 이용 분석&rsquo; 참고)</li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 이용 목적">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>제안한 자료의 검토 결과 회신</li>
          <li>의견·문의에 대한 응대 및 오류 처리</li>
          <li>운영진 자격 확인 및 권한 관리</li>
          <li>서비스 개선, 이용 통계 분석</li>
        </ul>
      </Section>

      <Section title="3. 보유 및 이용 기간">
        <p>
          수집한 개인정보는 이용 목적이 달성되면 지체 없이 파기합니다. 운영진 계정 정보는 자격이 유지되는 동안 보관하며,
          탈퇴·자격 해지 시 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>
      </Section>

      <Section title="4. 쿠키 및 이용 분석">
        <p>
          서비스는 이용 현황 분석과 서비스 개선을 위해 아래 도구를 사용하며, 이 과정에서 쿠키와 기기·브라우저 정보가 수집될 수 있습니다.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li><b>Google Analytics</b> (유입·페이지 방문 분석)</li>
          <li><b>PostHog</b> (버튼 클릭 등 이용 행태 분석 · 쿠키/로컬 저장소 사용)</li>
          <li><b>Vercel Analytics</b> (트래픽 통계)</li>
        </ul>
        <p>
          이용자는 웹 브라우저의 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만 일부 기능 이용에 제약이 있을 수 있습니다.
        </p>
      </Section>

      <Section title="5. 개인정보 처리 위탁 및 제3자 제공">
        <p>운영팀은 이용자의 개인정보를 외부에 판매하거나 제공하지 않습니다. 다만 서비스 운영에 필요한 범위에서 아래 사업자의 인프라를 이용합니다.</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li><b>Supabase</b> — 데이터베이스·인증 저장</li>
          <li><b>Vercel</b> — 서비스 호스팅 및 트래픽 분석</li>
          <li><b>Google</b> — 운영진 로그인(OAuth) 및 이용 분석</li>
          <li><b>PostHog</b> — 이용 행태 분석</li>
        </ul>
      </Section>

      <Section title="6. 이용자의 권리">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다.
          아래 문의처로 요청하시면 지체 없이 조치합니다.
        </p>
      </Section>

      <Section title="7. 개인정보 보호책임자 및 문의처">
        <p>
          개인정보 처리에 관한 문의·요청은 아래로 연락해 주세요.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>운영 주체: 맥비 자료실 운영팀</li>
          <li>문의: <a className="text-[var(--accent)] hover:underline" href="mailto:asa067714@gmail.com">asa067714@gmail.com</a></li>
        </ul>
      </Section>

      <Section title="8. 고지의 의무">
        <p>
          본 방침의 내용이 변경되는 경우, 변경 사항을 서비스 내 공지를 통해 안내합니다.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      <div className="text-sm leading-relaxed text-[var(--fg)] flex flex-col gap-2">{children}</div>
    </section>
  );
}
