import { supabase } from './supabase';
import { Team, Match } from '@/data/mockData';

// Database table types (adjust based on your actual schema)
interface TeamRow {
  id: string;
  name: string;
  short_name: string;
  logo: string;
}

interface MatchRow {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: 'live' | 'upcoming' | 'finished';
  minute?: number;
  competition: string;
  group?: string;
  venue?: string;
  start_time?: string;
  stream_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Transform database row to Team
const transformTeam = (row: TeamRow): Team => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name,
  logo: row.logo,
});

// Transform database row to Match
const transformMatch = (row: MatchRow, homeTeam: Team, awayTeam: Team): Match => ({
  id: row.id,
  homeTeam,
  awayTeam,
  homeScore: row.home_score,
  awayScore: row.away_score,
  status: row.status,
  minute: row.minute,
  competition: row.competition,
  group: row.group,
  venue: row.venue,
  startTime: row.start_time,
  streamUrl: row.stream_url,
});

// Teams Service
export const teamsService = {
  async getAll(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }

    return (data || []).map(transformTeam);
  },

  async getById(id: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching team:', error);
      return null;
    }

    return data ? transformTeam(data) : null;
  },
};

// Helper function to fetch match with teams
const fetchMatchWithTeams = async (matchRow: any): Promise<Match | null> => {
  try {
    // Try to fetch with join first
    const [homeTeamData, awayTeamData] = await Promise.all([
      teamsService.getById(matchRow.home_team_id),
      teamsService.getById(matchRow.away_team_id),
    ]);

    if (!homeTeamData || !awayTeamData) {
      console.warn('Could not fetch teams for match:', matchRow.id);
      return null;
    }

    return transformMatch(matchRow, homeTeamData, awayTeamData);
  } catch (err) {
    console.error('Error fetching match with teams:', err);
    return null;
  }
};

// Matches Service
export const matchesService = {
  async getAll(): Promise<Match[]> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        return [];
      }

      // Fetch teams for each match
      const matches: Match[] = [];
      for (const row of data || []) {
        const match = await fetchMatchWithTeams(row);
        if (match) matches.push(match);
      }

      return matches;
    } catch (err) {
      console.error('Error in getAll matches:', err);
      return [];
    }
  },

  async getById(id: string): Promise<Match | null> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching match:', error);
        return null;
      }

      return await fetchMatchWithTeams(data);
    } catch (err) {
      console.error('Error in getById match:', err);
      return null;
    }
  },

  async getByStatus(status: 'live' | 'upcoming' | 'finished'): Promise<Match[]> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches by status:', error);
        return [];
      }

      // Fetch teams for each match
      const matches: Match[] = [];
      for (const row of data || []) {
        const match = await fetchMatchWithTeams(row);
        if (match) matches.push(match);
      }

      return matches;
    } catch (err) {
      console.error('Error in getByStatus matches:', err);
      return [];
    }
  },

  async getLive(): Promise<Match[]> {
    return this.getByStatus('live');
  },

  async getUpcoming(): Promise<Match[]> {
    return this.getByStatus('upcoming');
  },

  async getRecent(): Promise<Match[]> {
    return this.getByStatus('finished');
  },
};

