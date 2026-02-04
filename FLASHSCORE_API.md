# FlashScore API Integration

This app uses the FlashScore API via RapidAPI to fetch live match data.

## API Configuration

### API Endpoint
- **Base URL**: `https://flashscore4.p.rapidapi.com`
- **Live Matches**: `/api/flashscore/v1/match/live/1`

### API Key
The API key is configured in `src/lib/flashscoreApi.ts`. You can also set it via environment variable:

```env
VITE_FLASHSCORE_API_KEY=your_api_key_here
```

**Current API Key**: `bffdb88075msh1832f65b5a81519p1ea775jsn5ca875a7973e`

## API Response Structure

The API returns an array of tournaments, each containing:
- Tournament information (name, country, image)
- Array of matches with:
  - `match_id`: Unique match identifier
  - `timestamp`: Unix timestamp
  - `stage`: Current minute of the match (as string)
  - `home_team` and `away_team`: Team objects with:
    - `team_id`, `name`, `short_name`, `image_path`
    - `score`: Current score
    - `red_cards`: Number of red cards
  - `odds`: Betting odds (optional)

## Integration Details

### Files Modified
1. **`src/lib/flashscoreApi.ts`**: API service for FlashScore
2. **`src/hooks/useMatches.ts`**: Updated to use FlashScore API for live matches
3. **`src/pages/Home.tsx`**: Already uses the hook (no changes needed)
4. **`src/pages/LiveTV.tsx`**: Already uses the hook (no changes needed)

### How It Works
- **Live Matches**: Fetched from FlashScore API
- **Upcoming/Recent Matches**: Fallback to Supabase (or FlashScore if endpoints available)
- **Error Handling**: Automatically falls back to Supabase if FlashScore API fails

## Usage

The API is automatically used when:
- Viewing the "Live Now" tab on the Home page
- Viewing the Live TV page

The hook `useMatches('live')` will:
1. Try to fetch from FlashScore API
2. If that fails, fallback to Supabase
3. Transform the data to match our Match interface

## Future Enhancements

- Add polling/auto-refresh for live matches
- Implement upcoming matches endpoint (when available)
- Implement recent/finished matches endpoint (when available)
- Add match details endpoint
- Add real-time score updates via WebSocket (if API supports)

## API Documentation

Full API documentation: https://rapidapi.com/rapidapi-org1-rapidapi-org-default/api/flashscore4

