'use client';

import { sendGAEvent } from '@next/third-parties/google';
import posthog from 'posthog-js';

function fire(event: string, props?: Record<string, unknown>) {
  sendGAEvent('event', event, props);
  if (typeof window !== 'undefined') posthog.capture(event, props);
}

export const track = {
  imageUploaded: () =>
    fire('image_uploaded'),

  backtestRun: (params: { assetCount: number; mode: 'beginner' | 'expert'; source: 'manual' | 'image' | 'community' | 'mine' }) =>
    fire('backtest_run', params),

  portfolioSaved: (params: { assetCount: number }) =>
    fire('portfolio_saved', params),

  portfolioLoaded: (source: 'community' | 'mine') =>
    fire('portfolio_loaded', { source }),

  communityShared: () =>
    fire('community_shared'),

  communityUnshared: () =>
    fire('community_unshared'),

  communitySavedToMine: () =>
    fire('community_saved_to_mine'),

  signIn: () =>
    fire('sign_in'),

  signOut: () =>
    fire('sign_out'),
};

export function identifyUser(userId: string, email?: string) {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, email ? { email } : undefined);
  }
}

export function resetUser() {
  if (typeof window !== 'undefined') posthog.reset();
}
