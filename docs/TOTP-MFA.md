# TOTP MFA

WOX-Bin supports **authenticator-app MFA** as an account setting.

## What it does

- lets a user enroll an authenticator app from **Settings → Account**
- generates a QR code and a manual secret
- requires one valid TOTP code before MFA becomes active
- generates one-time **recovery codes**
- adds a second-step challenge at **`/sign-in/mfa`** after the primary sign-in method succeeds

Supported primary sign-in methods:

- password
- Google
- email magic link

## Storage model

WOX-Bin stores:

- encrypted TOTP secret in `user_totp_factors`
- hashed recovery codes in `user_totp_recovery_codes`
- short-lived setup sessions in `user_totp_setup_sessions`
- short-lived sign-in tickets in `mfa_login_tickets`

The TOTP secret is encrypted with logic in `lib/crypto.ts` using `AUTH_SECRET` as the root secret material.  
There is no separate MFA environment variable.

## Enrollment flow

1. User opens **Settings → Account**
2. User starts authenticator setup
3. WOX-Bin shows a QR code and manual secret
4. User enters a 6-digit code from the authenticator app
5. WOX-Bin enables MFA and shows recovery codes

Recovery codes should be copied or downloaded immediately. They are shown once at generation time.

## Sign-in flow

1. User signs in with password, Google, or magic link
2. If MFA is enabled, WOX-Bin creates a short-lived MFA ticket
3. User is redirected to **`/sign-in/mfa`**
4. User enters either:
   - authenticator code
   - recovery code
5. WOX-Bin completes the session only after that second step succeeds

## Disable / recovery behavior

- users with a password can disable MFA by confirming the current password
- users without a password can disable MFA using an authenticator code or recovery code
- recovery codes are one-time use
- recovery codes can be regenerated from account settings, which invalidates the old set

## Operator notes

- after adding these tables, run `npm run db:push`
- no extra deployment env vars are required beyond the existing auth/env setup
- if `AUTH_SECRET` changes, existing encrypted TOTP secrets can no longer be decrypted; users would need to re-enroll MFA
