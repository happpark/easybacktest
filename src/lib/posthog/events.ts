'use client';

import posthog from 'posthog-js';

// 이미지 업로드 → 백테스트 → 저장 퍼널 추적
export const track = {
  imageUploaded: () =>
    posthog.capture('image_uploaded'),

  backtestRun: (params: { assetCount: number; mode: 'beginner' | 'expert'; source: 'manual' | 'image' | 'community' | 'mine' }) =>
    posthog.capture('backtest_run', params),

  portfolioSaved: (params: { assetCount: number }) =>
    posthog.capture('portfolio_saved', params),

  portfolioLoaded: (source: 'community' | 'mine') =>
    posthog.capture('portfolio_loaded', { source }),

  communityShared: () =>
    posthog.capture('community_shared'),

  communityUnshared: () =>
    posthog.capture('community_unshared'),

  communitySavedToMine: () =>
    posthog.capture('community_saved_to_mine'),

  signIn: () =>
    posthog.capture('sign_in'),

  signOut: () =>
    posthog.capture('sign_out'),
};

// 로그인 유저 식별 — useAuth에서 user 바뀔 때 호출
export function identifyUser(userId: string, email?: string | null) {
  posthog.identify(userId, { email: email ?? undefined });
}

export function resetUser() {
  posthog.reset();
}
