import React, { memo } from 'react';
import { LeagueGroup } from '@/types/league';
import MatchCard from '@/components/MatchCard';

interface LeagueSectionProps {
  leagueGroup: LeagueGroup;
  index: number;
}

export const LeagueSection: React.FC<LeagueSectionProps> = memo(({ leagueGroup, index }) => {
  return (
    <div className="mb-6">
      {/* League Header - Black Background */}
      <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-black rounded-lg">
        {leagueGroup.league.logo && (
          <img 
            src={leagueGroup.league.logo} 
            alt={leagueGroup.league.name}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">{leagueGroup.league.name}</h3>
          {leagueGroup.league.country && (
            <p className="text-xs text-gray-400">{leagueGroup.league.country}</p>
          )}
        </div>
        <span className="text-xs text-white bg-gray-800 px-2 py-1 rounded-full">
          {leagueGroup.matches.length}
        </span>
      </div>

      {/* Matches in this league */}
      <div className="space-y-3">
        {leagueGroup.matches.map((match, matchIndex) => (
          <MatchCard 
            key={match.id} 
            match={match} 
            index={index * 100 + matchIndex}
          />
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if league ID or match count changes
  return (
    prevProps.leagueGroup.league.id === nextProps.leagueGroup.league.id &&
    prevProps.leagueGroup.matches.length === nextProps.leagueGroup.matches.length &&
    prevProps.leagueGroup.matches.every((match, i) => {
      const nextMatch = nextProps.leagueGroup.matches[i];
      return match.id === nextMatch?.id && 
             match.homeScore === nextMatch?.homeScore && 
             match.awayScore === nextMatch?.awayScore &&
             match.status === nextMatch?.status;
    })
  );
});

LeagueSection.displayName = 'LeagueSection';

export default LeagueSection;

