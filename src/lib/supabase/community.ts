import { createClient } from '@/lib/supabase/client';
import type { Asset } from '@/app/page';
import type { BacktestOutput } from '@/ai/flows/backtest-portfolio';

export interface CommunityPortfolioRow {
  id: string;
  user_id: string;
  name: string;
  nickname: string;
  assets: Asset[];
  result: BacktestOutput;
  created_at: string;
}

export async function shareToCommunity(
  userId: string,
  name: string,
  nickname: string,
  assets: Asset[],
  result: BacktestOutput,
): Promise<CommunityPortfolioRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('community_portfolios')
    .insert({ user_id: userId, name, nickname, assets, result })
    .select()
    .single();
  if (error) { console.error('[community] share error:', error); return null; }
  return data as CommunityPortfolioRow;
}

export async function getCommunityPortfolios(): Promise<CommunityPortfolioRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('community_portfolios')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[community] fetch error:', error); return []; }
  return (data ?? []) as CommunityPortfolioRow[];
}

export async function deleteFromCommunity(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('community_portfolios')
    .delete()
    .eq('id', id);
  if (error) { console.error('[community] delete error:', error); return false; }
  return true;
}

export async function getMySharedPortfolios(userId: string): Promise<CommunityPortfolioRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('community_portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[community] my-shared error:', error); return []; }
  return (data ?? []) as CommunityPortfolioRow[];
}
