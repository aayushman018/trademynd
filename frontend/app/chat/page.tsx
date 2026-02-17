'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../dashboard/layout';
import { TelegramSend, TelegramAttach, TelegramMenu, TelegramCheck, TelegramDoubleCheck, TelegramMic, TelegramBack } from '@/components/ui/TelegramIcons';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Head from 'next/head';

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

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        status: 'read'
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <DashboardLayout>
      {/* Load Roboto Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
      `}</style>

      <div className="flex justify-center items-start pt-4 h-full bg-[#0e1621] font-roboto">
        <div className="w-full max-w-md h-[80vh] flex flex-col bg-[#0e1621] rounded-lg overflow-hidden shadow-xl border border-[#0e1621]">
          {/* Telegram Header */}
          <div className="h-[56px] bg-[#17212b] flex items-center px-4 justify-between shadow-sm z-10">
            <div className="flex items-center gap-4">
              <TelegramBack className="text-white cursor-pointer" />
              <div className="flex flex-col">
                <span className="text-white font-medium text-[16px] leading-tight">Trademynd Bot</span>
                <span className="text-[#6c7883] text-[13px] leading-tight">bot</span>
              </div>
            </div>
            <TelegramMenu className="text-[#6c7883] cursor-pointer" />
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-[4px] bg-[#0e1621] scrollbar-thin scrollbar-thumb-[#2b5278] scrollbar-track-transparent">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-full mb-1",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[85%] px-3 py-[6px] text-[15px] leading-snug break-words shadow-sm",
                    message.role === 'user'
                      ? "bg-[#2b5278] text-white rounded-[8px] rounded-br-none"
                      : "bg-[#182533] text-white rounded-[8px] rounded-bl-none"
                  )}
                >
                  <span className="block mb-1">{message.content}</span>
                  <div className="flex items-center justify-end gap-1 float-right mt-1 ml-2">
                    <span className="text-[11px] text-[#6c7883] select-none">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.role === 'user' && (
                      <span className="text-[#6c7883]">
                        {message.status === 'sent' && <TelegramCheck className="w-3 h-3" />}
                        {message.status === 'delivered' && <TelegramDoubleCheck className="w-3 h-3" />}
                        {message.status === 'read' && <TelegramDoubleCheck className="w-3 h-3 text-[#4ea4f5]" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start w-full mb-1">
                <div className="bg-[#182533] rounded-[8px] rounded-bl-none px-4 py-3 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[#6c7883] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#6c7883] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#6c7883] rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-[#17212b] p-2 flex items-end gap-2 border-t border-[#0e1621]">
            <TelegramAttach className="text-[#6c7883] mb-2 cursor-pointer hover:text-[#828e99] transition-colors" />
            <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
              <div className="flex-1 bg-[#17212b] min-h-[40px] max-h-[120px] rounded-lg relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message..."
                  className="w-full h-full bg-transparent text-white placeholder-[#6c7883] text-[16px] px-2 py-2 focus:outline-none resize-none"
                  disabled={isTyping}
                />
              </div>
              {input.trim() ? (
                <button 
                  type="submit" 
                  disabled={isTyping}
                  className="w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-[#2b5278]/20 transition-colors"
                >
                  <TelegramSend className="text-[#4ea4f5] w-7 h-7" />
                </button>
              ) : (
                <div className="w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-[#2b5278]/20 transition-colors cursor-pointer">
                  <TelegramMic className="text-[#6c7883] w-7 h-7" />
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
