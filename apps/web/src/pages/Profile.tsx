import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, ChevronRight, Wallet, History, Trophy, Star } from 'lucide-react';

const Profile: React.FC = () => {
  return (
    <div className="mobile-container pb-20 pt-8 px-4 flex flex-col h-full bg-background overflow-y-auto no-scrollbar">
      
      {/* Header Actions */}
      <div className="flex justify-end mb-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Settings size={24} />
        </Button>
      </div>

      {/* User Info Card */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-yellow-600">
            <Avatar className="w-full h-full border-4 border-background">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-2xl font-bold">H</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute bottom-0 right-0 bg-primary text-black text-xs font-bold px-2 py-0.5 rounded-full border-2 border-background">
            LV. 88
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-foreground">Hero Player</h2>
        <p className="text-sm text-muted-foreground mt-1">ID: 952788</p>
      </div>

      {/* Assets Card */}
      <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-none mb-6 shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
               <p className="text-muted-foreground text-xs mb-1">总资产 (USD)</p>
               <h3 className="text-3xl font-mono font-bold text-primary">$ 1,245,600</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <Wallet className="text-primary" size={20} />
            </div>
          </div>
          <div className="flex gap-3">
             <Button className="flex-1 bg-primary text-black font-bold hover:bg-yellow-400">充值</Button>
             <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">提现</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-card border-none">
          <CardContent className="p-4 flex flex-col items-center justify-center">
             <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
               <Trophy size={16} className="text-red-500" />
             </div>
             <span className="text-muted-foreground text-xs">胜率</span>
             <span className="text-foreground font-bold text-lg">32.5%</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-none">
          <CardContent className="p-4 flex flex-col items-center justify-center">
             <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
               <History size={16} className="text-blue-500" />
             </div>
             <span className="text-muted-foreground text-xs">总局数</span>
             <span className="text-foreground font-bold text-lg">1,402</span>
          </CardContent>
        </Card>
      </div>

      {/* Menu List */}
      <div className="space-y-2">
        {[
           { icon: <Star size={18} />, label: "我的收藏", val: "3" },
           { icon: <History size={18} />, label: "牌谱记录" },
           { icon: <Wallet size={18} />, label: "资金明细" },
        ].map((item, i) => (
          <button key={i} className="w-full flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted/50 transition-colors group">
            <div className="flex items-center space-x-3">
               <span className="text-muted-foreground group-hover:text-primary transition-colors">{item.icon}</span>
               <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center space-x-2">
               {item.val && <span className="text-xs text-muted-foreground">{item.val}</span>}
               <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Profile;