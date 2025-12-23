# Express Session Integration Documentation

## Overview
The Cat Gallery application now includes express-session middleware with MySQL session store for persistent session management.

## Features Implemented

### 1. Session Store Configuration
- **Database**: Sessions are stored in the `sessions` table in MySQL
- **Expiration**: Sessions expire after 24 hours (86400000 ms)
- **Cookie Name**: `cat_gallery_session`
- **Session Data**: Stores user authentication status and user information

### 2. Session Structure
The session table includes:
- `session_id` - Unique session identifier
- `expires` - Expiration timestamp
- `data` - Session data (JSON encoded)
- `created_at` - Session creation timestamp
- `updated_at` - Last update timestamp

### 3. Available Endpoints

#### POST /login
Authenticates user and creates a session.

**Session Data Stored:**
- `userId` - User ID
- `username` - Username
- `email` - User email
- `isAuthenticated` - Authentication flag (true)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "username",
    "email": "user@example.com"
  }
}
```

#### POST /logout
Destroys the session and clears the session cookie.

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### GET /session
Checks the current session status.

**Response (Authenticated):**
```json
{
  "isAuthenticated": true,
  "user": {
    "id": 1,
    "username": "username",
    "email": "user@example.com"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "isAuthenticated": false
}
```

## Usage Examples

### Frontend JavaScript Example

```javascript
// Check session status on page load
async function checkSession() {
    const response = await fetch('/session');
    const data = await response.json();
    
    if (data.isAuthenticated) {
        console.log('User is logged in:', data.user);
        // Update UI for logged-in user
    } else {
        console.log('User is not logged in');
        // Show login form
    }
}

// Login
async function login(email, password) {
    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
        console.log('Login successful:', data);
        // Store JWT token if needed
        localStorage.setItem('token', data.token);
        // Redirect or update UI
    }
}

// Logout
async function logout() {
    const response = await fetch('/logout', {
        method: 'POST'
    });
    
    const data = await response.json();
    console.log(data.message);
    
    // Clear stored token
    localStorage.removeItem('token');
    // Redirect to login page
}
```

## Session vs JWT

This application now uses **both** sessions and JWT:

### Sessions (Express-Session + MySQL)
- **Purpose**: Server-side session management
- **Storage**: MySQL database
- **Use Case**: Maintain user state across requests without requiring token in every request
- **Advantages**: 
  - Automatic cookie handling by browser
  - Server-side control over session expiration
  - Can store additional session data

### JWT (JSON Web Token)
- **Purpose**: Stateless authentication
- **Storage**: Client-side (localStorage/sessionStorage)
- **Use Case**: API authentication, especially for mobile apps or third-party integrations
- **Advantages**:
  - No server-side storage needed
  - Can be used across different domains
  - Suitable for microservices

## Configuration Options

You can customize the session configuration in `app.js`:

```javascript
app.use(session({
    key: 'cat_gallery_session',     // Cookie name
    secret: SESSION_SECRET,          // Session secret (use env var in production)
    store: sessionStore,             // MySQL store
    resave: false,                   // Don't save session if unmodified
    saveUninitialized: false,        // Don't create session until something stored
    cookie: {
        maxAge: 86400000,            // 1 day (in milliseconds)
        httpOnly: true,              // Prevent XSS attacks
        secure: false                // Set to true for HTTPS
    }
}));
```

## Security Recommendations

1. **Use Environment Variables**: Move `SESSION_SECRET` to environment variable
2. **Enable HTTPS**: Set `cookie.secure: true` when using HTTPS
3. **Session Cleanup**: Add a cron job to clean up expired sessions
4. **Rate Limiting**: Add rate limiting to login endpoint
5. **CSRF Protection**: Consider adding CSRF tokens for form submissions

## Testing

### Test Session Persistence
1. Login via `/login` endpoint
2. Make a request to `/session` without sending Authorization header
3. Session should persist and return user data

### Test Logout
1. Login via `/login`
2. Call `/logout`
3. Check `/session` - should return `isAuthenticated: false`

### Test Session Expiration
Sessions automatically expire after 24 hours.

## Database Table

The sessions table is automatically managed by express-mysql-session:

```sql
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL PRIMARY KEY,
    expires BIGINT(20) UNSIGNED NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Sessions Not Persisting
- Check MySQL connection
- Verify sessions table exists
- Check cookie settings in browser (allow cookies)

### Session Data Not Available
- Ensure login endpoint is setting session data
- Check session middleware is loaded before routes
- Verify cookie is being sent with requests

### Memory Issues
- Implement session cleanup for expired sessions
- Consider reducing session expiration time
- Monitor sessions table size
