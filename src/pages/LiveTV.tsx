import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, Play } from 'lucide-react';
import { liveMatches } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';

export const LiveTVPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 pt-12">
      <div className="flex items-center gap-3 mb-6">
        <Tv className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">Live TV</h1>
      </div>

      <p className="text-muted-foreground mb-6">Watch live matches now</p>

      <div className="space-y-2">
        {liveMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => navigate(`/match/${match.id}`)}
            className="bg-card rounded-lg p-2.5 cursor-pointer hover:bg-card/80 transition-all border border-border/30"
          >
            <div className="flex items-center justify-between gap-2">
              {/* Left side: Live indicator */}
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-semibold text-red-500">LIVE</span>
              </div>

              {/* Competition */}
              <span className="text-[10px] text-muted-foreground flex-1">{match.competition}</span>

              {/* Teams and Scores */}
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <TeamLogo team={match.homeTeam} size="sm" />
                  <span className="text-xs font-medium">{match.homeTeam.shortName}</span>
                  <span className="text-xs font-bold">{match.homeScore}</span>
                </div>

                <span className="text-[10px] text-muted-foreground">-</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">{match.awayScore}</span>
                  <span className="text-xs font-medium">{match.awayTeam.shortName}</span>
                  <TeamLogo team={match.awayTeam} size="sm" />
                </div>
              </div>

              {/* Minute */}
              <span className="text-[10px] text-muted-foreground">{match.minute}'</span>

              {/* Play button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/match/${match.id}`);
                }}
                className="bg-primary text-primary-foreground p-1.5 rounded-full hover:bg-primary/90 transition-colors"
              >
                <Play size={12} fill="currentColor" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveTVPage;

