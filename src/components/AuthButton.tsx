'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LogOut, ChevronDown } from 'lucide-react';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { t } = useLang();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={async () => {
          setSigningIn(true);
          try {
            await signInWithGoogle();
          } finally {
            setSigningIn(false);
          }
        }}
        disabled={signingIn}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border',
          'bg-white/10 border-white/15 text-foreground hover:bg-white/15 hover:border-white/25',
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      >
        <GoogleIcon className="w-4 h-4 shrink-0" />
        <span>{signingIn ? t('auth_signing_in') : t('auth_sign_in_google')}</span>
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = user.user_metadata?.full_name as string | undefined;
  const email = user.email;
  const initials = getInitials(displayName, email);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm font-semibold transition-all border',
          'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        )}
      >
        {/* Avatar */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName ?? email ?? t('auth_user_fallback')}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-primary">{initials}</span>
          </div>
        )}
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            dropdownOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-52 glass-morphism rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-bold text-foreground truncate">
              {displayName ?? t('auth_user_fallback')}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{email}</p>
          </div>

          {/* Sign out */}
          <button
            onClick={async () => {
              setDropdownOpen(false);
              await signOut();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <LogOut size={14} />
            {t('auth_sign_out')}
          </button>
        </div>
      )}
    </div>
  );
}
