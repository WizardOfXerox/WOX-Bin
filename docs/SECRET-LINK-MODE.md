# Secret Link mode

WOX-Bin now has a first implementation of a OneTimeSecret-style sharing mode.

## Current behavior

- Each paste can opt into `secretMode`.
- Secret links use the canonical route ` /s/[slug] ` instead of ` /p/[slug] `.
- ` /p/[slug] ` automatically redirects to ` /s/[slug] ` for secret links.
- Secret links are always saved as `unlisted`.
- Secret links are excluded from:
  - public feed
  - archive
  - feed XML
  - comments
  - stars
- The workspace share UI generates ` /s/... ` links for secret pastes.
- Secret mode defaults `burn after read` to on when the user enables it in the workspace UI.

## What this is for

This mode is intended for sensitive text that should behave differently from normal code or note sharing:

- credentials
- one-off access codes
- short-lived notes
- private operational handoff text

It is not a full cryptographic secret-sharing system yet.

## Current limitations

- Secret payloads are still stored in the normal paste table.
- There is no at-rest encryption specific to secret links yet.
- There is no dedicated recipient email flow yet.
- There is no owner-side "revoke without opening" status page yet.
- Raw routes still use the normal ` /raw/[slug] ` endpoint.

## Recommended usage

- Keep `burn after read` enabled unless there is a strong reason not to.
- Use a paste password for especially sensitive content.
- Use expiration for secrets that should disappear even if never opened.

## Future phases

### Phase 2

- dedicated secret-link creation presets
- recipient email flow
- secret-specific metadata and copy
- revoke / burn-now control

### Phase 3

- secret status endpoint for sender-side checks
- tighter support for passphrase-first secrets
- better audit and moderation handling for secret-only flows

### Phase 4

- at-rest encryption for secret payloads
- possible separate storage policy for secret-mode entries
- optional onion/privacy deployment support for secret-only surfaces
