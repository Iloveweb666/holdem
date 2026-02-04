import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, Settings, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayerSeat from '@/components/PlayerSeat';
import PlayingCard from '@/components/PlayingCard';
import type { Player } from '@holdem/shared-types';

const GameRoom: React.FC = () => {
  const navigate = useNavigate();
  
  // Mock Game State
  const [pot, setPot] = useState(2450);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: "我 (Hero)", chips: 5400, position: 'bottom', avatar: "", cards: ["As", "Kd"], bet: 0, status: 'active', isTurn: true },
    { id: '2', name: "Tom", chips: 3200, position: 'left', avatar: "", bet: 50, status: 'active' },
    { id: '3', name: "Jerry", chips: 8900, position: 'top', avatar: "", isDealer: true, bet: 0, status: 'folded' },
    { id: '4', name: "Spike", chips: 1200, position: 'right', avatar: "", bet: 200, status: 'active' },
  ]);

  // Simulate dealing cards
  useEffect(() => {
    const timer = setTimeout(() => {
      setCommunityCards(["10h", "Jd", "Qc"]);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = (action: string) => {
    console.log(`User action: ${action}`);
    // Interaction logic would go here
  };

  return (
    <div className="mobile-container w-full h-screen bg-neutral-900 flex flex-col relative overflow-hidden">
      {/* Navbar */}
      <div className="absolute top-0 w-full z-40 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10"
          onClick={() => navigate('/')}
        >
          <ChevronLeft size={24} />
        </Button>
        <div className="flex items-center space-x-2">
          <span className="text-white/80 text-xs font-mono">Room #8821</span>
          <span className="text-primary text-xs border border-primary/30 px-1 rounded bg-black/40">
             $1/2
          </span>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8">
            <Info size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8">
            <Settings size={20} />
          </Button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
        {/* Table Felt */}
        <div className="relative w-[90%] aspect-[3/4] max-h-[600px] poker-green-bg rounded-[100px] border-[12px] border-[#252528] shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center">
          
          {/* Decorative Logo */}
          <div className="absolute top-1/4 opacity-10 pointer-events-none">
             <span className="text-4xl font-black text-black tracking-widest">POKER</span>
          </div>

          {/* Community Cards */}
          <div className="flex space-x-2 mb-8 z-10 h-16 items-center">
            {communityCards.map((card, i) => (
              <PlayingCard key={i} card={card} size="md" className="shadow-lg" />
            ))}
            {communityCards.length < 5 && (
              Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                <div key={i} className="w-10 h-14 rounded-md border-2 border-dashed border-white/20 bg-white/5" />
              ))
            )}
          </div>

          {/* Pot Display */}
          <div className="bg-black/40 px-4 py-1 rounded-full border border-primary/30 text-primary font-mono font-bold flex items-center gap-2 mb-4">
             <span className="text-xs text-primary/70">POT:</span>
             ${pot}
          </div>

          {/* Players */}
          {/* Note: In a real app, position logic matches seat index to UI position */}
          <PlayerSeat player={players[1]} position="left" />
          <PlayerSeat player={players[2]} position="top" />
          <PlayerSeat player={players[3]} position="right" />
          
        </div>
        
        {/* Hero Player (Absolute to container to overflow table slightly) */}
        <PlayerSeat player={players[0]} position="bottom" isActive={true} />
      </div>

      {/* Action Controls */}
      <div className="bg-[#121214] border-t border-white/10 p-4 pb-8 z-50">
        
        {/* Action Preset Buttons (Optional, hidden for now or small) */}
        <div className="flex justify-end space-x-2 mb-3 px-2">
           <button className="text-white/50 text-xs border border-white/20 rounded px-2 py-1">弃牌</button>
           <button className="text-white/50 text-xs border border-white/20 rounded px-2 py-1">过牌</button>
        </div>

        <div className="grid grid-cols-4 gap-3 h-12">
           <Button 
             variant="destructive" 
             className="h-full rounded-xl text-base font-bold bg-red-600 hover:bg-red-700"
             onClick={() => handleAction('fold')}
           >
             弃牌
           </Button>
           
           <Button 
             className="h-full rounded-xl text-base font-bold bg-slate-700 hover:bg-slate-600 col-span-1"
             onClick={() => handleAction('check')}
           >
             过牌
           </Button>

           <Button 
            className="h-full rounded-xl text-base font-bold bg-primary text-black hover:bg-yellow-400 col-span-2 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            onClick={() => handleAction('raise')}
           >
             加注 $200
           </Button>
        </div>
        
        {/* Slider for raise (Visual only for v1) */}
        <div className="mt-4 px-1 flex items-center gap-2 text-white/50 text-xs">
           <span>MIN</span>
           <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="w-1/4 h-full bg-primary"></div>
           </div>
           <span>MAX</span>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;