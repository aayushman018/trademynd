'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

type Currency = 'USD' | 'INR';
type BillingCycle = 'monthly' | 'annual';
type Tier = 'FREE' | 'PRO' | 'ELITE';
type PaymentGateway = 'stripe' | 'upi';

type PricingTier = {
  id: Tier;
  label: string;
  monthly: { USD: number; INR: number };
  annual: { USD: number; INR: number };
  annualNote: { USD: string; INR: string };
  subtitle: string;
  cta: string;
  ctaVariant: 'outlineSilver' | 'solidGold' | 'outlineGold';
  popular?: boolean;
  features: Array<{ label: string; included: boolean }>;
};

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'FREE',
    label: 'FREE',
    monthly: { USD: 0, INR: 0 },
    annual: { USD: 0, INR: 0 },
    annualNote: { USD: '$0 forever', INR: 'Rs 0 forever' },
    subtitle: '$0 / Rs 0 forever',
    cta: 'Start Free',
    ctaVariant: 'outlineSilver',
    features: [
      { label: '30 trades/month', included: true },
      { label: 'Manual entry only', included: true },
      { label: 'Basic dashboard', included: true },
      { label: 'No AI analysis', included: false },
      { label: 'No Telegram bot', included: false },
    ],
  },
  {
    id: 'PRO',
    label: 'PRO',
    monthly: { USD: 12, INR: 499 },
    annual: { USD: 99, INR: 4999 },
    annualNote: { USD: '$99/yr (save ~$45)', INR: 'Rs 4,999/yr (save 2 months)' },
    subtitle: '$12/mo or Rs 499/mo',
    cta: 'Get Pro',
    ctaVariant: 'solidGold',
    popular: true,
    features: [
      { label: 'Unlimited trades', included: true },
      { label: 'Telegram bot logging', included: true },
      { label: 'AI analysis (20 queries/day)', included: true },
      { label: 'Full dashboard + charts', included: true },
      { label: 'Emotion & session tracking', included: true },
    ],
  },
  {
    id: 'ELITE',
    label: 'ELITE',
    monthly: { USD: 19, INR: 899 },
    annual: { USD: 159, INR: 8999 },
    annualNote: { USD: '$159/yr', INR: 'Rs 8,999/yr (save 2 months)' },
    subtitle: '$19/mo or Rs 899/mo',
    cta: 'Get Elite',
    ctaVariant: 'outlineGold',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Unlimited AI queries', included: true },
      { label: 'Advanced analytics', included: true },
      { label: 'Performance export (CSV/PDF)', included: true },
      { label: 'Priority support', included: true },
      { label: 'Early access to new features', included: true },
    ],
  },
];

const FAQS = [
  {
    question: 'Can I switch plans anytime?',
    answer: 'Yes. You can upgrade or downgrade anytime. Changes are applied to your next billing cycle.',
  },
  {
    question: 'Is there a free trial for Pro?',
    answer: 'You can start on the Free plan and upgrade to Pro whenever you are ready.',
  },
  {
    question: 'How does the Telegram bot work?',
    answer: 'Generate a secure connect code in settings, send it to the bot, and your account links instantly.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We support major cards and digital payment methods through our billing provider.',
  },
  {
    question: 'Is my trading data secure?',
    answer: 'Yes. Data is encrypted in transit and stored with secure infrastructure and access controls.',
  },
];

function formatCurrency(value: number, currency: Currency): string {
  if (currency === 'INR') {
    return `Rs ${value.toLocaleString('en-IN')}`;
  }
  return `$${value.toLocaleString('en-US')}`;
}

function ctaClass(variant: PricingTier['ctaVariant']): string {
  if (variant === 'solidGold') {
    return 'bg-[#C9A84C] text-black hover:bg-[#E8C97A] border border-[#C9A84C]';
  }
  if (variant === 'outlineGold') {
    return 'border border-[#C9A84C] text-[#C9A84C] hover:bg-[#1C1C1C]';
  }
  return 'border border-[#3A3A3A] text-[#F0F0F0] hover:border-[#888888] hover:bg-[#1C1C1C]';
}

