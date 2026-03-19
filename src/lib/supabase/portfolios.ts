import { createClient } from '@/lib/supabase/client';
import type { Asset } from '@/app/page';
import type { BacktestOutput } from '@/ai/flows/backtest-portfolio';

export interface PortfolioRow {
  id: string;
  user_id: string;
  name: string;
  assets: Asset[];
  result: BacktestOutput;
  created_at: string;
}

export async function savePortfolio(
  userId: string,
  name: string,
  assets: Asset[],
  result: BacktestOutput
): Promise<PortfolioRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: userId,
      name,
      assets,
      result,
    })
    .select()
    .single();

  if (error) {
    console.error('savePortfolio error:', error);
    return null;
  }

  return data as PortfolioRow;
}

export async function getPortfolios(userId: string): Promise<PortfolioRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getPortfolios error:', error);
    return [];
  }

  return (data ?? []) as PortfolioRow[];
}

export async function deletePortfolio(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('portfolios').delete().eq('id', id);

  if (error) {
    console.error('deletePortfolio error:', error);
    return false;
  }

  return true;
}

export async function renamePortfolio(id: string, name: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('portfolios')
    .update({ name })
    .eq('id', id);

  if (error) {
    console.error('renamePortfolio error:', error);
    return false;
  }

  return true;
}
