export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
}

export interface StreamSource {
  source: string;
  id: string;
  provider?: string;
  embedUrl?: string;
  headers?: Record<string, string>;
  link?: string;
  quality?: string;
  isM3u8?: boolean;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null; // Allow null for matches that haven't started or have no score yet
  awayScore: number | null; // Allow null for matches that haven't started or have no score yet
  status: 'live' | 'upcoming' | 'finished';
  minute?: number;
  competition: string;
  group?: string;
  venue?: string;
  startTime?: string;
  streamUrl?: string;
  streamSources?: StreamSource[]; // Multiple streaming sources from WeStream
}

export const teams: Team[] = [
  { id: '1', name: 'Chelsea', shortName: 'CHE', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png' },
  { id: '2', name: 'Paris Saint-Germain', shortName: 'PSG', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Paris-Saint-Germain-Logo.png' },
  { id: '3', name: 'RB Salzburg', shortName: 'RBS', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Red-Bull-Salzburg-Logo.png' },
  { id: '4', name: 'Real Madrid', shortName: 'RMA', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png' },
  { id: '5', name: 'Bayern Munich', shortName: 'BAY', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Bayern-Munich-Logo.png' },
  { id: '6', name: 'Manchester City', shortName: 'MCI', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png' },
  { id: '7', name: 'Liverpool', shortName: 'LIV', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png' },
  { id: '8', name: 'Barcelona', shortName: 'BAR', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Barcelona-Logo.png' },
  { id: '9', name: 'Arsenal', shortName: 'ARS', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png' },
  { id: '10', name: 'Juventus', shortName: 'JUV', logo: 'https://logos-world.net/wp-content/uploads/2020/06/Juventus-Logo.png' },
];

export const liveMatches: Match[] = [
  {
    id: 'live-1',
    homeTeam: teams[0], // Chelsea
    awayTeam: teams[1], // PSG
    homeScore: 0,
    awayScore: 2,
    status: 'live',
    minute: 67,
    competition: 'Champions League',
    group: 'Group A',
    venue: 'MetLife Stadium',
    streamUrl: 'https://example.com/stream1',
  },
  {
    id: 'live-2',
    homeTeam: teams[2], // RB Salzburg
    awayTeam: teams[3], // Real Madrid
    homeScore: 0,
    awayScore: 3,
    status: 'live',
    minute: 45,
    competition: 'Champions League',
    group: 'Group H',
    venue: 'Lincoln Financial Field',
    streamUrl: 'https://example.com/stream2',
  },
  {
    id: 'live-3',
    homeTeam: teams[4], // Bayern
    awayTeam: teams[5], // Man City
    homeScore: 2,
    awayScore: 1,
    status: 'live',
    minute: 78,
    competition: 'Champions League',
    group: 'Group A',
    streamUrl: 'https://example.com/stream3',
  },
];

export const upcomingMatches: Match[] = [
  {
    id: 'up-1',
    homeTeam: teams[6], // Liverpool
    awayTeam: teams[7], // Barcelona
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
    competition: 'Champions League',
    startTime: '20:00',
    venue: 'Anfield',
  },
  {
    id: 'up-2',
    homeTeam: teams[8], // Arsenal
    awayTeam: teams[9], // Juventus
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
    competition: 'Champions League',
    startTime: '21:00',
    venue: 'Emirates Stadium',
  },
  {
    id: 'up-3',
    homeTeam: teams[5], // Man City
    awayTeam: teams[0], // Chelsea
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
    competition: 'Premier League',
    startTime: '17:30',
    venue: 'Etihad Stadium',
  },
];

export const recentMatches: Match[] = [
  {
    id: 'rec-1',
    homeTeam: teams[3], // Real Madrid
    awayTeam: teams[6], // Liverpool
    homeScore: 3,
    awayScore: 1,
    status: 'finished',
    competition: 'Champions League',
  },
  {
    id: 'rec-2',
    homeTeam: teams[7], // Barcelona
    awayTeam: teams[4], // Bayern
    homeScore: 2,
    awayScore: 2,
    status: 'finished',
    competition: 'Champions League',
  },
  {
    id: 'rec-3',
    homeTeam: teams[1], // PSG
    awayTeam: teams[5], // Man City
    homeScore: 1,
    awayScore: 4,
    status: 'finished',
    competition: 'Champions League',
  },
];

export const weekDays = [
  { day: 21, name: 'MON' },
  { day: 22, name: 'TUE' },
  { day: 23, name: 'WED' },
  { day: 24, name: 'THU' },
  { day: 25, name: 'FRI' },
];
