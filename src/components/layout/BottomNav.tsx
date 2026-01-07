import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Tv, Compass, User } from 'lucide-react';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/live-tv', icon: Tv, label: 'TV Live' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/30">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
                          (item.to === '/home' && location.pathname.startsWith('/match/'));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon 
                size={22} 
                className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} 
              />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
