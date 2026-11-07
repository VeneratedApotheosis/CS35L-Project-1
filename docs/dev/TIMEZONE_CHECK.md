# Timezone checks: issue #132

Start the frontend and backend as described in the root README.

1. **First sign-in:** use an approved test account that has never signed in
   (or a throwaway test profile whose timezone is null). Sign in, then open
   `/settings` through the navigation. Its timezone should match the browser's
   timezone, available in the browser console as
   `Intl.DateTimeFormat().resolvedOptions().timeZone`. The first signed-in page
   waits until this preference is saved. Verify the `profiles.timezone` value
   in Supabase if you have access; do not modify a teammate's profile.
2. **Change and persist:** enter `Asia/Tokyo` in the Timezone field and click
   "Save timezone". Expect "Timezone saved." Refresh, then sign out and in.
   The field must still show `Asia/Tokyo`, even if the browser uses another zone.
3. **Validation:** try an empty field or `Mars/Olympus`. Expect an inline error,
   with no success message and no change to the saved timezone.
4. **Save failure and retry:** load Settings, stop the backend, change the
   timezone and save. Expect an error with your input preserved. Restart the
   backend and save again. Expect confirmation. A failed initial profile setup
   similarly offers "Try again" before showing signed-in content.
5. **Account isolation:** sign in with a second test account. Its timezone
   should be its own saved value, or its browser default if previously empty.
6. **Date labels:** the Garden and Dashboard use the updated profile timezone
   for "Not started yet". When two zones have different local dates, a habit
   starting on the later date should be future in the earlier zone and current
   in the later zone. The backend also uses the profile timezone when creating
   a habit with the default start date.
7. **Keyboard and narrow screens:** reach Settings, edit the field, use its
   suggestions, and submit using the keyboard. Check light and dark themes.

Automated tests in `frontend/src/views/Settings.test.tsx` use mocked HTTP
responses to verify initialization, persistence, validation, failure/retry,
signed-out requests, and the Garden's date-label update. They do not replace
the real Supabase checks above.
