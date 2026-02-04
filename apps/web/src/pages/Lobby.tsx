import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomCard from '@/components/RoomCard';
import type { Room } from '@holdem/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Bell } from 'lucide-react';

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const [rooms] = useState<Room[]>([
    { id: '1', name: "新手训练营", smallBlind: 1, bigBlind: 2, playersCount: 5, maxPlayers: 9, status: 'playing' },
    { id: '2', name: "高额现金桌", smallBlind: 10, bigBlind: 20, playersCount: 3, maxPlayers: 6, status: 'waiting' },
    { id: '3', name: "好友私密局", smallBlind: 5, bigBlind: 10, playersCount: 8, maxPlayers: 9, status: 'playing' },
    { id: '4', name: "夜间疯狂桌", smallBlind: 2, bigBlind: 4, playersCount: 1, maxPlayers: 6, status: 'waiting' },
    { id: '5', name: "周末锦标赛", smallBlind: 50, bigBlind: 100, playersCount: 6, maxPlayers: 9, status: 'playing' },
  ]);

  const handleJoinRoom = (roomId: string) => {
    console.log(`Joining room ${roomId}`);
    navigate('/game');
  };

  return (
    <div className="pb-20 pt-4 px-4 mobile-container flex flex-col h-full bg-background/95">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-200 bg-clip-text text-transparent">
            德州扑克
          </h1>
          <p className="text-xs text-muted-foreground">欢迎回来, 赌神!</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Button variant="outline" size="icon" className="rounded-full w-9 h-9 border-border bg-card">
              <Bell size={16} className="text-foreground" />
            </Button>
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
          </div>
          <Button size="sm" className="bg-primary text-black hover:bg-yellow-400 font-bold px-3">
            <Plus size={16} className="mr-1" /> 创建
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
        <Input 
          placeholder="搜索房间号或名称..." 
          className="pl-9 bg-card border-none text-sm h-10 ring-offset-background focus-visible:ring-primary/50"
        />
      </div>

      {/* Categories */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
        {['全部', '现金局', '锦标赛', '急速', '好友房'].map((cat, i) => (
          <button 
            key={cat}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              i === 0 
                ? 'bg-primary text-black' 
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto space-y-1 pb-4 no-scrollbar">
        <div className="flex justify-between items-center mb-2 px-1">
          <h2 className="text-sm font-semibold text-foreground">热门房间</h2>
          <span className="text-xs text-primary cursor-pointer">查看全部</span>
        </div>
        
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} onClick={() => handleJoinRoom(room.id)} />
        ))}
      </div>
    </div>
  );
};

export default Lobby;