import React from 'react';
import { cn } from '@/lib/utils';
import { Send, Paperclip, MoreVertical, Check, CheckCheck, Mic, ArrowLeft } from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const TelegramSend = ({ className, ...props }: IconProps) => (
  <Send className={cn("w-6 h-6", className)} {...props} />
);

export const TelegramAttach = ({ className, ...props }: IconProps) => (
  <Paperclip className={cn("w-6 h-6", className)} {...props} />
);

export const TelegramMenu = ({ className, ...props }: IconProps) => (
  <MoreVertical className={cn("w-6 h-6", className)} {...props} />
);

export const TelegramCheck = ({ className, ...props }: IconProps) => (
  <Check className={cn("w-4 h-4", className)} {...props} />
);

export const TelegramDoubleCheck = ({ className, ...props }: IconProps) => (
  <CheckCheck className={cn("w-4 h-4", className)} {...props} />
);

export const TelegramMic = ({ className, ...props }: IconProps) => (
  <Mic className={cn("w-6 h-6", className)} {...props} />
);

export const TelegramBack = ({ className, ...props }: IconProps) => (
  <ArrowLeft className={cn("w-6 h-6", className)} {...props} />
);
