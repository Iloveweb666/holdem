import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PlayingCard from './PlayingCard';
import type { Player } from '@holdem/shared-types';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  position: 'bottom' | 'top' | 'left' | 'right';
  isActive?: boolean;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, position, isActive }) => {
  const isBottom = position === 'bottom';

  // Position specific styles
  const containerClasses = {
    bottom: "flex-col-reverse bottom-4 left-1/2 transform -translate-x-1/2",
    top: "flex-col top-4 left-1/2 transform -translate-x-1/2",
    left: "flex-col left-2 top-1/2 transform -translate-y-1/2",
    right: "flex-col right-2 top-1/2 transform -translate-y-1/2",
  };

  return (
    <div className={cn("absolute flex items-center gap-2", containerClasses[position])}>
      
      {/* Cards for Hero (Bottom) or Showdown */}
      {player.cards && (
        <div className={cn(
          "flex -space-x-4 transition-all duration-300", 
          isBottom ? "-mt-8 mb-2 transform bg-black/40 p-2 rounded-xl backdrop-blur-sm" : "opacity-0 scale-75"
        )}>
          {player.cards.map((card, i) => (
            <PlayingCard 
              key={i} 
              card={card} 
              size={isBottom ? 'lg' : 'sm'} 
              className={cn("border border-gray-300 transform", i===1 ? "rotate-3 translate-y-1" : "-rotate-3 translate-x-1")}
            />
          ))}
        </div>
      )}

      {/* Opponent Cards (Hidden) */}
      {!isBottom && player.status !== 'folded' && (
        <div className="flex -space-x-1 mb-1">
          <PlayingCard card="Ah" hidden size="sm" />
          <PlayingCard card="Ah" hidden size="sm" />
        </div>
      )}

      {/* Avatar & Info */}
      <div className="relative">
        <div className={cn(
          "rounded-full p-1 transition-all duration-500",
          player.isTurn ? "bg-primary shadow-[0_0_10px_2px_rgba(234,179,8,0.6)]" : "bg-card/50"
        )}>
          <Avatar className="w-14 h-14 border-2 border-card">
            <AvatarImage src={player.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">
              {player.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Dealer Button */}
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 bg-white text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border border-gray-300 shadow-sm z-10">
            D
          </div>
        )}

        {/* Winner Crown */}
        {player.status === 'active' && player.bet && player.bet > 1000 && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-primary animate-bounce">
            <Crown size={20} fill="currentColor" />
          </div>
        )}
      </div>

      {/* Stats Box */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-2 py-1 min-w-[80px] text-center shadow-custom mt-1">
        <div className="text-xs text-white opacity-80 font-medium truncate max-w-[80px]">
          {player.name}
        </div>
        <div className="text-xs text-primary font-bold flex items-center justify-center gap-1">
          <span>$</span>
          {player.chips.toLocaleString()}
        </div>
      </div>
      
      {/* Current Bet Bubble */}
      {player.bet && player.bet > 0 && (
        <div className={cn(
          "absolute bg-yellow-100 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-md z-20 whitespace-nowrap",
          isBottom ? "-top-8 left-1/2 -translate-x-1/2" : "top-10 left-1/2 -translate-x-1/2"
        )}>
           +${player.bet}
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;