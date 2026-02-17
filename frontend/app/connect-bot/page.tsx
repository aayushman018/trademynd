'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import DashboardLayout from '../dashboard/layout'; // Re-use layout or just wrap in layout in app router if parallel routes used

export default function ConnectBotPage() {
  const { user } = useAuth();

  const copyToClipboard = () => {
    if (user?.user_id) {
      navigator.clipboard.writeText(`/connect ${user.user_id}`);
      alert('Command copied to clipboard!');
    }
  };

  return (
    <DashboardLayout>
        <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Connect Telegram Bot</h1>
        
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
                Follow these steps to link your account
            </h3>
            <div className="mt-5 space-y-8">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        1
                        </div>
                    </div>
                    <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900">Open Telegram</h4>
                        <p className="mt-1 text-gray-500">
                        Search for <span className="font-mono font-bold">@TradeJournalBot</span> on Telegram or click the button below.
                        </p>
                        <div className="mt-3">
                            <a 
                                href="https://t.me/TradeJournalBot" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                                Open Telegram Bot
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        2
                        </div>
                    </div>
                    <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900">Send Connection Command</h4>
                        <p className="mt-1 text-gray-500">
                        Send the following command to the bot to link your account securely.
                        </p>
                        <div className="mt-3 flex items-center">
                            <code className="bg-gray-100 px-4 py-2 rounded text-lg font-mono text-gray-800 border border-gray-300">
                                /connect {user?.user_id}
                            </code>
                            <Button 
                                onClick={copyToClipboard}
                                variant="outline" 
                                className="ml-4"
                            >
                                Copy Command
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        3
                        </div>
                    </div>
                    <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900">Start Logging!</h4>
                        <p className="mt-1 text-gray-500">
                        Once connected, you can send screenshots, voice notes, or text to the bot, and they will appear in your dashboard instantly.
                        </p>
                    </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    </DashboardLayout>
  );
}
