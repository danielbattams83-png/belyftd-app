# Production mentor media

Verified on 21 October 2026 against `belyft-d-app.firebasestorage.app`, the Firestore unit documents, and the local Site Files mentor image folders.

| Mentor | Languages | Local portrait |
| --- | --- | --- |
| Sophie | English, Chinese | `public/mentors/sophie.png` |
| Omari | English, Swahili | `public/mentors/omari.png` |
| Hannah | English | `public/mentors/hannah.png` |
| Steve | English | `public/mentors/steve.png` |

The roster in `production-mentors.ts` contains only these four identities, with representative production object paths. Portraits were copied from the matching local mentor folders, rather than stock photos. Onboarding, profile, and directory screens share this roster. Unknown mentor labels and unsupported language variants are excluded from playback.

## Asset audit

`audio-asset-audit.json` records all 32 audio objects and 22 unit audio references. Every referenced object exists. Ten objects are original Hannah/Steve source copies outside `course-content/`; these were preserved. There is no `src/assets/` folder, and no audio files were found in the local `assets/` or `public/` directories.

No objects could be positively identified as legacy ringing/robotic placeholders from their paths or metadata, so no cloud recordings were deleted. Audio quality has not been assessed by listening. The fabricated lesson paths and sample daily audio catalog were removed from the app.

## Playback

- The catalog reads the five `module-1` through `module-5` collections used by the ingestion script. It exposes actual Firestore unit recordings rather than fabricated filenames, titles, or transcripts.
- The unit viewer accepts nonempty paths belonging to the current unit and a supported production mentor/language. Each variant is resolved independently; missing objects or access failures do not block the reading view.
- No media controls, empty players, or disabled media placeholders render for text-only units. Audio and video can exist independently.
- The shared course audio controls use real HTML audio events for timing, seeking, and play/pause. Metadata preloading and ten-minute V4 signed URLs support progressive playback. Resume refreshes old signed URLs; an expired-stream error gets one refresh attempt.
- Generated Coach Spark text has no ingested audio. It opens as a transcript and never plays an unrelated lesson or browser TTS fallback.
- The service worker forwards media requests and Range headers directly to Storage. Activation of version 5 removes the previous audio cache; failed network requests no longer produce fake empty audio responses.

## Backend

`getCourseMediaUrl` is deployed in `us-central1`. It checks Firebase authentication, subscription tier, unit ownership of the path, and object existence before signing.

Runtime identity: `course-media@belyft-d-app.iam.gserviceaccount.com`. Its roles are Firestore viewer on this project, Storage object viewer on this bucket, and token creator on itself for URL signing. The function explicitly uses the production bucket and retains this runtime identity in its callable options.

The Firebase CLI login was expired, so the available Google Cloud CLI credentials were used to deploy only this function. Frontend changes remain in the workspace; frontend hosting was not deployed.

Live checks confirmed Storage returns HTTP 206 with the requested 1,024 bytes for a production MP3 and the callable rejects unauthenticated requests with HTTP 401. A temporary Firebase test account confirmed that a user without a tier receives HTTP 403 and a tier-3 user receives working signed URLs for existing and newly imported recordings. Range requests to those signed URLs returned HTTP 206 with 1,024 bytes. The temporary accounts were removed. Browser playback was not manually exercised.

## Checks

- `npm run build -- --configuration development`
- `npm test -- --watch=false`
- `node --test functions/test/course-media.test.js scripts/media-service-worker.test.js`

The repository-wide lint command reports existing errors in the partner page, notification scheduler, and Firebase service. Targeted lint covers the new media components and services.

## Additional audio import (21 October 2026)

Seven new Sophie/Omari recordings were imported with `scripts/ingest_mentor_audio.py --apply`:

- Identity Theft: Omari (English), added to module-2/unit-1.
- Against All Odds: Sophie (English/Chinese), Omari (English/Swahili), added as module-5/unit-1.
- Courage: Omari (English/Swahili), added as module-5/unit-3.

The two new units use their original Library teaching text and tier 3, consistent with the existing module-5 Hope unit. Existing unit content, tier requirements, and other mentor recordings were preserved. The importer verifies checksums, skips unchanged objects, refuses to overwrite different objects, and patches audio maps with a Firestore update-time precondition. The import report lists the local sources and Storage destinations.

The player includes separate Stop (rewind while keeping the selected recording) and Close (stop and dismiss both views) controls. Closing cancels pending playback requests. The full view scrolls with its close controls kept at the top; the support shortcut moves above the mini player. Permission-denied errors explain the course access requirement.

