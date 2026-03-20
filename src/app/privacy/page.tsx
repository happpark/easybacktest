export const metadata = {
  title: '개인정보처리방침 — Easybacktest',
};

export default function PrivacyPage() {
  const updated = '2026년 3월 20일';
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-sm text-foreground/80 leading-relaxed">
      <h1 className="text-2xl font-bold text-foreground mb-2">개인정보처리방침</h1>
      <p className="text-muted-foreground mb-10">최종 수정일: {updated}</p>

      {[
        {
          title: '1. 수집하는 정보',
          body: `Easybacktest는 서비스 제공을 위해 다음 정보를 수집합니다.\n
• Google 로그인 시: 이메일 주소, Google 계정 ID\n
• 서비스 이용 시: 입력한 포트폴리오 구성 및 백테스트 결과 (저장 기능 이용 시)\n
• 자동 수집: 페이지 방문 기록, 기능 사용 로그 (Google Analytics 4 이용)`,
        },
        {
          title: '2. 수집 목적',
          body: `• 포트폴리오 저장 및 커뮤니티 공유 기능 제공\n• 서비스 품질 개선 및 오류 분석\n• 이용 통계 파악 (익명 집계)`,
        },
        {
          title: '3. 보관 및 파기',
          body: `수집된 개인정보는 회원 탈퇴 또는 서비스 종료 시 지체 없이 파기합니다. Google Analytics 데이터는 Google의 데이터 보존 정책에 따릅니다.`,
        },
        {
          title: '4. 제3자 제공',
          body: `이용자의 개인정보를 제3자에게 판매하거나 제공하지 않습니다. 단, 서비스 운영을 위해 다음 서비스를 활용합니다.\n
• Supabase (데이터베이스 및 인증): supabase.com\n
• Google Analytics 4 (이용 통계): analytics.google.com`,
        },
        {
          title: '5. 쿠키 및 추적',
          body: `Google Analytics 4를 통해 방문 기록을 수집합니다. 브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 기능이 제한될 수 있습니다.`,
        },
        {
          title: '6. 이용자 권리',
          body: `이용자는 언제든지 저장된 포트폴리오를 삭제하거나 계정을 탈퇴할 수 있습니다. 개인정보 관련 문의는 아래 이메일로 연락해 주세요.`,
        },
        {
          title: '7. 문의',
          body: `개인정보 관련 문의: shinix348p@gmail.com`,
        },
      ].map(({ title, body }) => (
        <section key={title} className="mb-8">
          <h2 className="text-base font-bold text-foreground mb-2">{title}</h2>
          <p className="whitespace-pre-line">{body}</p>
        </section>
      ))}
    </main>
  );
}
