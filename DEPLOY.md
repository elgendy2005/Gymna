# Deploying Gymna to Vercel

Follow the steps in order. The order matters in one place: the production database must have its tables and the exercise library **before** the first deployment (step 3 before step 6). The exercise queries are cached for a day, so a build against an empty database would show an empty library.

Throughout, `DOMAIN` means the production domain, for example `gymna.vercel.app` or your own domain.

## What the repo already does

- `vercel.json` sets the build command to `npm run build:vercel` and runs the server functions in `fra1` (Frankfurt), next to a Neon database in `eu-central-1`. If the production database is in another region, change `regions` to match.
- `npm run build:vercel` runs `prisma generate`, then `prisma migrate deploy`, then `next build`. So every production deployment regenerates the Prisma client and applies any new migrations before the app is built. `migrate deploy` only applies the committed files in `prisma/migrations`; it never creates migrations or resets data. `prisma migrate dev` (`npm run db:migrate`) is for your own machine only.
- `postinstall` also runs `prisma generate`, so the client exists after any `npm install`.
- `.env` is git-ignored. Production values live only in Vercel.

## 1. Push the code to GitHub

Create an empty GitHub repository (no README, no .gitignore), then:

```powershell
git remote add origin https://github.com/YOUR_USER/gymna.git
git push -u origin main
```

## 2. Create the production database

Create a **new Neon project** for production (for example `gymna-prod`) in region **AWS Europe (Frankfurt), eu-central-1**. Do not reuse the development database: it holds your test data, and its credentials are on your machine.

From Neon dashboard → the new project → Connect, copy two connection strings:

- the **pooled** one (host contains `-pooler`): this is `DATABASE_URL`
- the **direct** one (same host without `-pooler`): this is `DATABASE_URL_UNPOOLED`

## 3. Create the tables and load the exercises

Run this once from your machine, in PowerShell, in the project folder. Setting the variable in the shell overrides `.env` for that window only, so `.env` keeps pointing at the development database.

```powershell
$env:DATABASE_URL_UNPOOLED = "PASTE THE DIRECT PRODUCTION STRING"

npm run db:deploy    # prisma migrate deploy: creates the tables
npm run db:seed      # loads the 876 exercises; safe to run again

Remove-Item Env:DATABASE_URL_UNPOOLED
```

Check the output of `db:deploy` before seeding: it prints the database host. It should be the production host, and it should report 6 migrations applied.

Close that PowerShell window afterwards so the production string does not linger in it.

## 4. Environment variables

Generate a fresh secret for production. Do not reuse the one in your local `.env`.

```powershell
node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"
```

| Variable | Required | Value | What it is for |
|---|---|---|---|
| `DATABASE_URL` | Yes | Neon **pooled** string | Every database query the app makes at runtime, and the exercise pages rendered during the build. |
| `DATABASE_URL_UNPOOLED` | Yes | Neon **direct** string | `prisma migrate deploy` during the build. Migrations need a direct connection, not the pooler. |
| `AUTH_SECRET` | Yes | The value generated above | Signs and encrypts the session cookies. Changing it signs everyone out. |
| `AUTH_URL` | Yes | `https://DOMAIN` (no trailing slash) | The app's public address. Auth.js builds the sign-in redirects and the Google callback URL from it. |
| `AUTH_GOOGLE_ID` | Optional | OAuth client ID from step 5 | Google sign-in. |
| `AUTH_GOOGLE_SECRET` | Optional | OAuth client secret from step 5 | Google sign-in. The Google button only appears when both Google variables are set. |

Not needed in production: `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (the AI coach was cancelled and no code reads them), and `NEON_BRANCH`, `NEON_BRANCH_ID`, `NEON_FUNCTION_HOST_SUFFIX` (written by the Neon CLI for local use).

Two rules when you enter them in Vercel:

- Add them to the **Production** environment only. Preview deployments run the same build command, including `migrate deploy`, so a preview that could see these values would migrate the production database from an unmerged branch. With the variables on Production only, preview builds fail at the migration step, which is the safe outcome. If you want working previews later, give the Preview environment its own Neon branch and its own secrets.
- A changed variable takes effect only after a new deployment. This includes the Google button, because the login page is prerendered at build time.

## 5. Google sign-in (optional)

In Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**:

- Authorized JavaScript origin: `https://DOMAIN`
- **Authorized redirect URI: `https://DOMAIN/api/auth/callback/google`**

Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

Also:

- Each domain needs its own redirect URI. If you start on `something.vercel.app` and add a custom domain later, add the second URI and update `AUTH_URL`.
- Keep `http://localhost:3000/api/auth/callback/google` on a separate OAuth client for development, or on the same one if you prefer a single client.
- On the OAuth consent screen, set the publishing status to **In production**. While it is in Testing, only the test users you list can sign in.

You can skip this step and deploy without Google; email and password sign-in works on its own.

## 6. Create the Vercel project and deploy

1. Vercel → Add New → Project → import the GitHub repository.
2. Framework preset: Next.js. Leave the build and install commands alone; `vercel.json` sets the build command.
3. Add the variables from step 4, Production only. For the first deployment you do not know the final domain yet if you use the generated `vercel.app` name: deploy once, read the domain from the project page, set `AUTH_URL` (and the Google redirect URI), then redeploy.
4. Deploy.

In the build log you should see, in this order: `prisma generate`, then `prisma migrate deploy` reporting "No pending migrations to apply", then the Next.js build.

## 7. Check the live site

- `https://DOMAIN` redirects to `/ar` and the landing page loads.
- Sign up with email and password, complete onboarding, and open the plan.
- The exercise library lists exercises and the photos load.
- Google sign-in, if configured, returns to the app signed in.
- On a phone, the browser offers to install the app (the service worker is active only in production builds).

## Later releases

Push to `main`. Vercel builds and deploys it, and the build applies any new migration first.

When a release includes a schema change:

1. On your machine, change `prisma/schema.prisma` and run `npm run db:migrate`. This creates the migration file and applies it to the development database.
2. Commit the new folder under `prisma/migrations` with the code that needs it.
3. Push. The production build runs `prisma migrate deploy`.

If a migration fails, the build stops and the previous deployment keeps serving, but the database may be partly migrated. Fix it with `prisma migrate resolve` against the production database before deploying again, and write migrations so the previous version of the app still works with the new schema (add columns before using them, remove them a release later).

If the curated exercise content changes, run the seed against production again as in step 3 (only the `db:seed` line), then redeploy so the cached exercise pages are rebuilt.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails at `prisma migrate deploy` with a connection or datasource error | `DATABASE_URL_UNPOOLED` is missing for that environment, or it is the pooled string. |
| Exercise library is empty | The database was not seeded before the build. Run step 3's seed, then redeploy. |
| Google returns `redirect_uri_mismatch` | The redirect URI in Google Cloud does not exactly match `https://DOMAIN/api/auth/callback/google`, or `AUTH_URL` points at a different domain. |
| Sign-in redirects to `localhost` | `AUTH_URL` still has the local value. |
| No Google button | One of the two Google variables is empty, or no deployment has run since they were added. |
