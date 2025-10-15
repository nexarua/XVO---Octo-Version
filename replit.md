# XVO - Modern Social Media Platform

## Overview
XVO is a fully functional, modern social media platform built with HTML, CSS, and JavaScript. It features a sleek, custom-branded UI with secure authentication, hierarchical badge system, admin controls, toast notifications, and comprehensive privacy controls.

## Features

### 🔐 Secure Authentication System
- **Password Hashing**: Secure password storage using bcrypt (10 rounds)
- **User Registration**: Create new accounts with custom profile pictures
- **Accounts Storage**: All user accounts saved in JSON files with hashed passwords
- **Session Persistence**: Stay logged in across sessions
- **Secure Logout**: From settings page with confirmation

### 👤 User Profiles
- **Display Name**: Customizable display name
- **Username**: Unique username handle (@username)
- **Profile Picture**: Upload via URL (supports external image links)
- **Default Avatar**: Professional default profile picture for new users
- **Bio**: Personal bio section
- **Stats Display**: Shows followers, following, total likes, and total retweets
- **Verified Badge**: Optional verification system for authentic accounts

### 📝 Post Features
- **Create Posts**: Post composer available on Home and your own profile
- **Mood/Status Updates**: Select your current mood with posts (😊 Happy, 😢 Sad, 😡 Angry, 🤔 Thoughtful, etc.)
- **Automatic First Post**: New users get "I am officially on XVO!" as their first post
- **Delete Posts**: Remove your own posts with confirmation
- **Like/Unlike**: Like posts with heart icon
- **Retweet**: Share posts with retweet functionality
- **Hashtag Support**: Clickable hashtags that trigger search
- **Image Uploads**: Upload images up to 9GB directly to posts
- **Location Tagging**: Add location to your posts
- **Real-time Updates**: All interactions update instantly and sync with backend

### 🎭 Anonymous Thoughts Board
- **Anonymous Posting**: Share thoughts without revealing your identity
- **Privacy Protection**: Posts are completely anonymous - no user tracking
- **Safe Space**: Express yourself freely without judgment
- **Toggle Feature**: Optional participation

### 🕰️ Memory Lane
- **Historical Posts**: See posts from the same date in previous months/years
- **Notifications**: Get notified when you have memories to view
- **Time Capsule**: Relive your past moments on significant dates
- **Automatic Detection**: System checks for memories daily

### 🔒 Privacy & Trust Features
- **Strong Privacy Settings**:
  - Control who can follow you
  - Control who can send you direct messages
  - Control if others can see your activity
- **Activity Transparency**: View exactly what data is stored about you
  - Account information
  - Number of posts and notifications
  - Privacy settings status
  - Verification status
- **Verified ID System**: 
  - Optional verification for authentic accounts
  - Blue checkmark badge for verified users
  - Request verification from settings

### 🔍 Discovery & Engagement
- **Search**: Find users and posts by keywords
- **Hashtag Search**: Click hashtags to search
- **Trending Topics**: Right sidebar shows trending topics
- **Notifications**: Get notified about likes, retweets, and new followers
- **Notification Badge**: Unread count displayed on notification icon

### ⚙️ Settings & Customization
Users can customize:
- Display Name
- Username
- Bio
- Profile Picture URL
- Password (securely hashed)
- Privacy Settings
- Request Verification
- View My Data

### 🎨 Modern UI/UX
- **Twitter-Inspired Design**: Clean, modern interface matching Twitter's aesthetic
- **Toast Notifications**: Modern, non-intrusive notifications for all actions
- **Font Awesome Icons**: Professional icons throughout
- **Dark Theme**: Sleek black and dark gray color scheme
- **Fully Responsive**: Mobile-first design with bottom navigation on phones
- **Smooth Transitions**: Polished animations and hover effects
- **Cache Control**: Proper headers to prevent stale content

