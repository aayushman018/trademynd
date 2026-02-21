'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const isGoogleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);

      const response = await api.post('/login/access-token', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      login(response.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setError('Google login failed');
      return;
    }
    try {
        const response = await api.post('/login/google', { token: credentialResponse.credential });
        login(response.data.access_token);
    } catch (err: any) {
        console.error("Google Login Error:", err);
        setError(err?.response?.data?.detail || 'Google login failed');
    }
  };

  return (
    <div className="animate-in fade-in min-h-screen bg-[#0C0C0C] px-4 py-12 duration-500 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-8 rounded-lg border border-[#2A2A2A] bg-[#141414] p-8">
        <div>
          <p className="text-center text-xs uppercase tracking-[0.16em] text-[#888888]">Trading Panel</p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-[#F0F0F0]">
            Sign in to TradeMynd
          </h2>
          <p className="mt-2 text-center text-sm text-[#888888]">
            Or{' '}
            <Link href="/register" className="font-medium text-[#C9A84C] transition-colors duration-200 hover:text-[#E8C97A]">
              start your 14-day free trial
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-[#2A2A2A] bg-[#0C0C0C] text-[#F0F0F0] placeholder:text-[#555555] focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40"
            />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-[#2A2A2A] bg-[#0C0C0C] text-[#F0F0F0] placeholder:text-[#555555] focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40"
            />
          </div>

          {error && (
            <div className="rounded-md border border-[#C0504A]/40 bg-[#C0504A]/10 p-2 text-center text-sm text-[#C0504A]">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="h-11 w-full bg-[#C9A84C] text-base font-semibold text-black shadow-none transition-colors duration-200 hover:bg-[#E8C97A]"
              isLoading={loading}
            >
              Sign in
            </Button>
          </div>
        </form>

        {isGoogleConfigured ? (
        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#2A2A2A]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#141414] px-2 text-[#555555]">Or continue with</span>
                </div>
            </div>
            <div className="mt-6 flex justify-center">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Login Failed')}
                    theme="outline" 
                    text="continue_with"
                    shape="pill"
                    width="100%"
                />
            </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}
