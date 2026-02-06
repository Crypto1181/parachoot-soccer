import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Match } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  index?: number;
}

export const MatchCard: React.FC<MatchCardProps> = memo(({ match, onClick, index = 0 }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/match/${match.id}`, { state: { match } });
    }
  };

  const handleStreamClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent match details navigation
    if (match.streamSources && match.streamSources.length > 0) {
      const firstSource = match.streamSources[0];
      const provider = firstSource.provider || 'westream';
      navigate(`/stream/${match.id}/${provider}/${firstSource.source}/${firstSource.id}`, { state: { match } });
    }
  };

  return (
    <div 
      className="relative py-4"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
    >
      {/* Simple Card with Green Border */}
      <div 
        onClick={handleClick}
        className="relative bg-white rounded-3xl p-6 border-2 border-green-500 cursor-pointer transition-all duration-300 hover:shadow-md"
      >
        {/* Simple Live Badge */}
        {match.status === 'live' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-black text-white text-sm font-bold px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              <span className="tracking-wide">Live</span>
            </div>
          </div>
        )}

        {/* Stream Play Button */}
        {match.streamSources && match.streamSources.length > 0 && match.status === 'live' && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={handleStreamClick}
              className="bg-red-500 hover:bg-red-600 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center border-2 border-white"
              title="Watch Live Stream"
            >
              <Play size={20} className="text-white ml-0.5" fill="currentColor" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex flex-col items-center w-1/3">
            <div className="w-16 h-16 rounded-full bg-white p-2 shadow-sm mb-3 flex items-center justify-center">
              <TeamLogo team={match.homeTeam} size="md" />
            </div>
            <span className="text-sm font-semibold text-gray-900 text-center leading-tight">
              {match.homeTeam.name}
            </span>
          </div>

          {/* Score & Info */}
          <div className="flex flex-col items-center justify-center w-1/3">
            {match.status === 'upcoming' && match.startTime ? (
              // Show time for upcoming matches
              <div className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                {match.startTime}
              </div>
            ) : (match.homeScore !== null && match.homeScore !== undefined) || (match.awayScore !== null && match.awayScore !== undefined) ? (
              // Show score for live/finished matches with scores
              <div className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </div>
            ) : (
              // Show VS for matches without scores (e.g. stream-only matches)
              <div className="text-3xl font-bold text-muted-foreground/50 mb-2 tracking-tight">
                VS
              </div>
            )}
            <div className="flex flex-col items-center gap-0.5">
              {match.status === 'live' && (
                <>
                  {match.minute !== undefined ? (
                    <span className="text-sm font-bold text-red-500">
                      {match.minute}'
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-red-500 animate-pulse">
                      Live
                    </span>
                  )}
                </>
              )}
              {match.status === 'finished' && (
                <span className="text-[10px] text-gray-400 font-medium">
                  Finished
                </span>
              )}
              {match.status === 'upcoming' && (
                <span className="text-[10px] text-gray-400 font-medium">
                  Upcoming
                </span>
              )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center w-1/3">
            <div className="w-16 h-16 rounded-full bg-white p-2 shadow-sm mb-3 flex items-center justify-center">
              <TeamLogo team={match.awayTeam} size="md" />
            </div>
            <span className="text-sm font-semibold text-gray-900 text-center leading-tight">
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Stadium */}
        {match.venue && (
          <div className="mt-4 text-center">
            <span className="text-[10px] text-gray-400 font-medium">
              {match.venue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.match.id === nextProps.match.id &&
    prevProps.match.homeScore === nextProps.match.homeScore &&
    prevProps.match.awayScore === nextProps.match.awayScore &&
    prevProps.match.status === nextProps.match.status &&
    prevProps.match.minute === nextProps.match.minute &&
    prevProps.match.startTime === nextProps.match.startTime
  );
});

MatchCard.displayName = 'MatchCard';

export default MatchCard;
