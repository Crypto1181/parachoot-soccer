-- 1. Allow public read access to the avatars bucket
-- This allows anyone (even without logging in) to see profile pictures
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 2. Allow authenticated users to upload files
-- This allows any logged-in user to upload a file to the avatars bucket
create policy "Authenticated users can upload avatars"
on storage.objects for insert
with check ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 3. Allow users to update/delete their own files (Optional but good for cleanup)
-- This ensures users can only modify files they uploaded (based on the owner field)
create policy "Users can update their own avatars"
on storage.objects for update
using ( bucket_id = 'avatars' AND auth.uid() = owner );

create policy "Users can delete their own avatars"
on storage.objects for delete
using ( bucket_id = 'avatars' AND auth.uid() = owner );
