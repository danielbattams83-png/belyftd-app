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
