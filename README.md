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
so they need a build installed on a phone. They are not in Expo Go or on the web.

## Put it on a phone

Build profiles are in `eas.json`. Expo builds the app in the cloud, so no Mac or
Android Studio is needed:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # an .apk to install
npx eas-cli@latest build --profile development --platform ios       # needs an Apple Developer account
npx expo start --dev-client                                         # then open the installed app
```

Before the first iOS build, change `com.achievl.app` in `app.json` (the app, widget
and group identifiers) to an identifier you own. With Xcode or Android Studio
installed, `npx expo run:ios` and `npx expo run:android` build locally instead.
`development-simulator` builds for the iOS Simulator, `preview` makes a shareable
test build and `production` is the store build.

Nothing phone-only has been run on a device yet. On the first build, check:

- the camera reads a barcode, and the torch button works
- the Lock Screen tracker appears, updates after a quest or a drink, and its
  water, food and scan shortcuts open the right screen
- switching era changes the home-screen icon
- unlock pop-ups and the crate reel give haptic feedback

## Check it

```bash
npm test
npm run typecheck
npm run lint
```

The tests include `src/live/__tests__`, which compiles the Lock Screen layouts and runs
them in a stand-in for the widget runtime, and checks them against the components
the installed native renderer can draw.

These do not load the app in a browser, so also open `npx expo start --web` after
touching anything imported from `react-native`: some of its exports are missing
from `react-native-web`.
