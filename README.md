# Fener Avı (MVP)

A hidden-object game for kids: the room is dark, the child moves a torch with a finger,
and resting the light on a hidden object "finds" it. The object flies into the tray and
that part of the picture stays coloured. When everything is found the lights come on.

Built with Expo (React Native) so the same code runs on iOS, Android and web.

## Run

```bash
npm install
npx expo start --web      # browser
npx expo start            # Expo Go / dev build on a phone
```

## Structure

- `src/game/Game.tsx` – game loop (torch, dwell-to-find, colour reveal, hints, finale)
- `src/game/Tray.tsx` – the "to find" tray with silhouettes
- `src/game/effects.tsx` – fly-to-tray, sparkle burst, confetti
- `src/scenes/bedroom.tsx` – level: background art + list of hidden objects (position, hit radius, reveal radius)
- `src/art/objects.tsx` – hidden object drawings (each supports a `tint` silhouette mode)

## Adding a level

Copy `src/scenes/bedroom.tsx`, draw a new background (or swap the SVG for image assets),
and list the hidden objects with their `x`, `y`, `r` and `fillR` in the 390 x 640 scene space.
