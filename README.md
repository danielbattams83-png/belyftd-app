<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/cbbf5028-4323-4b5c-b73f-d3614280646a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Add your rotated xAI key as `XAI_API_KEY` in the ignored `.env.local` file. Never put API keys in Angular environment files or client-side code.
3. Run the browser app:
   `npm run dev`

To run the server-side rendered Node server with local environment variables, build first with `npm run build`, then start it with `npm run serve:ssr:local`. This loads `.env.local` into the Node server process. `XAI_API_KEY` is configured for future server-side Grok integration; the app does not call Grok yet.

## Tiered course content

Course units are stored at `modules/{moduleId}/units/{unitId}` with `minTier` (`1`, `2`, or `3`), `textContent`, and `audioUrls` / `videoUrls` maps keyed by avatar ID. Each media map value must be a Storage object path such as `course-content/{moduleId}/{unitId}/audio/{avatarId}.mp3` (or the corresponding `gs://` URI), not a tokenized download URL. The unit player fetches media through the authenticated Firebase Storage SDK so Storage rules can check access for every download.

Set the numeric `subscriptionTier` custom claim (`1`, `2`, or `3`) on authenticated users from a trusted server. The course-unit route guard checks the claim, and Firestore and Storage rules independently enforce the unit's `minTier`. The deployment must publish both `firestore.rules` and `storage.rules`.

### Sponsor codes and production lesson ingestion

Sponsor-code redemption is handled by the authenticated `redeemSponsorCode` callable function. It reads `inviteCodes/{CODE}`, assigns the tier and organization custom claims, and stores a private sponsor profile for the signed-in user. Keep invite-code documents private; only seed or update them from a trusted environment.

The ingestion script reads numbered `.docx` unit scripts, preferring `Scripts` over duplicate `Master Files`, and matches MP3/MP4 assets by the lesson number in their filename. Run a dry run first:

```sh
npm run seed:real-content -- --project belyft-d-app
```

To write the real lesson files, upload matched media, and seed the shared Friday sponsor codes, authenticate Firebase Admin with Application Default Credentials and explicitly apply the plan:

```sh
npm run seed:real-content -- --project belyft-d-app --apply
```

Set `LYFTD_SITE_FILES` if the local `Site Files` folder is not at its default mapped-drive path. Deploy the callable function and Firestore/Storage rules to `belyft-d-app` before attendees redeem codes. Course media is stored as protected Storage object paths, not public tokenized URLs, so tier rules remain effective.
