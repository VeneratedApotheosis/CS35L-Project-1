# Garden and dashboard checks: issues #112, #113, #114 and #170

Run the backend on port 3000 and the frontend on port 5173 using the root README.
Open http://localhost:5173 and sign in. These checks use the real database;
the automated frontend tests use mocked HTTP responses instead.

1. **Empty:** sign in with a test account that has no habits. The Garden shows
   "No habits yet" and a "Create your first habit" link to `/create`.
2. **Create and return:** create a habit such as "Read", 3 times every week for
   4 weeks. After saving, the URL is `/dashboard`, the heading is "Dashboard",
   and its name and goal appear without refreshing. Refresh the browser and
   confirm it is still listed. Both Dashboard and My Garden in the navigation
   show the saved habits, and the current page's link is marked as selected.
3. **Future start:** create a habit starting tomorrow in the profile's timezone.
   It shows "Not started yet" and its start date. A habit starting today has no
   such label. An unset profile timezone uses UTC, matching the backend.
4. **Account isolation:** sign out, then sign in with another test account.
   The first account's habits must not appear. Sign back in to the first account
   and confirm its habits return.
5. **Loading:** open browser developer tools, select Network, and enable slow
   network throttling. Reload the Garden. "Loading your habits…" and placeholder
   cards appear before the saved list or empty state. Restore normal speed.
6. **Error and recovery:** stop the backend with Control+C in its terminal and
   reload the Garden. It shows "Couldn't load your habits" with "Try again".
   Restart the backend, then click "Try again"; the saved list returns.
7. **Pagination:** if an account has more than 50 habits, use "Load more habits"
   to see older habits. A failed next-page request keeps already loaded habits
   visible alongside the error message.
8. **Layout:** check a narrow window, keyboard navigation, and light/dark themes.
   Long names should wrap. This milestone shows text only, with no plant art.
9. **Habit placeholder:** click a habit's name. Its `/habits/<id>` page shows
   the name and "Back to Garden". Refresh or open the URL in a new tab and
   confirm the same habit loads. This is only a placeholder, with no activity
   logging or statistics yet.
10. **Inaccessible detail:** copy a test account's habit URL, then sign in with
    a different test account and open that URL. It shows "Habit not found"
    without the original name or any other habit details. A nonexistent UUID
    produces the same message. Signed-out visitors are redirected to login.
11. **Creation failure:** stop the backend before confirming a new habit.
    Saving shows an error and leaves the form filled in; it must not redirect
    to `/dashboard`. Restart the backend and retry saving.

Automated checks from `frontend/`:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The Garden tests cover loading, emptiness, fetch failure and recovery, next-page
success/failure, profile timezone boundaries, account changes, authorization
headers, and cache refresh after creating a habit through the form.
