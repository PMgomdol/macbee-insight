import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 · 맥비 자료실',
  description: '맥비 자료실 이용약관과 외부 자료·저작권에 대한 면책 안내입니다.',
};

const UPDATED = '2026년 8월 19일';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">이용약관</h1>
        <p className="text-sm text-[var(--muted)]">시행일: {UPDATED}</p>
      </section>

      <Section title="1. 목적">
        <p>
          본 약관은 맥비 자료실 운영팀(이하 &lsquo;운영팀&rsquo;)이 제공하는 맥비 자료실(이하 &lsquo;서비스&rsquo;)의
          이용 조건과 절차, 운영팀과 이용자의 권리·의무를 정하는 것을 목적으로 합니다.
        </p>
      </Section>

      <Section title="2. 서비스의 내용">
        <p>
          서비스는 맥비기획 톡방에서 공유된, 기획·PM·디자인 등 실무에 참고할 만한 자료와 외부 링크를 모아
          누구나 무료로 열람할 수 있도록 큐레이션하는 비영리 정보 모음입니다.
        </p>
      </Section>

      <Section title="3. 외부 자료 및 링크에 대한 면책">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>서비스에 게시된 자료의 상당수는 외부 사이트로 연결되는 링크이며, 해당 자료의 저작권은 각 원저작자·게시자에게 있습니다.</li>
          <li>운영팀은 외부 링크로 연결된 자료의 내용·정확성·최신성 및 링크의 유효성을 보증하지 않으며, 외부 자료로 인해 발생한 문제에 대해 책임을 지지 않습니다.</li>
          <li>외부 사이트의 사정으로 링크가 삭제되거나 내용이 변경될 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="4. 저작권 및 삭제 요청">
        <p>
          서비스에 소개된 자료의 저작권은 원저작자에게 귀속됩니다. 권리자가 자료의 소개·링크 게시 중단을 요청하는 경우,
          운영팀은 확인 후 지체 없이 해당 자료를 삭제합니다. 요청은 아래 문의처로 접수해 주세요.
        </p>
      </Section>

      <Section title="5. 이용자의 의무">
        <p>
          이용자는 서비스를 관계 법령과 본 약관에 따라 이용해야 하며, 서비스의 정상적인 운영을 방해하거나
          타인의 권리를 침해하는 행위를 해서는 안 됩니다.
        </p>
      </Section>

      <Section title="6. 책임의 제한">
        <p>
          서비스는 무료로 제공되는 비영리 자료 모음입니다. 운영팀은 천재지변, 외부 서비스 장애 등 통제할 수 없는 사유나
          이용자의 서비스 이용으로 발생한 손해에 대해 법령이 허용하는 범위에서 책임을 지지 않습니다.
        </p>
      </Section>

      <Section title="7. 문의 및 시행">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>운영 주체: 맥비 자료실 운영팀</li>
          <li>문의: <a className="text-[var(--accent)] hover:underline" href="mailto:asa067714@gmail.com">asa067714@gmail.com</a></li>
        </ul>
        <p>본 약관은 {UPDATED}부터 시행합니다. 개인정보 처리에 관한 자세한 내용은 <a className="text-[var(--accent)] hover:underline" href="/privacy">개인정보처리방침</a>을 참고해 주세요.</p>
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
