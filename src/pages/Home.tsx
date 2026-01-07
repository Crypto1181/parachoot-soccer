import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Menu } from 'lucide-react';
import { liveMatches, upcomingMatches, recentMatches, weekDays, Match, teams } from '@/data/mockData';
import MatchCard from '@/components/MatchCard';
import DateSelector from '@/components/DateSelector';

export const HomePage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(24);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'recent'>('live');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [displayedMatches, setDisplayedMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);

  const tabs = [
    { id: 'live', label: 'Live Now' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'recent', label: 'Recent' },
  ] as const;

  const baseMatches = {
    live: liveMatches,
    upcoming: upcomingMatches,
    recent: recentMatches,
  };

  // Generate more matches for infinite scroll
  const generateMoreMatches = useCallback((type: 'live' | 'upcoming' | 'recent', page: number): Match[] => {
    const base = baseMatches[type];
    const matches: Match[] = [];
    
    for (let i = 0; i < 5; i++) {
      const index = (page - 1) * 5 + i;
      const homeTeamIndex = (index * 2) % teams.length;
      const awayTeamIndex = (index * 2 + 1) % teams.length;
      
      if (type === 'live') {
        matches.push({
          id: `${type}-page${page}-${i}`,
          homeTeam: teams[homeTeamIndex],
          awayTeam: teams[awayTeamIndex],
          homeScore: Math.floor(Math.random() * 4),
          awayScore: Math.floor(Math.random() * 4),
          status: 'live',
          minute: Math.floor(Math.random() * 90) + 1,
          competition: 'Champions League',
          group: `Group ${String.fromCharCode(65 + (index % 8))}`,
          venue: 'Stadium ' + (index + 1),
        });
      } else if (type === 'upcoming') {
        matches.push({
          id: `${type}-page${page}-${i}`,
          homeTeam: teams[homeTeamIndex],
          awayTeam: teams[awayTeamIndex],
          homeScore: 0,
          awayScore: 0,
          status: 'upcoming',
          competition: 'Champions League',
          startTime: `${18 + (index % 6)}:${(index * 10) % 60}`.padStart(5, '0'),
          venue: 'Stadium ' + (index + 1),
        });
      } else {
        matches.push({
          id: `${type}-page${page}-${i}`,
          homeTeam: teams[homeTeamIndex],
          awayTeam: teams[awayTeamIndex],
          homeScore: Math.floor(Math.random() * 5),
          awayScore: Math.floor(Math.random() * 5),
          status: 'finished',
          competition: 'Champions League',
        });
      }
    }
    
    return matches;
  }, []);

  // Load initial matches
  useEffect(() => {
    setDisplayedMatches(baseMatches[activeTab]);
    pageRef.current = 1;
    setHasMore(true);
  }, [activeTab]);

  // Load more matches
  const loadMoreMatches = useCallback(() => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      const newMatches = generateMoreMatches(activeTab, pageRef.current + 1);
      if (newMatches.length > 0) {
        setDisplayedMatches(prev => [...prev, ...newMatches]);
        pageRef.current += 1;
      } else {
        setHasMore(false);
      }
      setIsLoading(false);
    }, 500);
  }, [activeTab, isLoading, hasMore, generateMoreMatches]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Load more when 200px from bottom
    if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !isLoading) {
      loadMoreMatches();
    }
  }, [hasMore, isLoading, loadMoreMatches]);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left - go to next tab
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id as 'live' | 'upcoming' | 'recent');
      }
    } else if (isRightSwipe) {
      // Swipe right - go to previous tab
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1].id as 'live' | 'upcoming' | 'recent');
      }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="stadium-bg pt-12 pb-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Parachoot Soccer</h1>
          <div className="flex gap-3">
            <button className="p-2 text-foreground/80 hover:text-foreground transition-colors">
              <Bell size={22} />
            </button>
            <button className="p-2 text-foreground/80 hover:text-foreground transition-colors">
              <Menu size={22} />
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Scores & Fixtures</h2>
        <DateSelector days={weekDays} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </div>

      {/* Content */}
      <div className="bg-score-bg rounded-t-3xl -mt-4 min-h-[60vh] p-4">
        {/* Tabs - shifted down and swipeable */}
        <div
          ref={tabsContainerRef}
          className="flex gap-2 mb-6 mt-4"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Matches - infinite scrollable container with continuous wave background */}
        <div
          ref={scrollContainerRef}
          className="relative overflow-y-auto max-h-[calc(100vh-280px)] pb-4"
          onScroll={handleScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='180' viewBox='0 0 100 180' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='wavePattern' x='0' y='0' width='100' height='180' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0,60 Q25,20 50,60 T100,60 L100,180 L0,180 Z' fill='%2322c55e' opacity='0.15'/%3E%3Cpath d='M31.8444 11.5179C29.1202 12.6468 26.7777 14.2456 25 16.1711C23.2222 14.2456 20.8798 12.6468 18.1556 11.5179C11.9008 14.1099 7.65247 19.1752 7.65247 25.0001C7.65247 30.825 11.9008 35.8902 18.1557 38.4821C20.8798 37.3533 23.2223 35.7546 25.0001 33.8291C26.7778 35.7546 29.1202 37.3533 31.8445 38.4821C38.0993 35.8902 42.3476 30.8249 42.3476 25.0001C42.3476 19.1753 38.0992 14.1099 31.8444 11.5179Z' fill='%2316a34a' opacity='0.2' transform='translate(0, 40) scale(0.8)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23wavePattern)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat-y',
            backgroundSize: '100% 180px',
            backgroundPosition: '0 0',
          }}
        >
          <div className="relative space-y-4">
            {displayedMatches.map((match, index) => (
              <MatchCard key={match.id} match={match} index={index} />
            ))}
            {isLoading && (
              <div className="flex justify-center py-4 relative z-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!hasMore && displayedMatches.length > 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm relative z-10">
                No more matches to load
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
