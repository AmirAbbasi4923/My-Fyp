# ⚡ Quick Start Guide - Table Already Exists

If the `profiles` table is already set up in Supabase, follow these steps:

## ✅ Step 1: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Log in and open the **Asaan Zindagi** project
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL** → This is `VITE_SUPABASE_URL`
   - **anon/public key** → This is `VITE_SUPABASE_ANON_KEY`

## ✅ Step 2: Create `.env` File

1. In the `asaan-heal-flow` folder, create a file named `.env`
2. Add this content (replace with your actual values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:**
- No spaces around the `=` sign
- No quotes needed
- File must be named exactly `.env` (with the dot)

## ✅ Step 3: Install Dependencies

```bash
npm install
```

## ✅ Step 4: Start Development Server

```bash
npm run dev
```

## ✅ Step 5: Open Browser

Go to: `http://localhost:8080`

## ✅ Step 6: Test

1. Click "Sign Up"
2. Create a test account
3. Sign in with your test account
4. You should see the Home page! 🎉

---

## 🐛 Troubleshooting

**"Missing Supabase env vars" error?**
- Check that `.env` file exists in `asaan-heal-flow` folder
- Restart the dev server after creating `.env`

**Can't connect to database?**
- Verify your Supabase credentials are correct
- Check that the project is active (not paused)

**Need more help?** See `SETUP.md` for detailed instructions.

