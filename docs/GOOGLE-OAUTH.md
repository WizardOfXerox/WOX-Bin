# Google sign-in (NextAuth)

WOX-Bin registers the Google provider when **`AUTH_GOOGLE_ID`** and **`AUTH_GOOGLE_SECRET`** are set in `.env.local`.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services** → **OAuth consent screen**  
   - User type: **External** (or Internal for Workspace-only).  
   - Fill app name, support email, developer contact.  
   - Scopes: defaults are enough for email/profile.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins** — add every base URL you use in the browser (scheme + host + port, no path):
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - If you open the app from another device: `http://YOUR_LAN_IP:3000`  
     Example: `http://192.168.254.102:3000`
6. **Authorized redirect URIs** — one callback per origin (NextAuth):
   - `http://localhost:3000/api/auth/callback/google`
   - `http://127.0.0.1:3000/api/auth/callback/google`
   - `http://YOUR_LAN_IP:3000/api/auth/callback/google`

7. Create → copy **Client ID** → `AUTH_GOOGLE_ID`  
   Copy **Client secret** → `AUTH_GOOGLE_SECRET`

## 2. App environment (`.env.local`)

```env
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret

# Must match the URL you type in the browser when you sign in (same host/port as origins above).
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If you only use the LAN URL on your phone/PC:

```env
NEXTAUTH_URL=http://192.168.254.102:3000
NEXT_PUBLIC_APP_URL=http://192.168.254.102:3000
```

Restart `npm run dev` after changes.

## 3. Production (e.g. Vercel)

- Origins: `https://your-domain.com`
- Redirect: `https://your-domain.com/api/auth/callback/google`
- Env: `NEXTAUTH_URL=https://your-domain.com`, `NEXT_PUBLIC_APP_URL=https://your-domain.com`, plus the Google client ID/secret.

## Troubleshooting

- **`redirect_uri_mismatch`**: Redirect URI in Google must exactly match `NEXTAUTH_URL` + `/api/auth/callback/google` (no trailing slash on the base).
- **Works on localhost but not on LAN**: Add LAN origin + redirect in Google. With **`npm run dev`**, `next.config.mjs` sets **`AUTH_TRUST_HOST=true`** by default so NextAuth uses the browser’s `Host` (you can sign in at `http://192.168.x.x:3000` even when `NEXTAUTH_URL` is still `http://localhost:3000`). The sign-in page also rewrites post-login redirects to the current origin. For **production** behind your own server, set **`AUTH_TRUST_HOST=true`** only if you trust your reverse proxy’s `Host` / `X-Forwarded-*` headers, or keep **`NEXTAUTH_URL`** equal to the URL users open.
- **Google button missing**: Both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` must be non-empty or the provider is not registered.
