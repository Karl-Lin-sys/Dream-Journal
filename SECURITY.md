# Server authentication and quota boundary

Set FIREBASE_PROJECT_ID to the project used for browser login. Set GEMINI_API_KEY only on the server, and set DREAM_ALLOWED_UIDS to an explicit comma-separated list of users who may spend the server quota. An empty list denies all AI requests. Firebase ID tokens are verified server-side; signing into the UI alone does not authorize spending.

Both AI endpoints require authentication and an allowed UID, validate inputs, limit request size, and limit requests/concurrency within one process. Run behind HTTPS. For multiple server processes, use a shared rate limiter and configure provider spending limits. No source change revokes a previously exposed key or deploys Firestore rules. Firebase browser configuration contains public project identifiers, not an administrative credential; review provider restrictions and deployed rules separately.

Dream recordings and chat are personal data. Server errors do not include upstream messages or recordings. The UI explicitly sends recordings and messages to the configured AI provider.
