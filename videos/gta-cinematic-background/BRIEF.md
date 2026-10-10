---
workflow: general-video
flow: automation
storyboard: no
message: "A realistic GTA atmosphere for the authenticated GuildVault panels"
destination: website-background
aspect: 1920x1080
language: pt-BR
length: 50s
---

## Intent

Replace the cartoon map with genuine GTA game graphics. The user explicitly requested Hyperframes and multiple GTA V or GTA VI images. Use five official GTA VI screenshots with restrained camera motion and 1.2-second dissolves. Each image holds for approximately ten seconds; the 50-second cycle is an implementation choice.

## Assets

- assets/night.jpg — Vice City 08, city at night.
- assets/keys.jpg — Leonida Keys 01, islands, bridge and seaplane.
- assets/skyline.jpg — Vice City 03, buildings and streets.
- assets/crew.jpg — Jason and Lucia 01, characters with city backdrop.
- assets/vice-city.jpg — Vice City 01, airport sign and jet at sunset.
- assets/gsap.min.js — GSAP 3.14.2, frozen locally for reproducible playback.

## Notes

- This is an image-based camera composition, not gameplay footage.
- No login changes, narration, music, text, invented characters, filters or cartoon elements.
- Keep source colors. Source objects stay fixed relative to each scene; only framing and transitions move.
- Ship the live Hyperframes composition in an iframe; the React host controls the registered timeline. No MP4 export is needed for this deliverable.
- Pause on the existing movement control, hidden browser tabs and reduced motion. Use a still image when movement is disabled.
