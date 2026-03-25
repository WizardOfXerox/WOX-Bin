# Dark-Bin

Dark-Bin is an **extension-only** casefile surface that lives inside BookmarkFS. It is not a public
Vercel route and it is not meant to be a public target directory.

## What it is for

- private incident notes
- local-first casefiles
- evidence handoff prep
- timeline building
- exporting or queueing a casefile into the normal WOX-Bin workspace when you choose to

## What it is not for

- publishing private personal data about targets
- harassment workflows
- doxxing directories
- making anonymity claims the platform cannot honestly guarantee

## Current behavior

- runs from the extension bundle, not from the hosted Next.js app
- stores casefiles in `chrome.storage.local`
- reuses the same saved WOX-Bin profiles as the normal BookmarkFS cloud companion
- can reference:
  - local vault entries
  - offline cached hosted pastes
  - ordinary links and notes
- can export/import JSON casefile bundles
- can queue a casefile into the hosted workspace as a private Markdown draft

## Relationship to Afterdark

- **Afterdark** remains the extension-driven alternate WOX-Bin shell and launcher experience
- **Dark-Bin** is a separate, structured casefile surface

## Trust model

- extension code can still be inspected by the user or the browser
- treat it as a **private surface**, not a magical secrecy box
- if content is pushed into hosted WOX-Bin, the normal WOX-Bin storage and audit model applies

## Main files

- `bookmarkfs/src/cloud/darkbin-casefiles.js`
- `bookmarkfs/src/darkbin-surface.js`
- `bookmarkfs/src/darkbin.js`
- `bookmarkfs/src/ui/darkbin.html`
