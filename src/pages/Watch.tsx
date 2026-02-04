import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, Maximize, Settings } from 'lucide-react';
import { liveMatches } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';

export const WatchPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const match = liveMatches.find((m) => m.id === id) || liveMatches[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Video Player */}
      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-background">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute z-10 p-2 glass rounded-full safe-area-top"
          style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))', left: 'max(1rem, env(safe-area-inset-left, 1rem))' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto animate-pulse">
              <div className="w-0 h-0 border-t-8 border-b-8 border-l-12 border-transparent border-l-primary ml-1" />
            </div>
            <p className="text-muted-foreground text-sm">Live Stream</p>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-live px-2 py-0.5 rounded text-xs font-bold">LIVE</span>
              <span className="text-sm">{match.minute}'</span>
            </div>
            <div className="flex items-center gap-4">
              <Volume2 size={20} />
              <Settings size={20} />
              <Maximize size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Match Info */}
      <div className="pt-4 pb-4 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center flex-1">
            <TeamLogo team={match.homeTeam} size="xl" className="mb-3" />
            <span className="font-semibold text-base">{match.homeTeam.name}</span>
            <span className="text-xs text-muted-foreground mt-1">{match.homeTeam.shortName}</span>
          </div>
          <div className="text-center px-4">
            <div className="text-4xl font-extrabold mb-2">{match.homeScore} - {match.awayScore}</div>
            <span className="text-live text-sm font-semibold">{match.minute}'</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <TeamLogo team={match.awayTeam} size="xl" className="mb-3" />
            <span className="font-semibold text-base">{match.awayTeam.name}</span>
            <span className="text-xs text-muted-foreground mt-1">{match.awayTeam.shortName}</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <h3 className="font-semibold mb-3">Match Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>33%</span><span>Possession</span><span>67%</span></div>
            <div className="flex justify-between"><span>5</span><span>Shots</span><span>8</span></div>
            <div className="flex justify-between"><span>301</span><span>Passes</span><span>601</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
