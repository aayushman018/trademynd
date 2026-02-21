'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const TOKEN_LIFETIME_SECONDS = 15 * 60;
const POLL_INTERVAL_MS = 3000;

type UserProfile = {
  id: string;
  email: string;
  name: string;
  user_id: string;
  plan: string;
  telegram_connected?: boolean;
  telegram_chat_id?: number | null;
};

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function maskChatId(chatId?: number | null): string {
  if (chatId === null || chatId === undefined) {
    return 'Unavailable';
  }
  const raw = String(chatId);
  const visible = raw.slice(-4);
  const masked = '*'.repeat(Math.max(raw.length - 4, 2));
  return `${masked}${visible}`;
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-[#888888]">
      <path d="M20.665 3.717a2.364 2.364 0 0 0-2.393-.388L3.794 8.889a2.32 2.32 0 0 0 .095 4.358l3.02.94a.96.96 0 0 1 .654.602l1.233 3.845a2.322 2.322 0 0 0 4.025.775l2.03-2.273a.96.96 0 0 1 1.024-.284l3.442 1.102a2.32 2.32 0 0 0 2.973-2.004l1.335-10.76a2.323 2.323 0 0 0-.96-2.175Zm-2.314 4.69-5.408 5.084a.96.96 0 0 0-.287.489l-.393 1.953a.32.32 0 0 1-.57.134l-1.6-2.133a.96.96 0 0 0-.436-.33l-3.366-1.323a.32.32 0 0 1 .008-.598l12.007-4.289a.32.32 0 0 1 .045.613Z" />
    </svg>
  );
}

export function TelegramConnectWidget() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const botUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'trademyndjournal_bot').trim();

  const fetchProfile = useCallback(async () => {
    const response = await api.get('/users/me');
    const nextProfile: UserProfile = response.data;
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await fetchProfile();
      } catch {
        if (mounted) {
          setError('Failed to load Telegram connection status.');
        }
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  const isConnected = Boolean(profile?.telegram_connected ?? user?.telegram_connected);
  const telegramChatId = profile?.telegram_chat_id ?? user?.telegram_chat_id ?? null;

  useEffect(() => {
    if (!token || !expiresAt) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setToken(null);
        setExpiresAt(null);
        setTokenExpired(true);
      }
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [token, expiresAt]);

  useEffect(() => {
    if (!token || isConnected) {
      return;
    }

    const poll = window.setInterval(async () => {
      try {
        const latest = await fetchProfile();
        if (latest.telegram_connected) {
          setToken(null);
          setExpiresAt(null);
          setTokenExpired(false);
          await refreshUser();
        }
      } catch {
        // Keep polling silently for transient failures.
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(poll);
  }, [fetchProfile, isConnected, refreshUser, token]);

  const connectCommand = useMemo(() => (token ? `/connect ${token}` : ''), [token]);

  const handleGenerateToken = async () => {
    setGenerating(true);
    setError(null);
    setTokenExpired(false);
    try {
      const response = await api.get('/users/me/telegram-token');
      const nextToken = response.data?.token as string;
      if (!nextToken) {
        throw new Error('Token missing in response');
      }
      setToken(nextToken);
      setExpiresAt(Date.now() + TOKEN_LIFETIME_SECONDS * 1000);
      setTimeLeft(TOKEN_LIFETIME_SECONDS);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not generate connect code. Please try again.');
      setToken(null);
      setExpiresAt(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await api.post('/users/me/telegram-disconnect');
      const latest = await fetchProfile();
      if (!latest.telegram_connected) {
        await refreshUser();
      }
    } catch {
      setError('Failed to disconnect Telegram. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const waitingForTelegram = Boolean(token && !isConnected);

  return (
    <div
      className={[
        'rounded-lg border bg-[#141414] p-5 transition-colors duration-200',
        waitingForTelegram ? 'animate-subtle-pulse border-[#3A3A3A]' : '',
        isConnected ? 'border-[rgba(201,168,76,0.3)]' : 'border-[#2A2A2A]',
      ].join(' ')}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <TelegramIcon />
          <div>
            <h3 className="text-lg font-semibold text-[#F0F0F0]">Connect Telegram</h3>
            <p className="text-sm text-[#888888]">Log trades hands-free by messaging our bot</p>
          </div>
        </div>
        {isConnected ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] px-3 py-1 text-xs font-medium text-[#4CAF7A]">
            <span className="h-2 w-2 rounded-full bg-[#4CAF7A]" />
            Connected
          </span>
        ) : null}
      </div>

      {loadingProfile ? <p className="text-sm text-[#888888]">Loading connection status...</p> : null}

      {!loadingProfile && !isConnected ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGenerateToken}
            disabled={generating}
            className="rounded-md bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#E8C97A] active:bg-[#8A6D2F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? 'Generating...' : 'Generate Connect Code'}
          </button>

          {token ? (
            <div className="space-y-3">
              <pre
                className="overflow-x-auto rounded-md border border-[#2A2A2A] bg-[#1C1C1C] px-4 py-3 text-base text-[#C9A84C]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {token}
              </pre>

              <div className="space-y-2 text-sm text-[#888888]">
                <p>1. Open Telegram</p>
                <p>2. Search @{botUsername}</p>
                <p>
                  3. Send <span className="font-mono text-[#F0F0F0]">{connectCommand}</span>
                </p>
              </div>

              <p className="text-sm text-[#888888]">Code expires in {formatCountdown(timeLeft)}</p>
            </div>
          ) : null}

          {waitingForTelegram ? <p className="text-sm text-[#555555]">Waiting for Telegram...</p> : null}
          {tokenExpired ? <p className="text-sm text-[#C0504A]">Connect code expired. Generate a new one.</p> : null}
        </div>
      ) : null}

      {!loadingProfile && isConnected ? (
        <div className="space-y-3">
          <p className="text-sm text-[#888888]">
            Linked chat ID: <span className="font-mono text-[#F0F0F0]">{maskChatId(telegramChatId)}</span>
          </p>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs text-[#555555] underline-offset-2 transition-colors duration-200 hover:text-[#888888] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-[#C0504A]">{error}</p> : null}
    </div>
  );
}
