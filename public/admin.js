const API_BASE = '/api';

let adminToken = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in (simple token check)
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
        adminToken = savedToken;
        showAdminView();
    } else {
        showLoginScreen();
    }

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
}

async function handleLogin() {
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('loginError');

    if (!password) {
        errorDiv.textContent = 'Please enter a password';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            adminToken = password; // Store password as token (in production, use proper JWT)
            localStorage.setItem('adminToken', adminToken);
            showAdminView();
            loadImages();
        } else {
            errorDiv.textContent = 'Invalid password';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Login failed';
        errorDiv.classList.remove('hidden');
    }
}

function handleLogout() {
    adminToken = null;
    localStorage.removeItem('adminToken');
    showLoginScreen();
    document.getElementById('passwordInput').value = '';
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
}

function showAdminView() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
}

async function handleUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        statusDiv.textContent = 'Please select a file';
        statusDiv.className = 'status-message error';
        return;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    statusDiv.textContent = 'Uploading...';
    statusDiv.className = 'status-message';

    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.textContent = `Image uploaded successfully: ${result.originalName}`;
            statusDiv.className = 'status-message success';
            fileInput.value = '';
            loadImages();
            
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        } else {
            const error = await response.json();
            statusDiv.textContent = error.error || 'Upload failed';
            statusDiv.className = 'status-message error';
        }
    } catch (error) {
        console.error('Upload error:', error);
        statusDiv.textContent = 'Upload failed';
        statusDiv.className = 'status-message error';
    }
}

async function loadImages() {
    try {
        const response = await fetch(`${API_BASE}/images`);
        const images = await response.json();
        displayImages(images);
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

function displayImages(images) {
    const container = document.getElementById('imagesList');
    container.innerHTML = '';

    if (images.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No images uploaded yet. Upload your first image above.</p>';
        return;
    }

    images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <img src="/uploads/${image.filename}" alt="${image.originalName}" loading="lazy">
            <div class="image-card-info">
                <div class="image-card-title">${escapeHtml(image.originalName)}</div>
                <div class="image-card-date">${formatDate(image.uploadDate)}</div>
                <div class="status-badge status-${image.status}">${formatStatus(image.status)}</div>
                <button class="btn btn-danger" style="margin-top: 10px; width: 100%;" onclick="deleteImage('${image.id}', '${escapeHtml(image.originalName)}')">Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteImage(imageId, imageName) {
    if (!confirm(`Are you sure you want to delete "${imageName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            loadImages();
        } else {
            alert('Failed to delete image');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting image');
    }
}

function formatStatus(status) {
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

