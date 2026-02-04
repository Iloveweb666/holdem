import React from 'react';
import { cn } from '@/lib/utils';
import { Diamond, Heart, Club, Spade } from 'lucide-react';

type Suit = 'd' | 'h' | 'c' | 's'; // Diamond, Heart, Club, Spade

interface PlayingCardProps {
  card: string; // e.g., "As", "10d"
  hidden?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlayingCard: React.FC<PlayingCardProps> = ({ 
  card, 
  hidden = false,
  className,
  size = 'md' 
}) => {
  const rank = card.slice(0, -1);
  const suitChar = card.slice(-1).toLowerCase() as Suit;
  
  const getSuitIcon = (s: Suit) => {
    switch(s) {
      case 'd': return <Diamond size={12} className="fill-current text-red-500" />;
      case 'h': return <Heart size={12} className="fill-current text-red-500" />;
      case 'c': return <Club size={12} className="fill-current text-black" />;
      case 's': return <Spade size={12} className="fill-current text-black" />;
      default: return null;
    }
  };

  const getColor = (s: Suit) => {
    return (s === 'd' || s === 'h') ? 'text-red-600' : 'text-black';
  };

  const sizeClasses = {
    sm: 'w-8 h-12 text-xs',
    md: 'w-10 h-14 text-sm',
    lg: 'w-14 h-20 text-lg',
  };

  if (hidden) {
    return (
      <div className={cn(
        "bg-blue-900 border-2 border-white rounded-md flex items-center justify-center relative overflow-hidden shadow-sm", 
        sizeClasses[size],
        className
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-700 via-blue-900 to-black opacity-80" />
        <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diag-diamonds-light.png')]" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-md flex flex-col items-center justify-between p-1 shadow-sm select-none", 
      sizeClasses[size],
      getColor(suitChar),
      className
    )}>
      <div className="self-start leading-none font-bold">
        {rank}
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {getSuitIcon(suitChar)}
      </div>
      <div className="self-end rotate-180 leading-none font-bold">
        {rank}
      </div>
    </div>
  );
};

export default PlayingCard;