Mentor cards now use cascading Module and Lesson selectors, with a Language selector for Sophie and Omari. Options are derived from the mentor's actual registered recordings, so languages and lessons are limited to the selected module/lesson. Selection changes do not autoplay; one Play lesson button requests the selected recording through the existing access checks.


## Reading content boundary (22 October 2026)

The unit reader obtains text exclusively through `getCourseReadingContent`, which reads
`course-content/{moduleId}/{unitId}/text.json` from private Storage after enforcing module-tier access.
This file must contain `{ "schemaVersion": 1, "contentKind": "reading", "content": "..." }`.
The callable never accepts a client-supplied filename or falls back to Firestore narration text.
Firestore retains a sanitized reading copy plus `readingContentPath` for catalog metadata.
The frontend also strips square-bracket directions and preserves acronym dash spacing in
unit readings, legacy previews, and the transcript drawer.

`seed-real-content.js` excludes narration folders, prefers original Master Files, sanitizes
reading text, and writes canonical JSON. `ingest_mentor_audio.py` uses the independent original
reading extractor when creating a new unit. Neither pipeline reads `script_elevenlabs.txt`.
Voice-generation scripts are temporary narration inputs only; never register their contents
as Firestore `textContent` or reading JSON. Audio objects and their metadata remain separate.

To repair existing active units without touching media or tier settings:

```powershell
python scripts/reprocess-reading-content.py
python scripts/reprocess-reading-content.py --apply
```

This command requires authenticated Google Cloud CLI access, previews every original source,
backs up Firestore records under ignored `tmp/`, uses optimistic Firestore updates, and verifies
both Firestore and Storage after every write. It fails if a source is missing or ambiguous.
Original Word formatting runs are concatenated verbatim; explicit paragraph and line breaks
are preserved. It does not run narration extraction or cut reading exercises from lessons.


## Full reading curriculum and module catalog (22 October 2026)

The complete library is organized in the synced Unit Documents destination under `Clean Reading Units`.
Its numbered folders follow the existing Clean Audio Texts index: 21 course modules and 136 sessions.
Six unassigned library lessons are explicitly supplemental reading (internal module-22); two reference
Word documents are exported separately and excluded from the course list. Original source files are
never changed. Reading exports retain exercises, reflection questions, and alternate source versions.

```powershell
python scripts/organize-reading-library.py
python scripts/organize-reading-library.py --apply
npm run ingest:curriculum
npm run ingest:curriculum -- --apply
```

The organizer reads original DOCX files, using audio indexes for ordering only. It produces per-source
Markdown, per-unit clean reading JSON, the module/session index, hashes, and a source manifest. The
importer automatically prefers this generated reading tree when present. It includes DOCX/JSON units
regardless of media availability, preserves existing audio/video maps, and updates canonical private
Storage JSON, Firestore reading copies, and text-free `moduleCatalog` documents. A bundled catalog
snapshot provides the same titles/order if Firestore is temporarily unavailable.

The public catalog exposes unit titles and text/media availability; it never contains lesson text or
media URLs. Firestore unit text and the canonical reading callable retain the subscription rules:
Tier 1 = Modules 1-5; Tier 2 = Modules 1-10; Tiers 3/4 = all modules, including supplemental lessons.
Accordions list all units (including locked units), sort module/unit numbers numerically, and select
the first accessible incomplete module. Completion keys use `module-N/unit-M` in the user profile;
Firestore progress document IDs encode the slash so progress writes remain valid document paths.


Subscription pricing is displayed as one vertical card stack at every screen width. The checkout
hook carries `SubscriptionPlan.moduleAccess` as the highest included core module (5, 10, or 21),
and the checkout placeholder repeats that entitlement. Prices and Tier 4 branding privileges are
unchanged. Stripe is not connected: the event hook/modal does not charge money or grant access.
Sponsor codes continue to grant tier claims; the common access policy supplies their module range.
Core Modules 1-21 are included at Tier 3/4; the existing supplemental section remains included.


For a tier-policy change, `python scripts/sync-subscription-tiers.py --apply` updates only unit
`minTier` metadata and verifies that lesson/media fields are unchanged. `python
scripts/test-storage-tier-policy.py` tests Storage rules using mocked requests/resources through
the read-only Firebase Rules test API. The application continues to play course media exclusively
through signed URLs from `getCourseMediaUrl`. Live signed playback was verified with HTTP 206
Range responses for all four tiers. A direct Firebase Storage SDK-style request returned HTTP 403;
it is not used by the app's course player. Storage rule-engine checks passed independently.
