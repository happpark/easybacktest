'use server';

import { createClient } from '@/lib/supabase/server';

type LogLevel = 'error' | 'warn' | 'info';

export async function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  url?: string,
) {
  // Always print to console (Vercel logs)
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${level.toUpperCase()}] ${message}`, context ?? '');

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('error_logs').insert({
      level,
      message,
      context: context ?? null,
      url: url ?? null,
      user_id: user?.id ?? null,
    });
  } catch {
    // Never throw from logger
  }
}

export async function logError(
  e: unknown,
  context?: Record<string, unknown>,
  url?: string,
) {
  const message = e instanceof Error ? e.message : String(e);
  const ctx = e instanceof Error && e.stack
    ? { stack: e.stack, ...context }
    : context;
  await log('error', message, ctx, url);
}
