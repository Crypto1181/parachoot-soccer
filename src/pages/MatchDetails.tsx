import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, BarChart3, Users, Target } from 'lucide-react';
import { liveMatches, upcomingMatches, recentMatches } from '@/data/mockData';
import TeamLogo from '@/components/TeamLogo';
import { Button } from '@/components/ui/button';

export const MatchDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find match in all match arrays
  const allMatches = [...liveMatches, ...upcomingMatches, ...recentMatches];
  const match = allMatches.find((m) => m.id === id);

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Match not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Mock stats data
  const stats = {
    possession: { home: 45, away: 55 },
    shots: { home: 8, away: 12 },
    shotsOnTarget: { home: 3, away: 6 },
    passes: { home: 420, away: 580 },
    passAccuracy: { home: 82, away: 88 },
    corners: { home: 4, away: 7 },
    fouls: { home: 11, away: 9 },
    yellowCards: { home: 2, away: 1 },
    redCards: { home: 0, away: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Match Details</h1>
            <p className="text-xs text-muted-foreground">{match.competition}</p>
          </div>
        </div>
      </div>

      {/* Match Header Card */}
      <div className="p-4">
        <div className="bg-card rounded-3xl p-6 border border-border/30 shadow-sm">
          {/* Status Badge */}
          <div className="flex justify-center mb-4">
            {match.status === 'live' && (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold">LIVE</span>
                {match.minute && <span className="text-xs">{match.minute}'</span>}
              </div>
            )}
            {match.status === 'upcoming' && (
              <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-1.5 rounded-full">
                <Clock size={14} />
                <span className="text-xs font-semibold">UPCOMING</span>
              </div>
            )}
            {match.status === 'finished' && (
              <div className="flex items-center gap-2 bg-gray-500/10 text-gray-500 px-4 py-1.5 rounded-full">
                <span className="text-xs font-semibold">FINISHED</span>
              </div>
            )}
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-center flex-1">
              <TeamLogo team={match.homeTeam} size="xl" className="mb-3" />
              <span className="font-bold text-lg text-center">{match.homeTeam.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{match.homeTeam.shortName}</span>
            </div>

            <div className="text-center px-6">
              <div className="text-5xl font-extrabold mb-2">
                {match.homeScore} - {match.awayScore}
              </div>
              {match.status === 'live' && match.minute && (
                <span className="text-sm text-red-500 font-semibold">{match.minute}'</span>
              )}
              {match.status === 'upcoming' && match.startTime && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock size={14} />
                  <span>{match.startTime}</span>
                </div>
              )}
              {match.status === 'finished' && (
                <span className="text-sm text-muted-foreground">Full Time</span>
              )}
            </div>

            <div className="flex flex-col items-center flex-1">
              <TeamLogo team={match.awayTeam} size="xl" className="mb-3" />
              <span className="font-bold text-lg text-center">{match.awayTeam.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{match.awayTeam.shortName}</span>
            </div>
          </div>

          {/* Match Info */}
          <div className="space-y-3 pt-4 border-t border-border/30">
            {match.group && (
              <div className="flex items-center gap-3 text-sm">
                <Trophy size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Group:</span>
                <span className="font-medium">{match.group}</span>
              </div>
            )}
            {match.venue && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Venue:</span>
                <span className="font-medium">{match.venue}</span>
              </div>
            )}
            {match.startTime && match.status === 'upcoming' && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">Today, {match.startTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Stats */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl p-5 border border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Match Statistics</h2>
          </div>

          <div className="space-y-4">
            {/* Possession */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{stats.possession.home}%</span>
                <span>Possession</span>
                <span>{stats.possession.away}%</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{ width: `${stats.possession.home}%` }}
                />
                <div
                  className="h-2 bg-secondary rounded-full flex-1"
                  style={{ width: `${stats.possession.away}%` }}
                />
              </div>
            </div>

            {/* Shots */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">{stats.shots.home}</span>
              </div>
              <span className="text-sm text-muted-foreground">Shots</span>
              <span className="text-sm font-medium">{stats.shots.away}</span>
            </div>

            {/* Shots on Target */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{stats.shotsOnTarget.home}</span>
              <span className="text-sm text-muted-foreground">Shots on Target</span>
              <span className="text-sm font-medium">{stats.shotsOnTarget.away}</span>
            </div>

            {/* Passes */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{stats.passes.home}</span>
              <span className="text-sm text-muted-foreground">Passes</span>
              <span className="text-sm font-medium">{stats.passes.away}</span>
            </div>

            {/* Pass Accuracy */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{stats.passAccuracy.home}%</span>
                <span>Pass Accuracy</span>
                <span>{stats.passAccuracy.away}%</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{ width: `${stats.passAccuracy.home}%` }}
                />
                <div
                  className="h-2 bg-secondary rounded-full flex-1"
                  style={{ width: `${stats.passAccuracy.away}%` }}
                />
              </div>
            </div>

            {/* Corners */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{stats.corners.home}</span>
              <span className="text-sm text-muted-foreground">Corners</span>
              <span className="text-sm font-medium">{stats.corners.away}</span>
            </div>

            {/* Fouls */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{stats.fouls.home}</span>
              <span className="text-sm text-muted-foreground">Fouls</span>
              <span className="text-sm font-medium">{stats.fouls.away}</span>
            </div>

            {/* Cards */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">🟨</span>
                <span className="text-sm font-medium">{stats.yellowCards.home}</span>
                {stats.redCards.home > 0 && (
                  <>
                    <span className="text-red-500">🟥</span>
                    <span className="text-sm font-medium">{stats.redCards.home}</span>
                  </>
                )}
              </div>
              <span className="text-sm text-muted-foreground">Cards</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.yellowCards.away}</span>
                {stats.redCards.away > 0 && (
                  <>
                    <span className="text-red-500">🟥</span>
                    <span className="text-sm font-medium">{stats.redCards.away}</span>
                  </>
                )}
                <span className="text-yellow-500">🟨</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Watch Button for Live/Upcoming */}
      {(match.status === 'live' || match.status === 'upcoming') && (
        <div className="px-4">
          <Button
            onClick={() => navigate(`/watch/${match.id}`)}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
          >
            {match.status === 'live' ? 'Watch Live' : 'Watch Match'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MatchDetailsPage;

