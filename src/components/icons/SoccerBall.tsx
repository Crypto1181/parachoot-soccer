import React from 'react';

interface SoccerBallProps {
  className?: string;
  size?: number;
}

export const SoccerBall: React.FC<SoccerBallProps> = ({ className = '', size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="50" cy="50" r="48" fill="white" stroke="hsl(142, 76%, 45%)" strokeWidth="2" />
      <path
        d="M50 20L60 35L50 50L40 35L50 20Z"
        fill="hsl(120, 20%, 15%)"
      />
      <path
        d="M75 40L80 55L70 65L60 55L70 40L75 40Z"
        fill="hsl(120, 20%, 15%)"
      />
      <path
        d="M25 40L30 40L40 55L30 65L20 55L25 40Z"
        fill="hsl(120, 20%, 15%)"
      />
      <path
        d="M35 75L50 80L65 75L60 60L50 55L40 60L35 75Z"
        fill="hsl(120, 20%, 15%)"
      />
      <circle cx="50" cy="50" r="8" fill="hsl(142, 76%, 45%)" />
    </svg>
  );
};

export default SoccerBall;
