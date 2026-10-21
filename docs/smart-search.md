# Smart Search & Discovery

Open the header search button or press Ctrl/Cmd+K. Escape or the close button dismisses the native modal, which keeps keyboard focus inside while open and restores focus on close.

Search uses a small local intent matcher, without an LLM, external search API, or per-query cost. Queries stay in the browser. Exact titles rank highest, followed by tags and related intent words (encouragement, goals, doubt, stress, habits), then body text. Quick/short requests prefer shorter body text as a ranking hint; this does not claim a measured recording duration.

The initial catalog uses the verified mentor recording inventory already bundled with the app. Opening search lazily adds all accessible Firestore units, including text-only lessons, from modules 1–5 (the current production ingestion modules). Optional `tags: string[]` and `description: string` fields on unit documents improve ranking. Authentication/tier changes clear the session's fetched lesson data and reload accessible units. Failed module requests retain available results and offer Retry.

Mentor/language/media filters require one matching non-empty media variant. A search for Omari in Chinese cannot match a unit merely because it also has Sophie's Chinese recording. Blank audio/video URLs do not qualify. Each unit appears once regardless of recording count. Search opens `/courses/:moduleId/units/:unitId` through the existing route guard; it does not request signed playback URLs or alter subscription access.

The UI renders up to 30 results with the total count and asks for refinement when more match. No unit document bodies are bundled solely for search. Search needs no additional credentials or deployment configuration.
