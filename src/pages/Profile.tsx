import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Settings, Share2, Star, Mail, Crown, History, Tv } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { teams } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Success',
        description: 'Signed out successfully',
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'user@example.com';
  const userInitial = userName.charAt(0).toUpperCase();

  const MenuItem = ({ icon: Icon, label, onClick, showArrow = true, rightElement, description }: any) => (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted rounded-lg group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div>
          <span className="font-medium block">{label}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      </div>
      {rightElement}
      {showArrow && !rightElement && <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background safe-area-top px-4 py-3 flex justify-between items-center shadow-sm border-b border-border/10">
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="pt-4 pb-24 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
      {/* Profile Card */}
      <Card className="mb-8 border-border/50 shadow-md overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
        
        <div className="h-28 bg-gradient-to-r from-primary via-primary/80 to-accent relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        </div>
        
        <CardContent className="pt-0 relative px-6">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <Avatar className="w-24 h-24 border-4 border-card shadow-xl ring-2 ring-primary/10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-bold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="pb-4">
            <h2 className="text-2xl font-bold mb-0.5">{userName}</h2>
            <p className="text-muted-foreground text-sm mb-4">{userEmail}</p>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 pl-1">
            Account
          </h3>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <MenuItem 
                icon={User} 
                label="Personal Information" 
                description="Update your profile details"
                onClick={() => navigate('/profile/edit')}
              />
              <Separator className="bg-border/50" />
              <MenuItem 
                icon={History} 
                label="Watch History" 
                description="Recently viewed matches"
                onClick={() => toast({ title: 'Coming Soon', description: 'Watch History is under development.' })}
              />
              <Separator className="bg-border/50" />
              <MenuItem 
                icon={Bell} 
                label="Notifications" 
                showArrow={false}
                rightElement={<Switch defaultChecked />}
              />
            </CardContent>
          </Card>
        </section>

        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 pl-1">
            Support & About
          </h3>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <MenuItem icon={HelpCircle} label="Help Center" onClick={() => toast({ title: 'Coming Soon', description: 'Help Center is under development.' })} />
              <Separator className="bg-border/50" />
              <MenuItem icon={Shield} label="Security & Privacy" onClick={() => toast({ title: 'Coming Soon', description: 'Security settings are under development.' })} />
              <Separator className="bg-border/50" />
              <MenuItem icon={Share2} label="Share App" onClick={() => toast({ title: 'Coming Soon', description: 'Sharing is under development.' })} />
              <Separator className="bg-border/50" />
              <MenuItem icon={Star} label="Rate Us" onClick={() => toast({ title: 'Coming Soon', description: 'Rating is under development.' })} />
            </CardContent>
          </Card>
        </section>

        <Button 
          variant="destructive" 
          className="w-full h-14 rounded-xl gap-2 font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          onClick={handleSignOut}
        >
          <LogOut size={20} />
          Sign Out
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-4 pb-8">
          Version 1.0.0 • Build 2024
        </p>
      </div>
      </div>
    </div>
  );
};

export default ProfilePage;
