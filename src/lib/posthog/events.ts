'use client';

import { sendGAEvent } from '@next/third-parties/google';

export const track = {
  imageUploaded: () =>
    sendGAEvent('event', 'image_uploaded'),

  backtestRun: (params: { assetCount: number; mode: 'beginner' | 'expert'; source: 'manual' | 'image' | 'community' | 'mine' }) =>
    sendGAEvent('event', 'backtest_run', params),

  portfolioSaved: (params: { assetCount: number }) =>
    sendGAEvent('event', 'portfolio_saved', params),

  portfolioLoaded: (source: 'community' | 'mine') =>
    sendGAEvent('event', 'portfolio_loaded', { source }),

  communityShared: () =>
    sendGAEvent('event', 'community_shared'),

  communityUnshared: () =>
    sendGAEvent('event', 'community_unshared'),

  communitySavedToMine: () =>
    sendGAEvent('event', 'community_saved_to_mine'),

  signIn: () =>
    sendGAEvent('event', 'sign_in'),

  signOut: () =>
    sendGAEvent('event', 'sign_out'),
};

// GA4는 별도 identify 불필요
export function identifyUser() {}
export function resetUser() {}
