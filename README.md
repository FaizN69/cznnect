# Cznnect

A private app for one family of cousins. This is **stage 1**: accounts, a family space with an invite code, member list, profile editing, and the five-tab app shell. The other tabs show what is coming. The full plan is in [docs/PLAN.md](docs/PLAN.md).

## Where things live

```
index.html                 page shell, fonts, app icon links
src/config.ts              YOUR Supabase URL and key go here
src/App.tsx                signed out or signed in?
src/Authed.tsx             finds your family, or asks you to start or join one
src/components/            AuthScreen, FamilySetup, Shell (bottom tabs), Logo, Icons
src/pages/                 Home, Profile, ComingSoon (placeholder tabs)
src/index.css              colors, fonts, shared button and card styles
public/                    manifest, offline service worker, app icons
supabase/01_accounts.sql   the database for this stage
.github/workflows/         builds and publishes the site on every push to main
docs/PLAN.md              architecture, data model, stages
```

## Set it up (about 15 minutes, all doable on a phone)

**1. Supabase (the database)**

1. Sign up at [supabase.com](https://supabase.com) and create a free project. Pick a region near you.
2. Authentication > Sign In / Providers > Email: turn **Confirm email** off. Otherwise each cousin has to wait for a confirmation email, and the free email limit is very small.
3. SQL Editor > New query. Open `supabase/01_accounts.sql` in this repo, copy all of it, paste it in, and press **Run**. It should say success.
4. Project Settings > API: copy the **Project URL** and the **anon / publishable key**.

**2. Put the keys in the app**

1. In this repo on GitHub, open `src/config.ts` and tap the pencil icon.
2. Replace `PASTE_YOUR_PROJECT_URL` and `PASTE_YOUR_ANON_KEY`, then commit. The anon key is safe to be public, because the privacy rules in the SQL protect your data.

**3. Publish it**

1. Repo Settings > Pages > Source: choose **GitHub Actions**.
2. Open the **Actions** tab. A run called "Deploy to GitHub Pages" starts after every commit. When it turns green, the site is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.
3. If a run fails, open it and tap the failed step. The message there tells us what to fix.

**4. Test it**

1. Open the site. Create an account, then create a family.
2. Copy the invite from Home.
3. In a private browser tab, create a second account and join with the code.
4. Both people should now see each other in Family members.
5. In Chrome, menu > **Install app** (or Add to Home screen).

## Run it on a computer (optional)

```
npm install
npm run dev
npm run typecheck
```

## Next

Stage 2 is the shared family tree.

## Themes

Cznnect has two looks: **Light** (default) and **Tactical Dark**. Pick one, or follow the phone's setting, in My Profile > Appearance. The choice is saved on the device. Colors and shapes for both live as tokens at the top of `src/index.css`, and the switching code is `src/theme.ts`.
