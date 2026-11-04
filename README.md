# SETUP COMMANDS — QR Attendance App

> **Target:** First-year students | **Expo SDK:** 54 | **Expo Go:** 54.0.8

---

## PREREQUISITES

| Tool | Download | Verify |
|---|---|---|
| Node.js (LTS) | https://nodejs.org/en | `node --version` |
| VS Code | https://code.visualstudio.com | (open it) |
| Expo Go 54.0.8 | Play Store → "Expo Go" | (version in app settings) |

---

## STEP 1 — Create the App

```powershell
cd D:\QR-ATT
npx create-expo-app@latest qr-att

# When prompted, select "SDK 54"
# Wait for npm install (~2 min)
```

---

## STEP 2 — Install Matching Versions

The default install may need these fixed versions that match Expo Go 54.0.8:

```powershell
npm install expo@~54.0.35 react@19.1.0 react-native@0.81.5 expo-router@~6.0.24 @expo/vector-icons@^15.0.3 expo-linking@~8.0.12 expo-constants@~18.0.13 expo-font@~14.0.12 expo-status-bar@~3.0.9 expo-splash-screen@~31.0.13 react-native-screens@~4.16.0 react-native-safe-area-context@~5.6.0 react-native-gesture-handler@~2.28.0 react-native-reanimated@~4.1.1 react-dom@19.1.0 react-native-web@~0.21.0 @types/react@~19.1.0 typescript@~5.9.2 --legacy-peer-deps
```

---

## STEP 3 — Start

```powershell
npx expo start
```

Scan QR code with Expo Go. Or press `W` for web.

---

## ADMIN SETUP — Teacher Approval

1. Open `supabase/schema.sql` in Supabase SQL Editor and run the full updated schema. Existing teacher accounts are marked approved; new teacher signups start pending.
2. In Supabase, open **Authentication → Users** and copy the user ID for the account that will be the first admin.
3. Run this query in SQL Editor, replacing the placeholder with that user's ID:

```sql
update public.profiles
set role = 'admin', teacher_status = 'not_applicable'
where id = 'PASTE-USER-ID-HERE'
returning id, email, role;
```

4. Sign out and back in. The **Admin** tab will show pending requests and teacher accounts. Approving a request enables teacher event tools; rejecting it leaves those tools unavailable.
5. Install the Supabase CLI, then deploy the protected account-removal function:

```powershell
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy delete-teacher-account
```

The function permanently deletes the selected teacher's Auth account. Their profile and attendance records are deleted; events they created remain without an owner. Never put the Supabase service-role key in the app or its `EXPO_PUBLIC_` environment variables.

Approved teachers can delete their own events or clear their event history from **History**. Admins can manage all events there. Deleting events also permanently deletes the attendance records linked to those events.

---

## TROUBLESHOOTING

| Problem | Solution |
|---|---|
| npm install fails | Use `npm install --legacy-peer-deps` |
| App crashes in Expo Go | Make sure all versions match STEP 2 exactly |
| QR won't scan | Phone + computer on same WiFi |
| White screen | Wait 10s, or shake → Reload |
| TypeScript errors | Run `npx tsc --noEmit` |
