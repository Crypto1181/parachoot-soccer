import React from 'react';
import { Search, TrendingUp, Trophy, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { teams } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';

const categories = [
  { icon: Trophy, label: 'Leagues', color: 'bg-primary' },
  { icon: Users, label: 'Teams', color: 'bg-accent' },
  { icon: TrendingUp, label: 'Trending', color: 'bg-destructive' },
];

export const ExplorePage: React.FC = () => {
  return (
    <div className="min-h-screen p-4 pt-12">
      <h1 className="text-2xl font-bold mb-6">Explore</h1>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input placeholder="Search teams, leagues..." className="pl-11 h-12 bg-card border-border/50 rounded-xl" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {categories.map((cat) => (
          <div key={cat.label} className="bg-card rounded-2xl p-4 text-center border border-border/30">
            <div className={`w-12 h-12 ${cat.color} rounded-xl mx-auto mb-2 flex items-center justify-center`}>
              <cat.icon size={24} className="text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">{cat.label}</span>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-4">Popular Leagues</h2>
      <div className="space-y-3 mb-8">
        {['Champions League', 'Premier League', 'La Liga', 'Serie A'].map((league) => (
          <div key={league} className="bg-card rounded-xl p-4 flex items-center gap-3 border border-border/30">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">⚽</div>
            <span className="font-medium">{league}</span>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-4">Popular Teams</h2>
      <div className="grid grid-cols-2 gap-3">
        {teams.slice(0, 8).map((team) => (
          <div key={team.id} className="bg-card rounded-xl p-4 flex items-center gap-3 border border-border/30">
            <TeamLogo team={team} size="md" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{team.name}</span>
              <span className="text-xs text-muted-foreground">{team.shortName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplorePage;
