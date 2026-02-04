import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ArrowLeft, Globe, Medal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { flashscoreApi, Country, TournamentInfo } from '@/lib/flashscoreApi';

export const ExplorePage: React.FC = () => {
  const [view, setView] = useState<'countries' | 'tournaments'>('countries');
  const [loading, setLoading] = useState(false);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const FOOTBALL_SPORT_ID = 1;

  // Fetch Countries on Load
  useEffect(() => {
    const fetchCountries = async () => {
      setLoading(true);
      try {
        const data = await flashscoreApi.getCountries(FOOTBALL_SPORT_ID);
        setCountries(data);
      } catch (error) {
        console.error('Failed to fetch countries', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch Tournaments when Country Selected
  const handleCountrySelect = async (country: Country) => {
    setSelectedCountry(country);
    setLoading(true);
    try {
      const data = await flashscoreApi.getTournaments(FOOTBALL_SPORT_ID, country.country_id);
      setTournaments(data);
      setView('tournaments');
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to fetch tournaments', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'tournaments') {
      setView('countries');
      setSelectedCountry(null);
      setSearchQuery('');
    }
  };

  // Filter items based on search query
  const filteredItems = () => {
    const query = searchQuery.toLowerCase();
    if (view === 'countries') {
      return countries.filter(c => c.name.toLowerCase().includes(query));
    }
    if (view === 'tournaments') {
      return tournaments.filter(t => t.name.toLowerCase().includes(query));
    }
    return [];
  };

  const renderHeader = () => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        {view !== 'countries' && (
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl sm:text-2xl font-bold">
          {view === 'countries' && 'Explore Football'}
          {view === 'tournaments' && selectedCountry?.name}
        </h1>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${view}...`} 
          className="pl-11 h-12 bg-card border-border/50 rounded-xl" 
        />
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    const items = filteredItems();

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No results found</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item: any) => (
          <div 
            key={item.country_id || item.tournament_id}
            onClick={() => {
              if (view === 'countries') handleCountrySelect(item);
              // Tournaments might lead to matches in future, currently just list
            }}
            className="bg-card rounded-xl p-4 flex items-center justify-between border border-border/30 hover:border-primary/50 transition-colors cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-primary">
                {view === 'countries' && <Globe size={20} />}
                {view === 'tournaments' && (
                  item.image_path ? (
                    <img src={item.image_path} alt={item.name} className="w-6 h-6 object-contain" />
                  ) : (
                    <Medal size={20} />
                  )
                )}
              </div>
              <span className="font-medium">{item.name}</span>
            </div>
            {view !== 'tournaments' && <ChevronRight size={16} className="text-muted-foreground" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 safe-area-top safe-area-x">
      {renderHeader()}
      {renderContent()}
    </div>
  );
};

export default ExplorePage;
