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

Everything is stored on the device. There is no account and no API key; the only
network call is the barcode lookup against Open Food Facts.

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
