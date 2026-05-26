# Google Login Setup

VocaRush already calls Supabase Auth with `provider: "google"`. If Google login returns `provider is not enabled`, the app code is reaching Supabase but the Supabase Google provider has not been enabled yet.

## Production URLs

- App URL: `https://vocarush.vercel.app/`
- Supabase project URL: `https://fpomjhxvrmalwddgaxri.supabase.co`
- Supabase OAuth callback URL: `https://fpomjhxvrmalwddgaxri.supabase.co/auth/v1/callback`

## Google Cloud

Create one OAuth client in Google Cloud:

1. Go to Google Cloud Console > Google Auth Platform > Clients.
2. Create an OAuth client ID.
3. Application type: `Web application`.
4. Authorized JavaScript origins:
   - `https://vocarush.vercel.app`
   - `http://localhost:3000`
   - `http://localhost:8081`
5. Authorized redirect URIs:
   - `https://fpomjhxvrmalwddgaxri.supabase.co/auth/v1/callback`
6. Save the Client ID and Client Secret.

Do not put the Google Client Secret in Expo, Vercel public env, or frontend code.

## Supabase

In Supabase Dashboard for project `fpomjhxvrmalwddgaxri`:

1. Authentication > Sign In / Providers > Google.
2. Enable Google.
3. Paste the Google Client ID and Client Secret.
4. Save.

Then update Authentication > URL Configuration:

- Site URL: `https://vocarush.vercel.app`
- Redirect URLs:
  - `https://vocarush.vercel.app/**`
  - `https://*-5xwsnffpyh-5762s-projects.vercel.app/**`
  - `http://localhost:3000/**`
  - `http://localhost:8081/**`

The production app sets `EXPO_PUBLIC_SITE_URL=https://vocarush.vercel.app/`, so Google login always returns to the public app URL instead of a temporary Vercel deployment URL.

## Troubleshooting

If Safari opens `localhost:3000/#access_token=...` after Google login, the OAuth redirect was started from an old local tab or from a build that did not have `EXPO_PUBLIC_SITE_URL` set. Close the failed localhost tab, open `https://vocarush.vercel.app/` in a fresh tab, and start Google login again.

Keep Supabase Authentication > URL Configuration set like this for production:

- Site URL: `https://vocarush.vercel.app`
- Redirect URLs: include `https://vocarush.vercel.app/**`

Localhost URLs may stay in Additional Redirect URLs for development, but they should not be the Site URL for the released web app.

If Supabase logs show `redirect_to=https://vocarush.vercel.app/` but the browser still lands on `localhost:3000`, the production URL is not allow-listed or the Site URL is still set to localhost. Fix this in the Supabase dashboard before testing again.
