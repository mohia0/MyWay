# Art Director Review Tool

A lightweight Node.js web tool for art directors to collect visual feedback on designs.

## Features

- Upload images (PNG/JPG)
- Pin-based comments on images
- Approve / Request Changes buttons
- Version history per image
- Client view (no login required)
- Admin view (simple password authentication)

## Tech Stack

- Node.js + Express
- SQLite (better-sqlite3)
- Vanilla JavaScript (no frameworks)
- Minimal, clean UI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set admin password (optional, defaults to `admin123`):
```bash
# Windows PowerShell
$env:ADMIN_PASSWORD="your-password"; node server.js

# Or create .env file with ADMIN_PASSWORD=your-password
```

3. Start the server:
```bash
npm start
```

4. Access the application:
- Client view: http://localhost:3000
- Admin view: http://localhost:3000/admin.html

## Deployment

### Fly.io

1. Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/

2. Login and launch:
```bash
fly auth login
fly launch
```

3. Set admin password:
```bash
fly secrets set ADMIN_PASSWORD=your-secure-password
```

4. Deploy:
```bash
fly deploy
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `ADMIN_PASSWORD` - Admin login password (default: admin123)

## Usage

### Admin

1. Go to `/admin.html`
2. Login with password
3. Upload images
4. Share the client view link with reviewers

### Clients

1. Open the main page
2. Click on any image to view
3. Click on the image to add pin-based comments
4. Use Approve/Request Changes buttons
5. View version history

## Project Structure

```
.
├── server.js          # Main server file
├── db.js              # Database initialization
├── auth.js            # Authentication logic
├── package.json       # Dependencies
├── public/            # Static files
│   ├── index.html     # Client view
│   ├── admin.html     # Admin view
│   ├── client.js      # Client-side logic
│   ├── admin.js       # Admin-side logic
│   └── styles.css     # Styles
├── uploads/           # Uploaded images (gitignored)
└── data.db            # SQLite database (gitignored)
```

## License

MIT

