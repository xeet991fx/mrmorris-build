# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your MrMorris application.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: `MrMorris` (or your preferred name)
5. Click "CREATE"

## Step 2: Enable Google+ API

1. In your Google Cloud Project, go to **APIs & Services > Library**
2. Search for "Google+ API"
3. Click on it and press "ENABLE"

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** (unless you have a Google Workspace account)
3. Click "CREATE"

### Fill in the required information:

**App Information:**
- App name: `MrMorris`
- User support email: Your email address
- App logo: (Optional) Upload your app logo

**App Domain:**
- Application home page: `http://localhost:3000` (or your domain)
- Application privacy policy link: `http://localhost:3000/privacy` (or your privacy policy URL)
- Application terms of service link: `http://localhost:3000/terms` (or your terms URL)

**Authorized domains:**
- For development: Leave empty or add `localhost`
- For production: Add your domain (e.g., `mrmorris.com`)

**Developer contact information:**
- Add your email address

4. Click "SAVE AND CONTINUE"

### Scopes:

5. Click "ADD OR REMOVE SCOPES"
6. Add these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Click "UPDATE" and then "SAVE AND CONTINUE"

### Test users (for development):

8. Add test users (your Google account emails)
9. Click "SAVE AND CONTINUE"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. Choose application type: **Web application**
4. Name: `MrMorris Web Client`

### Authorized JavaScript origins:

Add these URLs:
```
http://localhost:5000
http://localhost:3000
```

For production, add:
```
https://your-backend-domain.com
https://your-frontend-domain.com
```

### Authorized redirect URIs:

Add this URL for development:
```
http://localhost:5000/api/auth/google/callback
```

For production:
```
https://your-backend-domain.com/api/auth/google/callback
```

5. Click "CREATE"

## Step 5: Copy Your Credentials

After creating the OAuth client, you'll see a modal with:
- **Client ID**: Something like `123456789-abc123xyz.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abc123xyz`

Copy these values!

## Step 6: Update Environment Variables

### Backend (.env file)

Update your `backend/.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Make sure these are also set correctly
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local file)

Update your `frontend/.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Step 7: Test the Integration

1. **Start your backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start your frontend server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Google Login:**
   - Go to `http://localhost:3000/login`
   - Click the "Continue with Google" button
   - You should be redirected to Google's login page
   - After successful login, you'll be redirected back to your app

## Production Deployment

### Update OAuth Credentials for Production:

1. Go back to **Google Cloud Console > APIs & Services > Credentials**
2. Click on your OAuth 2.0 Client ID
3. Add production URLs to:

**Authorized JavaScript origins:**
```
https://your-backend-domain.com
https://your-frontend-domain.com
```

**Authorized redirect URIs:**
```
https://your-backend-domain.com/api/auth/google/callback
```

4. Update your production environment variables:

```bash
# Backend production .env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

### Verify Your App (for production):

If you want to remove the "This app isn't verified" warning:

1. Go to **OAuth consent screen**
2. Click "PUBLISH APP"
3. For full verification (to remove all warnings):
   - Click "Prepare for verification"
   - Follow Google's verification process
   - This may take a few days to weeks

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Solution:** Make sure the redirect URI in your Google Console exactly matches:
```
http://localhost:5000/api/auth/google/callback
```
(No trailing slash, correct protocol, correct port)

### Error: "Access blocked: This app's request is invalid"

**Solution:**
- Make sure you've enabled the Google+ API
- Check that your OAuth consent screen is properly configured
- Verify your scopes are correct

### Error: "This app isn't verified"

**Solution:** This is normal for development. Add your email as a test user in the OAuth consent screen.

### Error: "The redirect URI in the request does not match the ones authorized"

**Solution:** Check that `BACKEND_URL` in your `.env` file matches the authorized redirect URI exactly.

## Security Best Practices

1. **Never commit credentials**: Add `.env` to `.gitignore`
2. **Use different credentials**: Use separate OAuth clients for development and production
3. **Rotate secrets**: Periodically rotate your client secret
4. **Limit scopes**: Only request the scopes you actually need
5. **Monitor usage**: Regularly check the Google Cloud Console for unusual activity

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
