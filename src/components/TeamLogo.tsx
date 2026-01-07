import React, { useState } from 'react';
import { Team } from '@/data/mockData';

interface TeamLogoProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const teamColors: Record<string, { bg: string; text: string }> = {
  'Chelsea': { bg: 'bg-blue-600', text: 'text-white' },
  'Paris Saint-Germain': { bg: 'bg-blue-500', text: 'text-white' },
  'RB Salzburg': { bg: 'bg-red-600', text: 'text-white' },
  'Real Madrid': { bg: 'bg-white', text: 'text-gray-900' },
  'Bayern Munich': { bg: 'bg-red-600', text: 'text-white' },
  'Manchester City': { bg: 'bg-blue-500', text: 'text-white' },
  'Liverpool': { bg: 'bg-red-600', text: 'text-white' },
  'Barcelona': { bg: 'bg-blue-600', text: 'text-white' },
  'Arsenal': { bg: 'bg-red-600', text: 'text-white' },
  'Juventus': { bg: 'bg-black', text: 'text-white' },
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export const TeamLogo: React.FC<TeamLogoProps> = ({ team, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const colors = teamColors[team.name] || { bg: 'bg-gray-500', text: 'text-white' };
  const sizeClass = sizeClasses[size];

  // Check if logo is a URL or emoji/text
  const isImageUrl = team.logo.startsWith('http://') || team.logo.startsWith('https://');

  if (isImageUrl && !imageError) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden bg-white flex items-center justify-center shadow-md ${className}`}>
        <img 
          src={team.logo} 
          alt={team.name}
          className="w-full h-full object-contain p-1"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback to colored badge with initials
  return (
    <div 
      className={`${sizeClass} ${colors.bg} ${colors.text} rounded-full flex items-center justify-center font-bold shadow-md ${className}`}
    >
      {team.shortName}
    </div>
  );
};

export default TeamLogo;

