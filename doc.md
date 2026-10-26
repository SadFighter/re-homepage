## re: panel — User Profiles & Submenus

This update brings actual personalization to the homepage (while still keeping the `re:` panel loaded with aesthetic slop). 

## What's New

**User Profile & Timezone Greeting**
- Added a new `user` block to the JSON config. If provided, a sleek pill appears in the top-right corner showing your name, live local time, and timezone.
- A dynamic greeting now appears above the search bar. It picks randomly from a pool of greetings based on the time of day (morning, afternoon, evening, night). There is a 50% chance it will append your name to the greeting (e.g., *"Good evening, Saddo."*).

**Font Menu Sub-menu**
- The font customization list inside the `re:` panel was getting too long. It has been moved into its own sub-menu. Clicking **"Customize Fonts"** now slides to a dedicated view with a "Back" button, keeping the main `re:` menu clean.

**JSON Export Compatible**
- If you hit "Load bookmarks" to export your config, the new `user` block is automatically included so you never lose your profile.

## Known Caveats
- Timezones require a valid IANA timezone string (e.g., `"Europe/Rome"`, `"America/New_York"`). If omitted, it defaults to UTC.
