# Runbook: deployment rollback

Use this when a WOX-Bin production deploy is live but unhealthy.

## When to roll back

Roll back if any of these are true after a deploy:

- `/api/health` is returning `503`
- sign-in, public paste views, or `/app` are throwing new `5xx` errors
- Discord interactions or admin actions stop responding after the deploy
- a migration or env change shipped with the release and the new state is clearly broken

## First response

1. Run `powershell -File scripts/check-health.ps1 -BaseUrl https://wox-bin.vercel.app`.
2. Run `powershell -File scripts/verify-deployment.ps1 -BaseUrl https://wox-bin.vercel.app`.
3. Open Vercel logs for the failing routes before changing anything.
4. Confirm whether the issue is:
   - code-only
   - environment-only
   - migration / database state

## Code-only rollback

If the failure is code-only and database state is still compatible:

1. Open the previous healthy deployment in Vercel.
2. Promote or redeploy that known-good build.
3. Re-run the health and deployment verification scripts.
4. Record the rollback reason in your internal ops notes and the next changelog entry.

## Environment rollback

If the code is fine but the deploy shipped a bad env change:

1. Restore the previous env values in Vercel.
2. Trigger a new production deployment.
3. Re-run the health and deployment verification scripts.
4. Verify Discord portal endpoints, auth, and public paste views before closing the incident.

## Migration rollback

Do not improvise a destructive database rollback on production.

1. Stop and assess whether the new schema can stay in place while code is rolled back.
2. If data repair is needed, restore into staging first using [RUNBOOK-BACKUPS.md](./RUNBOOK-BACKUPS.md).
3. Validate the restore and repair path before touching production data.
4. Only restore production from backup if the staged restore path is confirmed and the incident severity justifies it.

## After the rollback

1. Confirm `/api/health` is `200`.
2. Confirm `scripts/verify-deployment.ps1` passes.
3. Smoke-test:
   - `/sign-in`
   - `/app`
   - `/feed`
   - one public paste
   - `/admin/deployment`
   - `/admin/discord` if Discord is enabled
4. Document the root cause and the specific guardrail that should prevent the same incident next time.

## Related

- [MONITORING.md](./MONITORING.md)
- [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)
- [RUNBOOK-BACKUPS.md](./RUNBOOK-BACKUPS.md)
