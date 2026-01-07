import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Match } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  index?: number;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onClick, index = 0 }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/match/${match.id}`);
    }
  };

  return (
    <div 
      className="relative py-4"
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
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
            <div className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              {match.homeScore}-{match.awayScore}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              {match.group && (
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  {match.group}
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-medium">
                {match.status === 'live' ? 'Group Stage' : match.status === 'upcoming' ? 'Upcoming' : 'Finished'}
              </span>
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
};

export default MatchCard;
