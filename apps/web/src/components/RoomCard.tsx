import React from 'react';
import { Card, CardContent } from "@/components/ui/card"; // Check ui folder, assumed exists as Card
import { Users, ChevronRight } from 'lucide-react';
import type { Room } from '@holdem/shared-types';

interface RoomCardProps {
  room: Room;
  onClick: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick }) => {
  return (
    <Card 
      onClick={onClick}
      className="bg-card border-border mb-3 cursor-pointer hover:border-primary/50 transition-colors group active:scale-[0.98]"
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-foreground font-semibold text-base mb-1 group-hover:text-primary transition-colors">
            {room.name}
          </h3>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
              ${room.smallBlind}/${room.bigBlind}
            </span>
            <span className="flex items-center text-xs">
              <Users size={12} className="mr-1" />
              {room.playersCount}/{room.maxPlayers}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomCard;