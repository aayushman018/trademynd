'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../dashboard/layout';
import { TelegramSend, TelegramAttach, TelegramMenu, TelegramCheck, TelegramDoubleCheck, TelegramMic, TelegramBack } from '@/components/ui/TelegramIcons';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI trading assistant. How can I help you analyze the market or execute trades today?',
      timestamp: new Date(),
      status: 'read'
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate status update
    setTimeout(() => {
      setMessages((prev) => 
          prev.map(m => m.id === userMessage.id ? { ...m, status: 'delivered' } as Message : m)
        );
      }, 1000);

    try {
      const response = await api.post('/chat/send', { message: userMessage.content });
      
      // Simulate typing delay
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
          status: 'read'
        };

        setMessages((prev) => {
          const updatedMessages = prev.map(m => m.id === userMessage.id ? { ...m, status: 'read' } as Message : m);
          return updatedMessages.concat(botMessage);
        });
        setIsTyping(false);
      }, 1500);

    } catch (error: any) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error?.response?.data?.detail || 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        status: 'read'
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <DashboardLayout fullWidth>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1F2F42] bg-[#0e1621]">
        <div className="z-10 flex h-[56px] items-center justify-between border-b border-[#1F2F42] bg-[#17212b] px-4">
          <div className="flex items-center gap-4">
            <TelegramBack className="cursor-pointer text-white" />
            <div className="flex flex-col">
              <span className="text-[16px] font-medium leading-tight text-white">Trademynd Bot</span>
              <span className="text-[13px] leading-tight text-[#6c7883]">bot</span>
            </div>
          </div>
          <TelegramMenu className="cursor-pointer text-[#6c7883]" />
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0e1621] p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2b5278]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'mb-1 flex w-full',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'relative max-w-[85%] break-words px-3 py-[6px] text-[15px] leading-snug shadow-sm',
                  message.role === 'user'
                    ? 'rounded-[8px] rounded-br-none bg-[#2b5278] text-white'
                    : 'rounded-[8px] rounded-bl-none bg-[#182533] text-white'
                )}
              >
                <span className="mb-1 block">{message.content}</span>
                <div className="float-right ml-2 mt-1 flex items-center justify-end gap-1">
                  <span className="select-none text-[11px] text-[#6c7883]">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === 'user' ? (
                    <span className="text-[#6c7883]">
                      {message.status === 'sent' ? <TelegramCheck className="h-3 w-3" /> : null}
                      {message.status === 'delivered' ? <TelegramDoubleCheck className="h-3 w-3" /> : null}
                      {message.status === 'read' ? (
                        <TelegramDoubleCheck className="h-3 w-3 text-[#4ea4f5]" />
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="mb-1 flex w-full justify-start">
              <div className="flex items-center gap-1 rounded-[8px] rounded-bl-none bg-[#182533] px-4 py-3">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6c7883] [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6c7883] [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6c7883]" />
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-end gap-2 border-t border-[#1F2F42] bg-[#17212b] p-2">
          <TelegramAttach className="mb-2 cursor-pointer text-[#6c7883] transition-colors hover:text-[#828e99]" />
          <form onSubmit={handleSubmit} className="flex flex-1 items-end gap-2">
            <div className="relative min-h-[40px] max-h-[120px] flex-1 rounded-lg bg-[#17212b]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message..."
                className="h-full w-full resize-none bg-transparent px-2 py-2 text-[16px] text-white placeholder-[#6c7883] focus:outline-none"
                disabled={isTyping}
              />
            </div>
            {input.trim() ? (
              <button
                type="submit"
                disabled={isTyping}
                className="flex h-[48px] w-[48px] items-center justify-center rounded-full transition-colors hover:bg-[#2b5278]/20"
              >
                <TelegramSend className="h-7 w-7 text-[#4ea4f5]" />
              </button>
            ) : (
              <div className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#2b5278]/20">
                <TelegramMic className="h-7 w-7 text-[#6c7883]" />
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
