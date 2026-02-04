# Supabase Setup Guide

This guide will help you set up Supabase as the backend for Parachoot Soccer.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Your Supabase project URL and API keys

## Step 1: Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Open the file `supabase-schema.sql` in this project
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the script

This will create:
- `teams` table with sample team data
- `matches` table with sample match data
- Indexes for better query performance
- Row Level Security (RLS) policies for public read access

## Step 2: Configure Environment Variables

The Supabase client is already configured with your credentials in `src/lib/supabase.ts`. The credentials are hardcoded as fallbacks, but you can also use environment variables:

Create a `.env` file in the root directory (if not already created):

```env
VITE_SUPABASE_URL=https://tihykkycbhakjdmkxeeb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Note:** The `.env` file is already in `.gitignore` to keep your keys secure.

## Step 3: Verify Database Schema

After running the SQL script, verify that:

1. **Teams table** exists with 10 sample teams
2. **Matches table** exists with sample matches (live, upcoming, and finished)
3. **Foreign key relationships** are set up between matches and teams

You can check this in the Supabase dashboard:
- Go to **Table Editor** → Check `teams` and `matches` tables
- Go to **Database** → **Foreign Keys** to verify relationships

## Step 4: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the app and check:
   - **Home page**: Should display matches from Supabase
   - **Live TV page**: Should show live matches
   - **Match Details**: Should load match details from Supabase

3. Check the browser console for any errors

## Troubleshooting

### Issue: "Error fetching matches" in console

**Solution:** 
- Verify that the SQL schema has been executed successfully
- Check that the `teams` and `matches` tables exist
- Verify that Row Level Security policies allow public read access

### Issue: Foreign key relationships not working

**Solution:**
The service includes fallback logic that fetches teams separately if joins fail. This should work automatically, but if you see errors:

1. Check the foreign key constraint names in Supabase
2. Update the foreign key names in `src/lib/supabaseService.ts` if needed
3. Or the service will automatically fall back to separate queries

### Issue: No data showing

**Solution:**
- Check that sample data was inserted (run the INSERT statements from the SQL file)
- Verify RLS policies allow SELECT operations
- Check browser console for specific error messages

## Database Schema

### Teams Table
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `short_name` (TEXT)
- `logo` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Matches Table
- `id` (UUID, Primary Key)
- `home_team_id` (UUID, Foreign Key → teams.id)
- `away_team_id` (UUID, Foreign Key → teams.id)
- `home_score` (INTEGER)
- `away_score` (INTEGER)
- `status` (TEXT: 'live', 'upcoming', 'finished')
- `minute` (INTEGER, nullable)
- `competition` (TEXT)
- `group` (TEXT, nullable)
- `venue` (TEXT, nullable)
- `start_time` (TEXT, nullable)
- `stream_url` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Next Steps

- Add authentication for user management
- Add real-time subscriptions for live match updates
- Add admin panel for managing matches and teams
- Add match statistics and analytics