## Technology Stack
- **HTML5**: Structure with semantic markup
- **CSS3**: Modern styling with CSS custom properties and flexbox
- **Vanilla JavaScript**: All functionality without frameworks
- **Font Awesome 6**: Professional icon library
- **Node.js + Express**: Backend server for persistent data storage
- **bcrypt**: Password hashing for security
- **localStorage + Backend Sync**: Hybrid data persistence
- **Multer**: Image upload handling

## Data Storage

### Backend Files (Persistent Storage)
- **accounts.json**: Stores all user accounts on the server
  - id, name, username, password (hashed)
  - displayName, bio, avatar (URL)
  - followers[], following[]
  - privacySettings (allowFollowRequests, allowDirectMessages, showActivity)
  - verifiedID (boolean)
- **posts.json**: Stores all posts on the server
  - id, userId, text, timestamp
  - likes[], retweets[], comments[]
  - mood (emoji), image (URL), location

### localStorage (Client-Side Cache)
- Mirrors backend data for fast access
- Automatically syncs with backend on changes
- **xvo_notifications**: Local notification storage
- **xvo_current_user**: Current session user ID
- **xvo_confessions**: Anonymous thoughts storage

## File Structure
- `index.html` - Main HTML structure with modern Twitter-like UI
- `script.js` - Complete application logic and data management
- `server.js` - Node.js/Express backend server with bcrypt authentication
- `accounts.json` - Persistent user account storage
- `posts.json` - Persistent post storage
- `package.json` - Node.js dependencies
- `replit.md` - This documentation file

## Running the Application
The app runs on Node.js with Express on port 5000:
```bash
node server.js
```
The server automatically serves the frontend and provides REST API endpoints for data persistence.

