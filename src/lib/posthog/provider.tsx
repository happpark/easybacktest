'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && key) {
  posthog.init(key, {
    api_host: host,
    person_profiles: 'always',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
