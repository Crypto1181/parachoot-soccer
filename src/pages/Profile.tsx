import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

const menuItems = [
  { icon: User, label: 'Edit Profile' },
  { icon: Bell, label: 'Notifications' },
  { icon: Shield, label: 'Privacy & Security' },
  { icon: HelpCircle, label: 'Help & Support' },
];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 pt-12">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-primary-foreground">
          U
        </div>
        <div>
          <h2 className="text-xl font-semibold">User</h2>
          <p className="text-muted-foreground text-sm">user@example.com</p>
        </div>
      </div>

      <div className="space-y-2 mb-8">
        {menuItems.map((item) => (
          <button key={item.label} className="w-full bg-card rounded-xl p-4 flex items-center justify-between border border-border/30 hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-3">
              <item.icon size={20} className="text-muted-foreground" />
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      <button 
        onClick={() => navigate('/login')}
        className="w-full bg-destructive/10 text-destructive rounded-xl p-4 flex items-center justify-center gap-2 font-medium hover:bg-destructive/20 transition-colors"
      >
        <LogOut size={20} />
        Sign Out
      </button>
    </div>
  );
};

export default ProfilePage;
