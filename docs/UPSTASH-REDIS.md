# Upstash Redis setup

Use this when you want distributed rate limiting in production. WOX-Bin already supports Upstash Redis through:

- [lib/rate-limit.ts](c:/Users/XIA/Desktop/Wox-Bin/lib/rate-limit.ts)
- [lib/env.ts](c:/Users/XIA/Desktop/Wox-Bin/lib/env.ts)

Without Redis, the app falls back to per-instance memory limits. That is acceptable for local dev, not for a public Vercel deployment.

## What this enables

These routes/features use Redis-backed limits when configured:

- registration
- sign-in
- forgot password / reset password
- anonymous publish
- comments
- stars
- API key creation
- API-key paste traffic
- public scraping/feed/raw access
- resend verification
- Pastebin import
- code-image export
- conversion job creation

## Required env vars

Add these to Vercel:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Apply them to:

- `Development`
- `Preview`
- `Production`

## 1. Create the Redis database

1. Go to [Upstash Console](https://console.upstash.com/).
2. Create a **Redis** database.
3. Pick a region close to your Vercel project. For a US Vercel deployment, use a US East region when available.
4. Open the database details page.

## 2. Copy the REST credentials

From the Upstash database page, copy:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Do not use a Redis TCP URL here. WOX-Bin is using the Upstash REST client.

## 3. Add the env vars to Vercel

In the Vercel project:

1. Open **Settings** -> **Environment Variables**
2. Add:

```env
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

3. Save
4. Redeploy

## 4. Local development

If you want to test the same Redis-backed limits locally, put the same values in [`.env.local`](c:/Users/XIA/Desktop/Wox-Bin/.env.local):

```env
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

Then restart:

```powershell
npm run dev
```

## 5. Verify it is active

After redeploy:

1. Sign in as admin.
2. Open `/admin/deployment`.
3. Check the **Upstash Redis** item.

You want it to say distributed rate limiting is configured.

You can also confirm the app sees the env vars in:

- [lib/deployment-readiness.ts](c:/Users/XIA/Desktop/Wox-Bin/lib/deployment-readiness.ts)

## Related docs

- [VERCEL-SETUP.md](./VERCEL-SETUP.md)
- [SECURITY.md](./SECURITY.md)
- [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)
