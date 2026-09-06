# Game integrity implementation plan

Goal: fix all seven review findings and disable Lupus without deleting its code.

Architecture: authenticated callable commands own the authoritative room. A transaction updates game state and per-user projections together. Clients subscribe only to their projection and a lobby preview. Firebase UID is the player identity; custom dictionaries and settings are room-scoped. Existing game rules remain shared with the server.

## Tasks
- [x] Reproduce collecting, seer retention, custom deck and concurrent actions with service tests.
- [x] Add the transactional command engine, actor/phase validation, private projections, and deny client writes to authoritative state.
- [x] Connect room and game services to callable commands; persist settings/dictionaries; display only authorized cards.
- [x] Preserve the seer's last vision and test it; remove Lupus registration and reject its start/switch commands.
- [x] Verify unit, integration/rules tests, client/server typechecks and web build; document deployment and legacy-room cutover.

## Acceptance cases
A guest cannot alter host state or another player's action. An impostor cannot read the word or history; an Indovina player cannot read their own word. Late spectators do not block collecting. A stale Taboo card/turn command is rejected. Deck recycling uses the room dictionary. Re-entry restores saved settings. Lupus is absent from the catalog and unavailable by direct command.

## Deployment
Deploy the callable backend, database rules and web bundle together. Legacy /rooms access is denied at cutover; legacy sessions must create new rooms. No production deployment is included in this code change.

## Verification

Client typecheck, server build, full unit suite, Firebase Auth/RTDB/callable emulator scenario, and production web/PWA build verified. Source retained for Lupus; registry and backend reject it. Existing root lockfile preserved; installation verified with npm ci.