## API Endpoints
- `GET /api/accounts` - Fetch all accounts (passwords sanitized)
- `POST /api/accounts` - Create new account (password hashed)
- `POST /api/login` - Authenticate user with bcrypt verification
- `PUT /api/accounts/:id` - Update account (password re-hashed if changed)
- `GET /api/posts` - Fetch all posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/upload` - Upload image (up to 9GB)

## Latest Features (October 2025)

### 🏅 Hierarchical Badge System
- **Three-Tier Badges**: Black (CEO/Admins), Grey (Business), Gold (Government)
- **Transparent Display**: Badges appear with subtle transparency throughout the platform
- **Exclusive Assignment**: Only user "Alz" can assign badges with "Issued By: Alz" attribution
- **Visual Excellence**: Custom badge images for each tier with professional styling

### 👮 Admin Panel & User Management
- **Admin Access**: Exclusive admin panel for user "Alz" and designated admins
- **User Suspension**: Suspend/unsuspend users with complete action restrictions
- **Admin Privileges**: User "Alz" can grant/revoke admin privileges to other users
- **User Management**: View all users, manage badges, suspension status, and admin rights

### 🚫 Suspension System
- **Complete Restrictions**: Suspended users cannot post, react to content, or modify their profile
- **Visual Indicators**: "(SUSPENDED)" label on profiles for transparency
- **Toast Notifications**: Clear feedback when attempting restricted actions

### 📖 Profile Stories Integration
- **Dedicated Tabs**: Profile pages now have separate "Posts" and "Stories" tabs
- **Story Viewing**: View stories directly from user profiles
- **Story Creation**: Create stories from your own profile Stories tab
- **Seamless Navigation**: Easy switching between posts and stories

### 📸 Enhanced Profile Pictures
- **Direct Upload**: Camera button on profile for instant profile picture updates
- **Image Upload**: Upload images up to 9GB with instant preview
- **Auto-Sync**: Profile picture updates across all views instantly

### 🎨 XVO Branding
- **Custom Logo**: XVO logo replaces Twitter branding throughout the platform
- **Modern Navigation**: Clean, intuitive navigation with admin panel access for authorized users
- **Consistent Design**: XVO branding integrated across all UI elements

### 🔒 Security Note
**IMPORTANT**: The current implementation uses client-side authentication suitable for learning and demonstration purposes. For production use, proper server-side authentication with JWT tokens or session management should be implemented to prevent privilege escalation and bypass of restrictions.

## Key Improvements (Previous Updates)

### Security Enhancements
- **Password Hashing**: All passwords now hashed with bcrypt (10 rounds)
- **Secure Login API**: New login endpoint with password verification
- **Cache Control Headers**: Prevent browser caching of sensitive data

### User Experience Improvements
- **Toast Notifications**: Replaced all alerts with modern toast notifications
  - Success messages (green)
  - Error messages (red)
  - Info messages (blue)
- **Mood Updates**: Express your feelings with each post
- **Better Error Handling**: Comprehensive error handling throughout
- **Mobile Responsive**: Improved mobile experience with proper touch targets

### New Features
- **Anonymous Thoughts Board**: Safe space for anonymous expression
- **Memory Lane**: View posts from the same date in previous times
- **Privacy Settings**: Granular control over who can interact with you
- **Activity Transparency**: View all your data
- **Verified ID System**: Optional verification for authentic accounts

### Bug Fixes
- Fixed silent failures in fetch calls
- Improved mobile navigation
- Better responsive design for all screen sizes
- Proper error handling for image uploads
- Fixed confirm dialogs replaced with toast notifications

## Navigation
- **Bottom Navigation Bar**: Modern mobile-first navigation at the bottom of the screen
  - Home: Main feed with post composer
  - Explore: Search for users and posts
  - Notifications: View your engagement notifications
  - Profile: View and edit your profile (includes Posts and Stories tabs)
  - Anonymous: Post anonymous thoughts
  - Settings: Comprehensive settings and preferences

## Latest UI Updates (October 2025)
- **Bottom Navigation**: Clean, modern navigation bar fixed at bottom with icons and labels
- **Full-Width Layout**: Removed sidebars for immersive full-screen experience
- **Professional Settings**: Redesigned settings page with card-based sections and organized categories
- **Stories on Profile**: Stories moved from navigation to profile page for better organization
- **Memories in Settings**: Memories now accessible from settings (shown only if you have memories)
- **Mobile-First Design**: Optimized for all screen sizes with consistent 70px bottom navigation

## User Experience
1. **First Visit**: Sign up with secure password hashing
2. **Home Feed**: View all posts with mood indicators and create new ones
3. **Navigation**: Use sidebar to access different sections
4. **Profile**: View stats, edit profile in settings
5. **Settings**: Customize all account details and privacy
6. **Privacy**: Control who can follow/message you
7. **Verification**: Request verified badge
8. **Anonymous**: Share thoughts anonymously
9. **Memories**: Relive past moments
10. **Data Transparency**: View all your stored data

## Security & Privacy
- Passwords are securely hashed using bcrypt with 10 salt rounds
- Sensitive data files (accounts.json, posts.json) are NOT served statically
- Only API endpoints provide access to data, with proper sanitization
- Privacy settings allow granular control over interactions
- Activity transparency shows users exactly what data is stored
- Anonymous posting protects user identity
- Verified ID system helps identify authentic accounts
- Cache control prevents exposure of sensitive data
- Secure file serving: only index.html, script.js, uploads, and assets are publicly accessible

## Mobile Experience
- Bottom navigation bar for easy thumb access
- Optimized touch targets for all interactive elements
- Full-width content for better readability
- Toast notifications positioned above bottom nav
- Responsive images and layouts
- All features available on mobile

## Notes
- Profile pictures are loaded via URL - no image hosting needed
- All data persists in JSON files on the server
- Passwords are securely hashed with bcrypt
- Backend server required for full functionality
- Data syncs automatically between frontend and backend
- Toast notifications provide better user feedback
- Privacy settings are respected throughout the app
- Memory Lane checks run daily for notifications
