import React from 'react';
import { Home, User, Hexagon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Don't show nav in game room 
  if (currentPath === '/game') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border mobile-container shadow-custom">
      <div className="flex justify-around items-center h-16">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentPath === '/' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Home size={24} />
          <span className="text-xs font-medium">大厅</span>
        </Link>
        
        {/* Decorative center piece */}
        <div className="-mt-8">
           <div className="bg-primary/20 p-2 rounded-full border-4 border-background">
             <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg">
                <Hexagon size={28} />
             </div>
           </div>
        </div>

        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${
            currentPath === '/profile' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <User size={24} />
          <span className="text-xs font-medium">我的</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;