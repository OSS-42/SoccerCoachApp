# Soccer Coach Tracker - Web App Deployment Guide

This guide will help you deploy the Soccer Coach Tracker web application to various hosting services. This is a pure web application (HTML, CSS, and JavaScript) with no backend requirements.

## What to Deploy

The `dist/` folder contains everything needed for deployment:
- `index.html` - Main application file
- `css/` - Stylesheet files
- `js/` - JavaScript application code
- `img/` - Images used by the application

## Deployment Options

### 1. Basic Web Hosting (FTP/SFTP)

Most traditional web hosting services offer FTP or SFTP access.

1. Connect to your hosting account using an FTP client (like FileZilla)
2. Navigate to your public web directory (often called `public_html`, `www`, or `htdocs`)
3. Upload all contents from the `dist/` directory
4. Your app should now be accessible at your domain/subdomain

### 2. GitHub Pages

1. Create a new GitHub repository
2. Upload the contents of the `dist/` directory to the repository
3. Go to Settings → Pages
4. Select the branch your files are on (usually `main`)
5. Save, and your site will be available at `username.github.io/repository-name`

### 3. Netlify (Free Static Site Hosting)

1. Create a free Netlify account at netlify.com
2. Click "New site from Git" or just drag and drop your `dist/` folder onto the Netlify dashboard
3. If using drag and drop:
   - Simply drop the folder and Netlify will deploy it
   - Your site will be available at a random subdomain (e.g., `random-name.netlify.app`)
   - You can set a custom subdomain under site settings

### 4. Vercel (Free Static Site Hosting)

1. Create a free Vercel account at vercel.com
2. Install the Vercel CLI: `npm i -g vercel`
3. Navigate to your `dist/` directory
4. Run `vercel`
5. Follow the prompts to deploy your app
6. Your site will be available at `project-name.vercel.app`

### 5. Firebase Hosting

1. Create a Firebase account and a new project
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Login with `firebase login`
4. Initialize your project with `firebase init` (select Hosting)
   - Set `dist/` as your public directory
   - Configure as a single-page app: No
   - Set up automatic builds and deploys: No
5. Deploy with `firebase deploy`
6. Your app will be available at `project-id.web.app`

## Testing After Deployment

After deploying, verify:

1. All pages load correctly
2. CSS styles are applied properly
3. All JavaScript functionality works
4. Images load correctly
5. Data is saved to localStorage as expected

## Troubleshooting

- **Missing assets**: Check if all files from the `dist/` directory were uploaded
- **CSS not loading**: Check for correct paths in the HTML files
- **JavaScript errors**: Open browser developer tools (F12) to check for errors
- **Permissions issues**: Make sure files have proper read permissions on the server

## Remember

The Soccer Coach Tracker stores all data in the browser's localStorage. This means:
- Data is specific to each user's browser
- Data doesn't sync between devices (users can manually export/import)
- Clearing browser data will reset the app