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

`audio-asset-audit.json` records all 25 audio objects and 15 unit audio references. Every referenced object exists. Ten objects are original Hannah/Steve source copies outside `course-content/`; these were preserved. There is no `src/assets/` folder, and no audio files were found in the local `assets/` or `public/` directories.

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

Live checks confirmed Storage returns HTTP 206 with the requested 1,024 bytes for a production MP3 and the callable rejects unauthenticated requests with HTTP 401. Authenticated browser playback still requires a real Firebase user with the appropriate subscription tier; it was not manually exercised.

## Checks

- `npm run build -- --configuration development`
- `npm test -- --watch=false`
- `node --test functions/test/course-media.test.js scripts/media-service-worker.test.js`

The repository-wide lint command reports existing errors in the partner page, notification scheduler, and Firebase service. Targeted lint covers the new media components and services.
