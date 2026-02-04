import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, BarChart3, Users, Target, Play, Shirt, History, Activity, File, Disc, ArrowLeftRight, Timer, Flag } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { Button } from '@/components/ui/button';
import { useMatch, useMatchStats, useMatchLineups, useMatchH2H, useMatchSummary } from '@/hooks/useMatches';
import { enrichMatchWithStreams } from '@/lib/westreamApi';
import { enrichMatchWithMultipleStreamSources } from '@/lib/streamAggregator';
import { Match } from '@/data/mockData';
import { cn } from '@/lib/utils';

export const MatchDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialMatch = location.state?.match as Match | null;
  
  const { match: fetchedMatch, loading, error } = useMatch(id || '');
  
  // Merge fetched match with initial match to prevent stale data (especially scores)
  const match = useMemo(() => {
    if (!fetchedMatch) return initialMatch;
    if (!initialMatch) return fetchedMatch;
    
    // Check for stale scores in fetchedMatch (0-0 when list view had scores)
    const fetchedIsZero = (fetchedMatch.homeScore === 0 || fetchedMatch.homeScore === null) && 
                          (fetchedMatch.awayScore === 0 || fetchedMatch.awayScore === null);
    const initialHasScore = (initialMatch.homeScore || 0) > 0 || (initialMatch.awayScore || 0) > 0;
    
    // If fetched match shows 0-0 but initial match had scores, prefer initial match scores
    // This handles cases where the details API is slower to update than the list API
    if (fetchedIsZero && initialHasScore) {
      return {
        ...fetchedMatch,
        homeScore: initialMatch.homeScore,
        awayScore: initialMatch.awayScore,
        status: initialMatch.status === 'live' ? 'live' : fetchedMatch.status,
        minute: initialMatch.minute || fetchedMatch.minute
      };
    }
    
    return fetchedMatch;
  }, [fetchedMatch, initialMatch]);

  const isWeStreamMatch = (id || '').startsWith('westream-');
  const isSportsRCMatch = (id || '').startsWith('sportsrc-');
  const { stats: matchStats, loading: statsLoading } = useMatchStats(id, !isWeStreamMatch && !isSportsRCMatch);
  const [activeTab, setActiveTab] = useState<'details' | 'summary' | 'stats' | 'lineups' | 'h2h'>('details');
  const { lineups, loading: lineupsLoading } = useMatchLineups(id, !isWeStreamMatch && !isSportsRCMatch && activeTab === 'lineups');
  const { h2h, loading: h2hLoading } = useMatchH2H(id, !isWeStreamMatch && !isSportsRCMatch && activeTab === 'h2h');
  const { summary, loading: summaryLoading } = useMatchSummary(id, !isWeStreamMatch && !isSportsRCMatch && activeTab === 'summary');
  const [enrichedMatch, setEnrichedMatch] = useState<Match | null>(null);

  // For matches from Live TV page, streams should already be included
  // For other matches (Flashscore from Home page), try to enrich with streams
  useEffect(() => {
    if (!match) {
      setEnrichedMatch(null);
      return;
    }
    
    // SportsRC matches already have streams included (from Live TV page)
    if (isSportsRCMatch) {
      console.log(`[MatchDetails] SportsRC match - streams:`, match.streamSources?.length || 0);
      setEnrichedMatch(match);
      return;
    }
    
    // WeStream matches already have streams included (from Live TV page)
    if (isWeStreamMatch) {
      console.log(`[MatchDetails] WeStream match - streams:`, match.streamSources?.length || 0);
      setEnrichedMatch(match);
      return;
    }
    
    // Matches with streams already included
    if (match.streamSources && match.streamSources.length > 0) {
      console.log(`[MatchDetails] Match already has streams:`, match.streamSources.length);
      setEnrichedMatch(match);
      return;
    }
    
    // For matches without streams, try to enrich with streams if live
    const hasStreams = match.streamSources && match.streamSources.length > 0;
    if (match.status !== 'live' || hasStreams) {
      setEnrichedMatch(match);
      return;
    }
    
    // Try to find streams from other sources
    enrichMatchWithMultipleStreamSources(match)
      .then((enriched) => {
        setEnrichedMatch(enriched as Match);
      })
      .catch((err) => {
        console.error('Error enriching match with streams:', err);
        enrichMatchWithStreams(match)
          .then((enriched) => setEnrichedMatch(enriched as Match))
          .catch(() => setEnrichedMatch(match));
      });
  }, [match, isWeStreamMatch, isSportsRCMatch]);

  const displayMatch = enrichedMatch || match;

  const handleWatchStream = () => {
    if (displayMatch?.streamSources && displayMatch.streamSources.length > 0) {
      const firstSource = displayMatch.streamSources[0];
      const provider = firstSource.provider || 'westream';
      navigate(`/stream/${displayMatch.id}/${provider}/${firstSource.source}/${firstSource.id}`);
    }
  };

  if (loading && !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Match not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!displayMatch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Parse stats from API response
  const parseStatValue = (value: number | string): number => {
    if (typeof value === 'number') return value;
    // Extract percentage from strings like "38%" or "81% (281/346)"
    const percentMatch = value.toString().match(/(\d+)%/);
    if (percentMatch) return parseInt(percentMatch[1]);
    // Try to parse as number
    const num = parseFloat(value.toString());
    return isNaN(num) ? 0 : num;
  };

  const extractNumberFromString = (value: number | string): number => {
    if (typeof value === 'number') return value;
    // Extract number from strings like "81% (281/346)" - get the total (second number)
    const parenMatch = value.toString().match(/\((\d+)\/(\d+)\)/);
    if (parenMatch) return parseInt(parenMatch[2]); // Get total passes (346)
    // Try to parse as number
    const num = parseFloat(value.toString());
    return isNaN(num) ? 0 : num;
  };

  const getStatValue = (statName: string, period: 'match' | '1st-half' | '2nd-half' = 'match'): { home: number; away: number } | null => {
    if (!matchStats) return null;
    const periodStats = matchStats[period] || [];
    const stat = periodStats.find(s => s.name.toLowerCase().includes(statName.toLowerCase()));
    if (!stat) return null;
    return {
      home: parseStatValue(stat.home_team),
      away: parseStatValue(stat.away_team),
    };
  };

  const getStatNumber = (statName: string, period: 'match' | '1st-half' | '2nd-half' = 'match'): { home: number; away: number } | null => {
    if (!matchStats) return null;
    const periodStats = matchStats[period] || [];
    const stat = periodStats.find(s => s.name.toLowerCase().includes(statName.toLowerCase()));
    if (!stat) return null;
    return {
      home: extractNumberFromString(stat.home_team),
      away: extractNumberFromString(stat.away_team),
    };
  };

  // Get stats with fallback to defaults
  const stats = {
    possession: getStatValue('Ball possession') || { home: 50, away: 50 },
    shots: getStatNumber('Total shots') || { home: 0, away: 0 },
    shotsOnTarget: getStatNumber('Shots on target') || { home: 0, away: 0 },
    passes: getStatNumber('Passes') || { home: 0, away: 0 },
    passAccuracy: getStatValue('Passes') || { home: 0, away: 0 }, // Extract percentage from "81% (281/346)"
    corners: getStatNumber('Corner kicks') || { home: 0, away: 0 },
    fouls: getStatNumber('Fouls') || { home: 0, away: 0 },
    yellowCards: getStatNumber('Yellow cards') || { home: 0, away: 0 },
    redCards: getStatNumber('Red Cards') || { home: 0, away: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-2 sm:gap-4 pt-3 pb-3 sm:pt-4 sm:pb-4 pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] sm:pl-[calc(1rem+env(safe-area-inset-left))] sm:pr-[calc(1rem+env(safe-area-inset-right))]">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">Match Details</h1>
            <p className="text-xs text-muted-foreground truncate">
              {typeof (displayMatch?.competition) === 'string' 
                ? displayMatch.competition 
                : (typeof match.competition === 'string' ? match.competition : 'Football')}
            </p>
          </div>
        </div>
      </div>

      {/* Match Header Card */}
      <div className="pt-4 pb-4 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
        <div className="bg-card rounded-3xl p-6 border border-border/30 shadow-sm">
          {/* Status Badge */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex justify-center">
              {displayMatch?.status === 'live' && (
                <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold">LIVE</span>
                  {displayMatch.minute && <span className="text-xs">{displayMatch.minute}'</span>}
                </div>
              )}
              {displayMatch?.status === 'upcoming' && (
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-1.5 rounded-full">
                  <Clock size={14} />
                  <span className="text-xs font-semibold">UPCOMING</span>
                </div>
              )}
              {displayMatch?.status === 'finished' && (
                <div className="flex items-center gap-2 bg-gray-500/10 text-gray-500 px-4 py-1.5 rounded-full">
                  <span className="text-xs font-semibold">FINISHED</span>
                </div>
              )}
            </div>
            
            {/* Watch Stream Button */}
            {displayMatch?.streamSources && displayMatch.streamSources.length > 0 && displayMatch.status === 'live' && (
              <Button
                onClick={handleWatchStream}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg"
              >
                <Play size={18} fill="white" />
                <span className="font-semibold">Watch Live Stream</span>
              </Button>
            )}
            
            {/* Debug: Show stream info if available */}
            {displayMatch?.streamSources && displayMatch.streamSources.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {displayMatch.streamSources.length} stream source(s) available
              </div>
            )}
            
            {/* Debug: Show if no streams found */}
            {displayMatch?.status === 'live' && (!displayMatch?.streamSources || displayMatch.streamSources.length === 0) && (
              <div className="mt-2 text-xs text-yellow-600 text-center">
                ⚠️ No streams found in detail endpoint
              </div>
            )}
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-center flex-1">
              <TeamLogo team={displayMatch.homeTeam} size="xl" className="mb-3" />
              <span className="font-bold text-lg text-center">{displayMatch.homeTeam.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{displayMatch.homeTeam.shortName}</span>
            </div>

            <div className="text-center px-6">
              <div className="text-3xl font-extrabold mb-2 whitespace-nowrap">
                {displayMatch.homeScore ?? 0} - {displayMatch.awayScore ?? 0}
              </div>
              {displayMatch.status === 'live' && displayMatch.minute && (
                <span className="text-sm text-red-500 font-semibold">{displayMatch.minute}'</span>
              )}
              {displayMatch.status === 'upcoming' && displayMatch.startTime && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock size={14} />
                  <span>{displayMatch.startTime}</span>
                </div>
              )}
              {displayMatch.status === 'finished' && (
                <span className="text-sm text-muted-foreground">Full Time</span>
              )}
            </div>

            <div className="flex flex-col items-center flex-1">
              <TeamLogo team={displayMatch.awayTeam} size="xl" className="mb-3" />
              <span className="font-bold text-lg text-center">{displayMatch.awayTeam.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{displayMatch.awayTeam.shortName}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-secondary/30 rounded-xl overflow-x-auto gap-1 mb-4 ml-[calc(1rem+env(safe-area-inset-left))] mr-[calc(1rem+env(safe-area-inset-right))]">
        {['details', 'summary', 'stats', 'lineups', 'h2h'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap",
              activeTab === tab 
                ? "bg-background text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-background/50"
            )}
          >
            {tab === 'details' && 'Overview'}
            {tab === 'summary' && 'Summary'}
            {tab === 'stats' && 'Stats'}
            {tab === 'lineups' && 'Lineups'}
            {tab === 'h2h' && 'H2H'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Overview Tab */}
        {activeTab === 'details' && (
          <div className="pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
            <div className="bg-card rounded-3xl p-6 border border-border/30 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                Match Info
              </h3>
              <div className="space-y-3 pt-2">
            {(displayMatch as any).tournament && (
              <div className="flex items-center gap-3 text-sm">
                <Trophy size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Tournament:</span>
                <span className="font-medium">{(displayMatch as any).tournament.name}</span>
              </div>
            )}
            {(displayMatch as any).country && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Country:</span>
                <span className="font-medium">{(displayMatch as any).country}</span>
              </div>
            )}
            {(displayMatch as any).venueDetails && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Venue:</span>
                <span className="font-medium">{(displayMatch as any).venueDetails.name}</span>
                {(displayMatch as any).venueDetails.city && (
                  <span className="text-muted-foreground">, {(displayMatch as any).venueDetails.city}</span>
                )}
              </div>
            )}
            {(displayMatch as any).referee && (
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Referee:</span>
                <span className="font-medium">{(displayMatch as any).referee}</span>
              </div>
            )}
            {displayMatch.startTime && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{displayMatch.startTime}</span>
              </div>
            )}
            {(displayMatch as any).venueDetails?.attendance && (
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Attendance:</span>
                <span className="font-medium">{(displayMatch as any).venueDetails.attendance}</span>
                {(displayMatch as any).venueDetails.capacity && (
                  <span className="text-muted-foreground">/ {(displayMatch as any).venueDetails.capacity}</span>
                )}
              </div>
            )}
            {((match as any).score1stHalf !== undefined || (match as any).score2ndHalf !== undefined) && (
              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Half-time:</span>
                <span className="font-medium">
                  {(match as any).score1stHalf?.home || 0} - {(match as any).score1stHalf?.away || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
          <div className="bg-card rounded-3xl p-6 border border-border/30 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Flag size={20} className="text-primary" />
              <h2 className="text-lg font-semibold">Match Events</h2>
              {summaryLoading && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-auto" />
              )}
            </div>

            {summaryLoading && !summary ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !summary || summary.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No match events available</p>
              </div>
            ) : (
              <div className="space-y-6">
                 {/* Helper to parse minutes */}
                 {(() => {
                    const parseMinute = (min: string) => {
                      const match = min.match(/^(\d+)/);
                      return match ? parseInt(match[1]) : 0;
                    };

                    const sortedEvents = [...summary].sort((a, b) => parseMinute(a.minutes) - parseMinute(b.minutes));
                    
                    const firstHalfEvents = sortedEvents.filter(e => parseMinute(e.minutes) <= 45);
                    const secondHalfEvents = sortedEvents.filter(e => parseMinute(e.minutes) > 45);
                    
                    // Function to calculate score at end of period
                    // Since API doesn't provide running score in event, we can try to calculate or use half-time score
                    // For now, we'll try to use match object scores if available, or just show headers
                    
                    const firstHalfScore = (match as any).score1stHalf 
                      ? `${(match as any).score1stHalf.home} - ${(match as any).score1stHalf.away}`
                      : null;
                      
                    const fullTimeScore = (match as any).score2ndHalf && (match as any).score1stHalf
                      ? `${((match as any).score1stHalf.home || 0) + ((match as any).score2ndHalf.home || 0)} - ${((match as any).score1stHalf.away || 0) + ((match as any).score2ndHalf.away || 0)}`
                      : (match as any).homeScore !== undefined && (match as any).awayScore !== undefined
                        ? `${(match as any).homeScore} - ${(match as any).awayScore}`
                        : null;

                    const renderEvents = (events: typeof summary) => (
                      <div className="space-y-4 relative py-2">
                        {/* Vertical Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50 -translate-x-1/2" />

                        {events.map((event, index) => {
                          const isHome = event.team === 'home';
                          return (
                            <div key={`${event.minutes}-${index}`} className="relative flex items-center min-h-[40px]">
                              {/* Time Badge (Center) */}
                              <div className="absolute left-1/2 -translate-x-1/2 z-10">
                                <div className="bg-background border border-border rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-sm">
                                  {event.minutes}'
                                </div>
                              </div>

                              {/* Home Event (Left) */}
                              <div className={`flex-1 flex items-center ${isHome ? 'justify-end pr-8' : 'justify-end invisible'}`}>
                                {isHome && (
                                  <div className="flex flex-col items-end text-right">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{event.name}</span>
                                      {/* Icon based on type */}
                                      {event.type === 'Goal' && <Disc size={16} className="text-primary fill-primary" />}
                                      {event.type === 'Yellow Card' && <File size={16} className="text-yellow-400 fill-yellow-400" />}
                                      {event.type === 'Red Card' && <File size={16} className="text-red-500 fill-red-500" />}
                                      {event.type.includes('Substitution') && <ArrowLeftRight size={16} className="text-green-500" />}
                                    </div>
                                    {event.description && <span className="text-xs text-muted-foreground max-w-[150px] sm:max-w-xs truncate">{event.description}</span>}
                                  </div>
                                )}
                              </div>

                              {/* Away Event (Right) */}
                              <div className={`flex-1 flex items-center ${!isHome ? 'justify-start pl-8' : 'justify-start invisible'}`}>
                                {!isHome && (
                                  <div className="flex flex-col items-start text-left">
                                    <div className="flex items-center gap-2">
                                      {/* Icon based on type */}
                                      {event.type === 'Goal' && <Disc size={16} className="text-primary fill-primary" />}
                                      {event.type === 'Yellow Card' && <File size={16} className="text-yellow-400 fill-yellow-400" />}
                                      {event.type === 'Red Card' && <File size={16} className="text-red-500 fill-red-500" />}
                                      {event.type.includes('Substitution') && <ArrowLeftRight size={16} className="text-green-500" />}
                                      <span className="font-medium text-sm">{event.name}</span>
                                    </div>
                                    {event.description && <span className="text-xs text-muted-foreground max-w-[150px] sm:max-w-xs truncate">{event.description}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );

                    return (
                      <div className="space-y-8">
                        {/* 1st Half Section */}
                        {firstHalfEvents.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-lg mb-4">
                              <span className="text-sm font-semibold text-muted-foreground">1ST HALF</span>
                              {firstHalfScore && <span className="text-sm font-bold">{firstHalfScore}</span>}
                            </div>
                            {renderEvents(firstHalfEvents)}
                          </div>
                        )}

                        {/* 2nd Half Section */}
                        {secondHalfEvents.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-lg mb-4">
                              <span className="text-sm font-semibold text-muted-foreground">2ND HALF</span>
                              {fullTimeScore && <span className="text-sm font-bold">{fullTimeScore}</span>}
                            </div>
                            {renderEvents(secondHalfEvents)}
                          </div>
                        )}
                      </div>
                    );
                 })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] mb-4">
        <div className="bg-card rounded-2xl p-5 border border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Match Statistics</h2>
            {statsLoading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-auto" />
            )}
          </div>

          {statsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
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
          )}
        </div>
      </div>
      )}

      {/* Lineups Tab */}
      {activeTab === 'lineups' && (
        <div className="px-4">
            {lineupsLoading ? (
               <div className="flex justify-center py-8">
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
               </div>
            ) : !lineups ? (
               <div className="text-center py-8 text-muted-foreground">No lineups available</div>
            ) : (
               <div className="space-y-6">
                 {/* Home Team Lineup */}
                 <div className="bg-card rounded-2xl p-5 border border-border/30">
                    <div className="flex items-center gap-3 mb-4">
                      <TeamLogo team={displayMatch.homeTeam} size="sm" />
                      <h3 className="font-semibold">{displayMatch.homeTeam.name} Lineup</h3>
                    </div>
                    <div className="space-y-2">
                      {/* Starting XI */}
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Starting XI</div>
                      {lineups.home.startingLineups?.map((player) => (
                        <div key={player.player_id || player.name} className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-muted-foreground text-xs">{player.number}</span>
                            <span>{player.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{player.position}</span>
                        </div>
                      ))}
                      {/* Subs */}
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Substitutes</div>
                      {lineups.home.substitutes?.map((player) => (
                        <div key={player.player_id || player.name} className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-muted-foreground text-xs">{player.number}</span>
                            <span>{player.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{player.position}</span>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Away Team Lineup */}
                <div className="bg-card rounded-2xl p-5 border border-border/30">
                   <div className="flex items-center gap-3 mb-4">
                     <TeamLogo team={displayMatch.awayTeam} size="sm" />
                     <h3 className="font-semibold">{displayMatch.awayTeam.name} Lineup</h3>
                   </div>
                   <div className="space-y-2">
                      {/* Starting XI */}
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Starting XI</div>
                      {lineups.away.startingLineups?.map((player) => (
                        <div key={player.player_id || player.name} className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-muted-foreground text-xs">{player.number}</span>
                            <span>{player.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{player.position}</span>
                        </div>
                      ))}
                      {/* Subs */}
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Substitutes</div>
                      {lineups.away.substitutes?.map((player) => (
                        <div key={player.player_id || player.name} className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-muted-foreground text-xs">{player.number}</span>
                            <span>{player.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{player.position}</span>
                        </div>
                      ))}
                   </div>
                </div>
               </div>
            )}
        </div>
      )}

      {/* H2H Tab */}
      {activeTab === 'h2h' && (
        <div className="pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
            {h2hLoading ? (
               <div className="flex justify-center py-8">
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
               </div>
            ) : h2h.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">No H2H data available</div>
            ) : (
               <div className="space-y-3">
                 {h2h.map((match) => (
                   <div key={match.match_id} className="bg-card rounded-xl p-4 border border-border/30 flex items-center justify-between">
                     <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span>{new Date(match.timestamp * 1000).toLocaleDateString()}</span>
                        <span>{match.tournament.name}</span>
                     </div>
                     <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="flex items-center gap-2 w-1/3 justify-end">
                           <span className="text-sm font-medium text-right truncate">{match.homeTeam.name}</span>
                           <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-6 h-6 object-contain" />
                        </div>
                        <div className="font-bold text-lg bg-secondary/30 px-2 py-1 rounded">
                           {match.score.home} - {match.score.away}
                        </div>
                        <div className="flex items-center gap-2 w-1/3 justify-start">
                           <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-6 h-6 object-contain" />
                           <span className="text-sm font-medium text-left truncate">{match.awayTeam.name}</span>
                        </div>
                     </div>
                     <div className="w-6 flex justify-center">
                        <span className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded",
                          match.status === 'W' ? "bg-green-500/10 text-green-500" :
                          match.status === 'L' ? "bg-red-500/10 text-red-500" :
                          "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {match.status}
                        </span>
                     </div>
                   </div>
                 ))}
               </div>
            )}
        </div>
      )}

      </div>
    </div>
  );
};

export default MatchDetailsPage;

