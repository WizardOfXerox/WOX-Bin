# Secret Link mode

WOX-Bin now has two secret-link paths that share the canonical ` /s/[slug] ` route:

- **Legacy secret-mode pastes** created from the workspace
- **Zero-knowledge encrypted secret links** created from ` /secret `

## Current behavior

- Secret links use the canonical route ` /s/[slug] ` instead of ` /p/[slug] `.
- ` /p/[slug] ` automatically redirects to ` /s/[slug] ` for secret links.
- Secret links are always saved as `unlisted`.
- Secret links are excluded from:
  - public feed
  - archive
  - feed XML
  - comments
  - stars
- The workspace share UI still generates ` /s/... ` links for server-stored protected shares.
- ` /secret ` now creates client-side encrypted secret links:
  - WOX-Bin stores ciphertext plus metadata
  - the decrypt key stays in the URL fragment
  - sender-side management lives at ` /secret/manage/[slug] `
- Encrypted secret links support:
  - burn after read
  - expiry presets
  - revoke / burn-now controls
  - status lookups without opening the payload
- ` /raw/[slug] ` refuses to expose a server-side body for encrypted secret links.

## What this is for

This mode is intended for sensitive text that should behave differently from normal code or note sharing:

- credentials
- one-off access codes
- short-lived notes
- private operational handoff text

Use ` /secret ` when you want zero-knowledge encrypted text sharing. Use workspace secret mode when you need a protected share inside the normal paste workflow.

If you need WOX-Bin to avoid storing the payload entirely, use **`/fragment`** instead.

## Remaining limitations

- Legacy workspace secret-mode pastes are still server-readable protected shares, not zero-knowledge links.
- There is no dedicated recipient email / delivery workflow yet.
- There is no passphrase-first secret flow yet for users who do not want raw fragment keys in the URL.
- Secret links still share the main paste table rather than a dedicated secret-only store.

## Recommended usage

- Prefer ` /secret ` over legacy secret mode for the most sensitive text handoff.
- Keep `burn after read` enabled unless there is a strong reason not to.
- Use expiration for secrets that should disappear even if never opened.
- Use ` /fragment ` when you want browser-only sharing with no server-stored ciphertext.

## Next phases

### Phase 2

- passphrase-first secret links
- recipient email / delivery flow
- richer sender-side event history
- stronger secret-only copy and templates

### Phase 3

- dedicated secret-only storage policy
- tighter audit and moderation handling for encrypted shares
- optional separate deployment posture for secret-only surfaces
