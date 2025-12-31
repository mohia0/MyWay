const API_BASE = '/api';

let currentImageId = null;
let currentImage = null;
let imageElement = null;
let canvas = null;
let ctx = null;
let comments = [];
let imageScale = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadImages();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', showImageList);
    document.getElementById('approveBtn').addEventListener('click', () => updateStatus('approved'));
    document.getElementById('requestChangesBtn').addEventListener('click', () => updateStatus('changes_requested'));
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
    const imageView = document.getElementById('imageView');
    
    container.innerHTML = '';
    
    if (images.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No images uploaded yet.</p>';
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
            </div>
        `;
        card.addEventListener('click', () => viewImage(image.id));
        container.appendChild(card);
    });

    container.style.display = 'grid';
    imageView.classList.add('hidden');
}

async function viewImage(imageId) {
    currentImageId = imageId;
    
    try {
        const response = await fetch(`${API_BASE}/images/${imageId}`);
        currentImage = await response.json();
        
        displayImage(currentImage);
    } catch (error) {
        console.error('Error loading image:', error);
        alert('Error loading image');
    }
}

function displayImage(imageData) {
    const imageList = document.getElementById('imagesList');
    const imageView = document.getElementById('imageView');
    
    imageList.style.display = 'none';
    imageView.classList.remove('hidden');

    // Set image
    imageElement = document.getElementById('mainImage');
    imageElement.src = `/uploads/${imageData.filename}`;
    imageElement.alt = imageData.originalName;
    
    document.getElementById('imageTitle').textContent = imageData.originalName;
    
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.className = `status-badge status-${imageData.status}`;
    statusBadge.textContent = formatStatus(imageData.status);

    // Setup canvas
    canvas = document.getElementById('pinCanvas');
    ctx = canvas.getContext('2d');
    
    imageElement.onload = () => {
        resizeCanvas();
        comments = imageData.comments || [];
        drawComments();
        setupCanvasClick();
    };

    // Display versions
    displayVersions(imageData.versions || []);

    // Display comments
    displayComments(comments);
}

function resizeCanvas() {
    const container = imageElement.parentElement;
    const imgRect = imageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    canvas.width = imgRect.width;
    canvas.height = imgRect.height;
    
    // Calculate scale if image is scaled
    imageScale = imageElement.naturalWidth / imgRect.width;
    
    drawComments();
}

function setupCanvasClick() {
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / imageScale;
        const y = (e.clientY - rect.top) / imageScale;
        
        const comment = prompt('Enter your comment:');
        if (comment && comment.trim()) {
            addComment(x, y, comment.trim());
        }
    };
}

window.addEventListener('resize', () => {
    if (canvas && imageElement) {
        resizeCanvas();
    }
});

async function addComment(x, y, comment) {
    try {
        const response = await fetch(`${API_BASE}/images/${currentImageId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y, comment, author: 'Client' })
        });

        if (!response.ok) throw new Error('Failed to add comment');

        const newComment = await response.json();
        comments.push(newComment);
        drawComments();
        displayComments(comments);
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment');
    }
}

function drawComments() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    comments.forEach(comment => {
        const x = comment.x * imageScale;
        const y = comment.y * imageScale;
        
        ctx.fillStyle = '#dc3545';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function displayComments(commentsList) {
    const container = document.getElementById('commentsList');
    container.innerHTML = '';

    if (commentsList.length === 0) {
        return;
    }

    commentsList.forEach(comment => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `
            <div class="comment-author">${escapeHtml(comment.author)}</div>
            <div class="comment-text">${escapeHtml(comment.comment)}</div>
            <div class="comment-date">${formatDate(comment.createdAt)}</div>
        `;
        container.appendChild(item);
    });
}

function displayVersions(versions) {
    const container = document.getElementById('versionsList');
    container.innerHTML = '';

    if (versions.length === 0) {
        container.innerHTML = '<p class="info">No version history</p>';
        return;
    }

    versions.forEach(version => {
        const item = document.createElement('div');
        item.className = `version-item ${version.status}`;
        item.innerHTML = `
            <strong>Version ${version.versionNumber}</strong> - ${formatStatus(version.status)}
            ${version.note ? `<p style="margin-top: 5px;">${escapeHtml(version.note)}</p>` : ''}
            <div class="version-meta">${formatDate(version.createdAt)}</div>
        `;
        container.appendChild(item);
    });
}

async function updateStatus(status) {
    const note = prompt(status === 'approved' ? 'Optional note:' : 'What changes are needed?');
    
    try {
        const response = await fetch(`${API_BASE}/images/${currentImageId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, note: note || '' })
        });

        if (!response.ok) throw new Error('Failed to update status');

        const result = await response.json();
        
        // Reload image data
        viewImage(currentImageId);
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

function showImageList() {
    document.getElementById('imageView').classList.add('hidden');
    document.getElementById('imagesList').style.display = 'grid';
    loadImages();
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