export default function PricingPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [autoCurrency, setAutoCurrency] = useState<Currency>('USD');
  const [locationName, setLocationName] = useState('your region');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [bannerVisible, setBannerVisible] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [checkoutLoadingKey, setCheckoutLoadingKey] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const countryCode = String(data?.country_code || '').toUpperCase();
        const countryName = data?.country_name || 'your region';

        if (countryCode === 'IN') {
          setCurrency('INR');
          setAutoCurrency('INR');
          setLocationName('India');
        } else {
          setCurrency('USD');
          setAutoCurrency('USD');
          setLocationName(countryName);
        }
      } catch {
        setCurrency('USD');
        setAutoCurrency('USD');
      }
    };

    detectLocation();
  }, []);

  const locationBannerText = useMemo(() => {
    if (autoCurrency === 'INR') {
      return `Showing prices for ${locationName}`;
    }
    return `Showing prices for ${locationName}`;
  }, [autoCurrency, locationName]);

  const handlePlanCheckout = async (tier: Tier, gateway: PaymentGateway) => {
    if (tier === 'FREE') {
      router.push('/register');
      return;
    }

    if (gateway === 'upi' && currency !== 'INR') {
      setPaymentError('UPI checkout is available for INR pricing. Switch to INR to continue.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const key = `${tier}-${gateway}`;
    setCheckoutLoadingKey(key);
    setPaymentError(null);
    try {
      const response = await api.post('/payments/checkout', {
        gateway,
        plan: tier.toLowerCase(),
        billing_cycle: billingCycle,
        currency,
      });

      const paymentUrl = response.data?.payment_url;
      if (!paymentUrl) {
        throw new Error('Payment URL missing');
      }
      window.location.href = paymentUrl;
    } catch (err: any) {
      setPaymentError(err?.response?.data?.detail || 'Unable to start checkout. Please try again.');
    } finally {
      setCheckoutLoadingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#F0F0F0]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
          <p className="mt-3 text-sm text-[#888888]">Choose the plan that matches your trading workflow.</p>
          {paymentError ? <p className="mt-3 text-sm text-[#C0504A]">{paymentError}</p> : null}
        </div>

        {bannerVisible ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 py-3 text-sm text-[#555555]">
            <p>{locationBannerText} - not your location?</p>
            <div className="flex items-center gap-3">
              {currency === 'INR' ? (
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className="text-[#C9A84C] transition-colors duration-200 hover:text-[#E8C97A]"
                >
                  Switch to USD
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className="text-[#C9A84C] transition-colors duration-200 hover:text-[#E8C97A]"
                >
                  Switch to INR
                </button>
              )}
              <button
                type="button"
                onClick={() => setBannerVisible(false)}
                className="text-[#888888] transition-colors duration-200 hover:text-[#F0F0F0]"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full border border-[#2A2A2A] bg-[#141414] p-1">
            <button
              type="button"
              className={[
                'rounded-full px-5 py-2 text-sm transition-colors duration-200',
                billingCycle === 'monthly' ? 'bg-[#C9A84C] text-black' : 'text-[#888888] hover:text-[#F0F0F0]',
              ].join(' ')}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={[
                'rounded-full px-5 py-2 text-sm transition-colors duration-200',
                billingCycle === 'annual' ? 'bg-[#C9A84C] text-black' : 'text-[#888888] hover:text-[#F0F0F0]',
              ].join(' ')}
              onClick={() => setBillingCycle('annual')}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const monthly = tier.monthly[currency];
            const annual = tier.annual[currency];
            const isFree = tier.id === 'FREE';
            return (
              <article
                key={tier.id}
                className={[
                  'relative flex h-full flex-col rounded-lg border bg-[#141414] p-6',
                  tier.popular ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.04)]' : 'border-[#2A2A2A]',
                ].join(' ')}
              >
                {tier.popular ? (
                  <div className="absolute -top-3 left-6 rounded-full bg-[#C9A84C] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                    Most Popular
                  </div>
                ) : null}

                <div className="mb-5">
                  <h2 className="text-lg font-semibold">{tier.label}</h2>
                  <p className="mt-1 text-sm text-[#888888]">{tier.subtitle}</p>
                </div>

                <div className="mb-6 min-h-[72px]">
                  {isFree ? (
                    <div>
                      <p className="text-3xl font-semibold text-[#C9A84C]">{formatCurrency(0, currency)}</p>
                      <p className="mt-1 text-sm text-[#888888]">forever</p>
                    </div>
                  ) : billingCycle === 'monthly' ? (
                    <div>
                      <p className="text-3xl font-semibold text-[#C9A84C]">{formatCurrency(monthly, currency)}</p>
                      <p className="mt-1 text-sm text-[#888888]">per month</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-[#555555] line-through">{formatCurrency(monthly * 12, currency)}</p>
                      <p className="text-3xl font-semibold text-[#C9A84C]">{formatCurrency(annual, currency)}</p>
                      <p className="mt-1 text-sm text-[#4CAF7A]">Save 17%</p>
                      <p className="mt-1 text-xs text-[#888888]">{tier.annualNote[currency]}</p>
                    </div>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A84C]" />
                      ) : (
                        <span className="mt-[3px] block h-4 w-4 shrink-0 text-center text-xs text-[#555555]">-</span>
                      )}
                      <span className={feature.included ? 'text-[#F0F0F0]' : 'text-[#555555]'}>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <Link
                    href="/register"
                    className={[
                      'mt-auto inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200',
                      ctaClass(tier.ctaVariant),
                    ].join(' ')}
                  >
                    {tier.cta}
                  </Link>
                ) : (
                  <div className="mt-auto space-y-2">
                    <button
                      type="button"
                      onClick={() => handlePlanCheckout(tier.id, 'stripe')}
                      disabled={checkoutLoadingKey !== null}
                      className={[
                        'w-full rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
                        tier.ctaVariant === 'solidGold'
                          ? 'border border-[#C9A84C] bg-[#C9A84C] text-black hover:bg-[#E8C97A]'
                          : 'border border-[#C9A84C] text-[#C9A84C] hover:bg-[#1C1C1C]',
                      ].join(' ')}
                    >
                      {checkoutLoadingKey === `${tier.id}-stripe` ? 'Redirecting...' : 'Pay with Stripe'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlanCheckout(tier.id, 'upi')}
                      disabled={checkoutLoadingKey !== null || currency !== 'INR'}
                      title={currency !== 'INR' ? 'UPI is available for INR pricing only.' : ''}
                      className="w-full rounded-md border border-[#2A2A2A] px-4 py-2 text-sm font-semibold text-[#F0F0F0] transition-colors duration-200 hover:border-[#3A3A3A] hover:bg-[#1C1C1C] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {checkoutLoadingKey === `${tier.id}-upi` ? 'Redirecting...' : 'Pay with UPI'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-[#555555]">
          All plans include SSL, data export, and no hidden fees.
        </p>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold">Frequently Asked Questions</h2>
          <div className="mx-auto mt-6 max-w-3xl space-y-3">
            {FAQS.map((faq, index) => {
              const open = openFaqIndex === index;
              return (
                <div key={faq.question} className="rounded-lg border border-[#2A2A2A] bg-[#141414]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setOpenFaqIndex(open ? null : index)}
                  >
                    <span className="text-sm font-medium text-[#F0F0F0]">{faq.question}</span>
                    <ChevronDown
                      className={[
                        'h-4 w-4 text-[#888888] transition-transform duration-200',
                        open ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </button>
                  {open ? <p className="border-t border-[#2A2A2A] px-4 py-3 text-sm text-[#888888]">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16 rounded-lg border border-[#2A2A2A] bg-[#141414] px-6 py-10 text-center">
          <h3 className="text-2xl font-semibold text-[#F0F0F0]">Start free. Upgrade when you are ready.</h3>
          <p className="mt-2 text-sm text-[#555555]">No credit card required</p>
          <Link
            href="/register"
            className="mt-5 inline-flex rounded-md bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#E8C97A]"
          >
            Get Started
          </Link>
        </section>
      </div>
    </div>
  );
}
