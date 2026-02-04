import { Match } from '@/data/mockData';

export interface League {
  id: string;
  name: string;
  country: string;
  logo?: string;
  url?: string;
}

export interface LeagueGroup {
  league: League;
  matches: Match[];
}

