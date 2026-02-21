'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { TelegramConnectWidget } from '@/components/dashboard/TelegramConnectWidget';

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs uppercase tracking-[0.16em] text-[#888888]">{title}</h2>
      <div className="h-px flex-1 bg-[#2A2A2A]" />
    </div>
  );
}

function PlanBadge({ plan }: { plan: string | undefined }) {
  const normalized = (plan || 'free').toLowerCase();

  if (normalized === 'elite') {
    return (
      <span className="elite-shimmer inline-flex rounded-full border border-[#C9A84C] bg-[#141414] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
        Elite
      </span>
    );
  }
  if (normalized === 'pro') {
    return (
      <span className="inline-flex rounded-full border border-[#C9A84C] bg-[#1C1C1C] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
        Pro
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#888888]">
      Free
    </span>
  );
}

export default function DashboardSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F0F0F0]">Settings</h1>
        <p className="mt-1 text-sm text-[#888888]">Manage profile, integrations, and account controls.</p>
      </div>

      <section className="space-y-4">
        <SectionHeader title="Profile" />
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#555555]">Full Name</label>
              <input
                value={user?.name || ''}
                readOnly
                className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#555555]">Email</label>
              <input
                value={user?.email || ''}
                readOnly
                className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 text-sm text-[#F0F0F0] outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#555555]">User ID</label>
              <input
                value={user?.user_id || ''}
                readOnly
                className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3 font-mono text-sm text-[#F0F0F0] outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#555555]">Current Plan</label>
              <div className="flex h-10 items-center rounded-md border border-[#2A2A2A] bg-[#0C0C0C] px-3">
                <PlanBadge plan={user?.plan} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4" id="telegram-connect">
        <SectionHeader title="Telegram Connect" />
        <TelegramConnectWidget />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Subscription & Billing" />
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-5">
          <p className="text-sm text-[#888888]">
            Upgrade or downgrade anytime. Annual plans include discounted pricing.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex rounded-md border border-[#C9A84C] bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#E8C97A]"
          >
            Manage Plan
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Danger Zone" />
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-5">
          <p className="text-sm text-[#888888]">Signing out will end your current session on this device.</p>
          <button
            type="button"
            onClick={logout}
            className="mt-4 rounded-md border border-[#3A3A3A] bg-[#0C0C0C] px-4 py-2 text-sm font-medium text-[#F0F0F0] transition-colors duration-200 hover:border-[#C0504A] hover:text-[#C0504A]"
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
