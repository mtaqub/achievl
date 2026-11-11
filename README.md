# Achievl

Turn your day into achievements: daily quests, food and water tracking, barcode
lookup, console-era themes and a Lock Screen tracker. Built with Expo (React Native).

It also has an arcade, paid for by play: crate keys come from achievement points and
loot boxes from levels and milestones. Crates spin a reel of weapon finishes (real-world
model names, original finishes); loot boxes hold titles, emblems, banners and stickers.
The odds are posted on each screen and tested in `src/arcade/__tests__`.

Purchases are designed but not connected: the products are listed in
`src/arcade/premium.ts`, and `src/services/purchases.ts` refuses every purchase until a
billing library and store products exist.

Quests, food and stats are stored on the device, with no account. The barcode lookup
calls Open Food Facts, and the forum (optional, below) talks to its own server.

## Run it

```bash
npm ci
npx expo start --web   # in a browser
npx expo start         # then open in a development build
```

The camera scanner, the Lock Screen tracker and the era app icons use native code,
so they need a development build (`npx expo run:ios`, `npx expo run:android`, or
`npx eas-cli@latest build --profile development`). They are not in Expo Go or on the web.

## Check it

```bash
npm test
npm run typecheck
npm run lint
```

These do not load the app in a browser, so also open `npx expo start --web` after
touching anything imported from `react-native`: some of its exports are missing
from `react-native-web`.

## Forum setup

The forum needs a Supabase project. Without one the app runs normally and the forum
screen says it is offline.

1. Create a project at supabase.com.
2. In the dashboard, open Authentication, then Sign In / Providers, and switch on
   **Anonymous Sign-Ins**. Players get a forum identity with no email or password.
3. Open the SQL Editor, paste all of `supabase/schema.sql` and run it. It creates the
   tables, the access rules, the posting rate limits and live updates for replies.
4. Copy `.env.example` to `.env.local` and fill in the project URL and the
   **publishable** key from Project Settings, API Keys. Never use the secret key: the
   values in this file are built into the app.
5. Restart `npx expo start`.

Moderating: reports land in the `forum_reports` table. To take something down, set
`hidden` to true on the thread or reply in the Table Editor. Turning on a CAPTCHA
under Authentication, Attack Protection is worth doing before the app is public.
