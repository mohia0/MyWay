const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Simple password auth - in production, use proper session management
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Default for development
let passwordHash = null;

// Initialize password hash
function initPassword() {
  const hashPath = path.join(__dirname, '.admin_hash');
  
  if (fs.existsSync(hashPath)) {
    passwordHash = fs.readFileSync(hashPath, 'utf8').trim();
  } else {
    // Create hash from default/admin password
    passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    fs.writeFileSync(hashPath, passwordHash);
  }
}

// Verify password
function verifyPassword(password) {
  if (!passwordHash) {
    initPassword();
  }
  return bcrypt.compareSync(password, passwordHash);
}

// Set new password (for admin use)
function setPassword(newPassword) {
  passwordHash = bcrypt.hashSync(newPassword, 10);
  const hashPath = path.join(__dirname, '.admin_hash');
  fs.writeFileSync(hashPath, passwordHash);
  return true;
}

// Simple admin authentication middleware
// In production, use proper session management
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  
  // Simple token check (in production, use JWT or proper sessions)
  // For now, we'll accept the password as token for simplicity
  if (verifyPassword(token)) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Initialize on module load
initPassword();

module.exports = { authenticateAdmin, verifyPassword, setPassword };

