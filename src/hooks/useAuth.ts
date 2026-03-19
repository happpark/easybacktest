'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { signInWithGoogle as authSignInWithGoogle, signOut as authSignOut } from '@/lib/supabase/auth';
import { identifyUser, resetUser, track } from '@/lib/posthog/events';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) {
        identifyUser(u.id, u.email);
        if (event === 'SIGNED_IN') track.signIn();
      } else if (event === 'SIGNED_OUT') {
        resetUser();
        track.signOut();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return authSignInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    const result = await authSignOut();
    if (!result.error) {
      setUser(null);
    }
    return result;
  }, []);

  return { user, loading, signInWithGoogle, signOut };
}
