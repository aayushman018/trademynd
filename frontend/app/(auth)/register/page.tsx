'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const isGoogleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
  const [name, setName] = useState('');
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
      // 1. Register
      await api.post('/users', {
        email,
        password,
        name
      });

      // 2. Login automatically
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);

      const loginResponse = await api.post('/login/access-token', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      login(loginResponse.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setError('Google signup failed');
      return;
    }
    try {
      const response = await api.post('/login/google', { token: credentialResponse.credential });
      login(response.data.access_token);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Google signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-8 rounded-lg border border-[#2A2A2A] bg-[#141414] p-8">
        <div>
          <p className="text-center text-xs uppercase tracking-[0.16em] text-[#888888]">Trading Panel</p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-[#F0F0F0]">
            Create your TradeMynd account
          </h2>
          <p className="mt-2 text-center text-sm text-[#888888]">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#C9A84C] transition-colors duration-200 hover:text-[#E8C97A]">
              Sign in
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
             <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 border-[#2A2A2A] bg-[#0C0C0C] text-[#F0F0F0] placeholder:text-[#555555] focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40"
            />
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
              autoComplete="new-password"
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
              className="h-11 w-full bg-[#C9A84C] font-semibold text-black shadow-none transition-colors duration-200 hover:bg-[#E8C97A]"
              isLoading={loading}
            >
              Sign up
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
                onError={() => setError('Google signup failed')}
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
