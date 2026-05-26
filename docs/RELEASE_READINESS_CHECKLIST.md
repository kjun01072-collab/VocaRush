# VocaRush Release Readiness Checklist

Use this before every production release.

## Environment And Secrets

- [ ] Environment variables are not hardcoded in client code.
- [ ] Supabase `service_role` key is not in the Expo client.
- [ ] AI provider keys are stored only in server-side secrets.
- [ ] `EXPO_PUBLIC_SUPABASE_URL` is set.
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set.
- [ ] `EXPO_PUBLIC_SITE_URL` points to the production URL.
- [ ] Google OAuth redirect URLs are configured in Google Cloud and Supabase Auth.

## Auth And Data Access

- [ ] User data access has owner checks.
- [ ] Supabase Row Level Security is enabled on user tables.
- [ ] Users can only read/write their own learning records.
- [ ] Teacher/admin-like screens do not expose private backend data through UI-only route hiding.
- [ ] Data deletion flow exists.
- [ ] Account deletion flow exists.

## App Safety

- [ ] Input validation exists for email, nickname, goals, dates, numbers, notes, and bulk imports.
- [ ] Safe error messages exist for user-facing UI.
- [ ] Internal errors are logged only for development or backend diagnostics.
- [ ] Dangerous actions have confirmation.
- [ ] Sign out warns when unsaved settings exist.

## Payment And Policies

- [ ] Restore Purchase / Manage Subscription copy exists before enabling paid features.
- [ ] Subscription management copy points users to App Store or Google Play after release.
- [ ] Refund copy points users to store policy after release.
- [ ] Prototype payment copy is removed or clearly marked before real billing.
- [ ] Privacy Policy exists.
- [ ] Terms of Service exists.

## AI Highlight Extraction

- [ ] Edge Function secrets include `OPENAI_API_KEY`.
- [ ] Edge Function secrets include `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Uploads reject unsupported file types.
- [ ] File size limit is enforced.
- [ ] AI extraction errors do not expose provider response details to users.
- [ ] Rate limiting or quota is added before broad release.

## Verification

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] Google login works from the deployed URL.
- [ ] Guest mode still opens the app.
- [ ] Invalid email is rejected.
- [ ] Invalid date/number input is rejected.
- [ ] Long bulk text is rejected or trimmed.
- [ ] Restore/manage subscription behavior is verified if payment screens exist.
- [ ] No raw DB, OAuth, API, or stack trace errors are shown to users.
