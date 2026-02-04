import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Menu, RefreshCw, Settings, Share2, Mail, Info, Star, Moon, Globe, Crown, ChevronRight, Zap, Trash2, Palette, Shield } from 'lucide-react';
import { weekDays, Match, teams } from '@/data/mockData';
import MatchCard from '@/components/MatchCard';
import DateSelector from '@/components/DateSelector';
import LeagueSection from '@/components/LeagueSection';
import { useMatchesGrouped } from '@/hooks/useMatches';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export const HomePage: React.FC = () => {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'recent'>('live');
  const [darkMode, setDarkMode] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  
  const handleClearCache = () => {
    // Clear all caches
    localStorage.clear();
    sessionStorage.clear();
    toast.success('Cache cleared successfully!');
    // Ideally reload page, but toast is enough feedback for now
  };
  
  // Helper to format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Get today's date string
  const getTodayDateString = (): string => {
    return formatDateString(new Date());
  };
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [displayedMatches, setDisplayedMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);

  // Generate date string in YYYY-MM-DD format from day number
  const getDateString = (day: number): string => {
    // Find the date object from weekDaysList that matches the day
    const dayInfo = weekDaysList.find(d => d.day === day);
    if (dayInfo && dayInfo.date) {
      // Use the stored date object directly - this is the most reliable
      return formatDateString(dayInfo.date);
    }
    
    // Fallback: Calculate the actual date based on today and the day number
    // This handles edge cases where the day might not be in weekDaysList
    const today = new Date();
    const currentDay = today.getDate();
    const diff = day - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    
    return formatDateString(targetDate);
  };

  // Generate week days dynamically with full date info
  const generateWeekDays = () => {
    const today = new Date();
    const days: { day: number; name: string; date: Date }[] = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    for (let i = -2; i <= 2; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        day: date.getDate(),
        name: dayNames[date.getDay()],
        date: new Date(date), // Store full date object
      });
    }
    return days;
  };

  const [weekDaysList, setWeekDaysList] = useState(generateWeekDays());

  // Initialize selected date on mount
  useEffect(() => {
    if (weekDaysList.length > 0 && !selectedDate) {
      const dateStr = getDateString(selectedDay);
      setSelectedDate(dateStr);
    }
  }, [weekDaysList.length]); // Run when weekDaysList is initialized

  // Handle date navigation
  const handleDateNavigate = (direction: 'prev' | 'next') => {
    const today = new Date();
    const newDays: { day: number; name: string; date: Date }[] = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    // Get the first day's date from current list
    const firstDayInfo = weekDaysList[0];
    const baseDate = firstDayInfo && firstDayInfo.date ? new Date(firstDayInfo.date) : new Date(today);
    
    if (direction === 'prev') {
      baseDate.setDate(baseDate.getDate() - 5);
    } else {
      baseDate.setDate(baseDate.getDate() + 5);
    }
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      newDays.push({
        day: date.getDate(),
        name: dayNames[date.getDay()],
        date: new Date(date), // Store full date object
      });
    }
    
    setWeekDaysList(newDays);
    // Select the middle day
    setSelectedDay(newDays[2].day);
  };

  const tabs = [
    { id: 'live', label: 'Live Now' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'recent', label: 'Recent' },
  ] as const;

  // Update selected date when day changes or weekDaysList updates
  useEffect(() => {
    if (weekDaysList.length > 0) {
      const dateStr = getDateString(selectedDay);
      setSelectedDate(dateStr);
    }
  }, [selectedDay, weekDaysList]);

  // Fetch matches grouped by league
  // Always use date filter when date is selected (for all tabs)
  // For today, use "today" string which will be converted to "0" in the API
  const todayDateStr = getTodayDateString();
  const isTodaySelected = selectedDate === todayDateStr || selectedDate === '';
  
  // Use "today" for today's date, otherwise use the selected date
  const dateForApi = isTodaySelected ? 'today' : (selectedDate || 'today');
  
  const { leagueGroups: liveGroups, loading: liveLoading, refetch: refetchLive } = useMatchesGrouped(
    'live', 
    isTodaySelected ? true : false, // Auto-refresh only for today's live matches
    dateForApi // Always use date filter (default to today if not set)
  );
  const { leagueGroups: upcomingGroups, loading: upcomingLoading, refetch: refetchUpcoming } = useMatchesGrouped(
    'upcoming', 
    false, 
    dateForApi // Always use date filter (default to today to show today's upcoming)
  );
  const { leagueGroups: recentGroups, loading: recentLoading, refetch: refetchRecent } = useMatchesGrouped(
    'finished', 
    false, 
    dateForApi // Always use date filter (default to today)
  );

  // Refresh function
  const handleRefresh = () => {
    if (activeTab === 'live') refetchLive();
    else if (activeTab === 'upcoming') refetchUpcoming();
    else refetchRecent();
  };
  
  // Flatten for backward compatibility with existing code
  const liveMatches = liveGroups.flatMap(g => g.matches);
  const upcomingMatches = upcomingGroups.flatMap(g => g.matches);
  const recentMatches = recentGroups.flatMap(g => g.matches);

  const baseLeagueGroups = {
    live: liveGroups,
    upcoming: upcomingGroups,
    recent: recentGroups,
  };

  const baseMatches = {
    live: liveMatches,
    upcoming: upcomingMatches,
    recent: recentMatches,
  };

  const isLoadingMatches = {
    live: liveLoading,
    upcoming: upcomingLoading,
    recent: recentLoading,
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

  // Note: Infinite scroll removed - now using grouped matches by league

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

  // Handle scroll with debouncing to prevent flickering
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Cancel previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce scroll handler
    scrollTimeoutRef.current = setTimeout(() => {
      const container = e.currentTarget;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // Load more when 200px from bottom
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !isLoading) {
        loadMoreMatches();
      }
    }, 100); // 100ms debounce
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
      {/* Sticky App Bar */}
      <div className="sticky top-0 z-50 bg-[#159e48] safe-area-top px-4 py-3 flex items-center justify-between shadow-lg border-b border-white/10">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate flex-1 min-w-0">Parachoot Soccer</h1>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleRefresh}
              disabled={isLoadingMatches[activeTab]}
              className="p-2 text-foreground/80 hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw 
                size={20} 
                className={isLoadingMatches[activeTab] ? 'animate-spin' : ''} 
              />
            </button>
            <button className="p-2 text-foreground/80 hover:text-foreground transition-colors" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 text-foreground/80 hover:text-foreground transition-colors" aria-label="Menu">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-card border-l border-border/50 overflow-y-auto safe-area-top safe-area-bottom">
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="text-xl font-bold">Menu</SheetTitle>
                  <SheetDescription>
                    Manage your app preferences and more.
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 pb-20">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground px-2 pb-2">App Settings</h3>
                    
                    <div className="flex items-center justify-between px-4 h-12 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setDataSaver(!dataSaver)}>
                      <div className="flex items-center gap-3">
                        <Zap size={20} />
                        <span className="text-sm font-medium">Data Saver</span>
                      </div>
                      <Switch checked={dataSaver} onCheckedChange={setDataSaver} />
                    </div>

                    <Button variant="ghost" className="w-full justify-between gap-3 h-12 rounded-xl px-4" onClick={() => toast.info('Language settings coming soon')}>
                      <div className="flex items-center gap-3">
                        <Globe size={20} />
                        <span>Language</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs">English</span>
                        <ChevronRight size={16} />
                      </div>
                    </Button>

                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={() => toast.info('Notifications settings coming soon')}>
                      <Bell size={20} />
                      <span>Notifications</span>
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground px-2 pb-2">Storage & Privacy</h3>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={handleClearCache}>
                      <Trash2 size={20} />
                      <span>Clear Cache</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={() => toast.info('Privacy Policy coming soon')}>
                      <Shield size={20} />
                      <span>Privacy Policy</span>
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground px-2 pb-2">Support</h3>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={() => toast.info('Sharing coming soon')}>
                      <Share2 size={20} />
                      <span>Share App</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={() => toast.info('Rating coming soon')}>
                      <Star size={20} />
                      <span>Rate Us</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={() => toast.info('Contact support coming soon')}>
                      <Mail size={20} />
                      <span>Contact Us</span>
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={() => toast.info('About page coming soon')}>
                      <Info size={20} />
                      <span>About Parachoot</span>
                    </Button>
                  </div>
                </div>
                
                <div className="absolute bottom-6 left-6 right-6 text-center text-xs text-muted-foreground">
                  Parachoot Live TV v1.0.0
                </div>
              </SheetContent>
            </Sheet>
          </div>
      </div>

      {/* Hero Section */}
      <div className="stadium-bg pb-8 px-4 pt-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Scores & Fixtures</h2>
        <DateSelector 
          days={weekDaysList} 
          selectedDay={selectedDay} 
          onSelectDay={setSelectedDay}
          onNavigate={handleDateNavigate}
        />
      </div>

      {/* Content */}
      <div className="bg-score-bg rounded-t-3xl -mt-4 min-h-[60vh] pt-4 pb-4 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
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
          style={{ 
            WebkitOverflowScrolling: 'touch',
            willChange: 'scroll-position',
            transform: 'translateZ(0)', // Force GPU acceleration
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='180' viewBox='0 0 100 180' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='wavePattern' x='0' y='0' width='100' height='180' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0,60 Q25,20 50,60 T100,60 L100,180 L0,180 Z' fill='%2322c55e' opacity='0.15'/%3E%3Cpath d='M31.8444 11.5179C29.1202 12.6468 26.7777 14.2456 25 16.1711C23.2222 14.2456 20.8798 12.6468 18.1556 11.5179C11.9008 14.1099 7.65247 19.1752 7.65247 25.0001C7.65247 30.825 11.9008 35.8902 18.1557 38.4821C20.8798 37.3533 23.2223 35.7546 25.0001 33.8291C26.7778 35.7546 29.1202 37.3533 31.8445 38.4821C38.0993 35.8902 42.3476 30.8249 42.3476 25.0001C42.3476 19.1753 38.0992 14.1099 31.8444 11.5179Z' fill='%2316a34a' opacity='0.2' transform='translate(0, 40) scale(0.8)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23wavePattern)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat-y',
            backgroundSize: '100% 180px',
            backgroundPosition: '0 0',
            backgroundAttachment: 'local', // Optimize background scrolling
          }}
        >
          <div className="relative space-y-4">
            {isLoadingMatches[activeTab] && baseLeagueGroups[activeTab].length === 0 ? (
              <div className="flex justify-center py-8 relative z-10">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            ) : (
              <>
                {baseLeagueGroups[activeTab].map((leagueGroup, index) => (
                  <LeagueSection 
                    key={leagueGroup.league.id} 
                    leagueGroup={leagueGroup} 
                    index={index}
                  />
                ))}
                {isLoading && (
                  <div className="flex justify-center py-4 relative z-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!isLoadingMatches[activeTab] && baseLeagueGroups[activeTab].length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm relative z-10">
                    No matches available
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
