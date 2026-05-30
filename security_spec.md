# Security Specification - Dream Journal

## Data Invariants
1. A DreamEntry must belong to a valid authenticated user.
2. Users can only read and write their own dreams.
3. Chat messages are tied to a specific dream and inherit the privacy of that dream.
4. Timestamps must be handled correctly.

## The Dirty Dozen Payloads
1. Attempt to create a dream for another user.
2. Attempt to read a dream belonging to another user.
3. Attempt to update a dream's userId.
4. Attempt to write to a dream collection with a massive 1MB document ID.
5. Attempt to read chat messages for a dream the user doesn't own.
6. Attempt to inject a fake AI response into the chat subcollection.
7. Attempt to create a dream without a transcript.
8. Attempt to delete another user's dream.
9. Attempt to update the timestamp of an existing dream.
10. Attempt to list all dreams in the database without any filter.
11. Attempt to write a dream with an invalid `emotionalTheme` type.
12. Attempt to write a dream with more than 10 symbols (DoS check).

## Proposed Helpers
```javascript
function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
function isSignedIn() { return request.auth != null; }
function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
```
