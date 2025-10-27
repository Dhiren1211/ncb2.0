// Base API URL - Update this to your server endpoint
const API_BASE_URL = 'http://localhost/NCB/Admin/API/api.php';

// Demo Data (fallback)
let demoData = {
    notices: [],
    events: [],
    admins: [],
    payments: [],
    gallery: [],
    applications: [],
    banners: [],
    activityLogs: []
};

let currentPaymentId = null;
let currentApplicationId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadAllData();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('adminWelcome').textContent = `Welcome, ${user.full_name || user.username}`;
        document.querySelector('.admin-avatar').textContent = (user.full_name || user.username).charAt(0).toUpperCase();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.dataset.page === 'logout') {
                e.preventDefault();
                handleLogout();
                return;
            }
            
            e.preventDefault();
            const page = this.dataset.page;
            switchPage(page);
        });
    });

    // Mobile toggle
    document.getElementById('mobileToggle').addEventListener('click', function() {
        toggleMobileSidebar();
    });

    // Sidebar overlay click
    document.getElementById('sidebarOverlay').addEventListener('click', function() {
        closeMobileSidebar();
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileSidebar();
        }
    });
}

// Get Auth Headers
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// --- API HELPER FUNCTIONS ---

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            handleLogout();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showToast(`Error loading data: ${error.message}`, 'error');
        return null;
    }
}

async function postData(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error posting to ${endpoint}:`, error);
        showToast(`Error saving data: ${error.message}`, 'error');
        throw error;
    }
}

async function postFileData(endpoint, formData) {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });
        
        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error posting file to ${endpoint}:`, error);
        showToast(`Error uploading file: ${error.message}`, 'error');
        throw error;
    }
}

async function putData(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error updating ${endpoint}:`, error);
        showToast(`Error updating data: ${error.message}`, 'error');
        throw error;
    }
}

async function deleteDataWithBody(endpoint, data) {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error deleting from ${endpoint}:`, error);
        showToast(`Error deleting data: ${error.message}`, 'error');
        throw error;
    }
}

// --- DATA LOADING AND PAGE MANAGEMENT ---

async function loadAllData() {
    try {
        showToast('Loading data from server...', 'info');
        
        const [notices, events, admins, gallery, applications, banners] = await Promise.all([
            fetchData('notices'),
            fetchData('events'),
            fetchData('admins'),
            fetchData('gallery'),
            fetchData('membership-applications'),
            fetchData('banners')
        ]);

        if (notices) demoData.notices = notices;
        if (events) demoData.events = events;
        if (admins) demoData.admins = admins;
        if (gallery) demoData.gallery = gallery;
        if (applications) demoData.applications = applications;
        if (banners) demoData.banners = banners;

        loadDashboard();
        showToast('Data loaded successfully!', 'success');
    } catch (error) {
        console.error('Error loading all data:', error);
        showToast('Server connection issues. Some features may be limited.', 'warning');
        loadDashboard();
    }
}

// Mobile sidebar functions
function toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// Page Switching
function switchPage(page) {
    // Update active menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        notices: 'Notices Management',
        events: 'Events Management',
        gallery: 'Gallery Management',
        'membership-applications': 'Membership Applications',
        banner: 'Banner Management',
        'activity-logs': 'Activity Logs',
        admins: 'Admins Management',
        payments: 'Payment Validation'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Show corresponding section
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(page).classList.add('active');

    // Load page-specific data
    switch(page) {
        case 'dashboard': loadDashboard(); break;
        case 'notices': loadNotices(); break;
        case 'events': loadEvents(); break;
        case 'gallery': loadGallery(); break;
        case 'membership-applications': loadApplications(); break;
        case 'banner': loadBanners(); break;
        case 'activity-logs': loadActivityLogs(); break;
        case 'admins': loadAdmins(); break;
        case 'payments': loadPayments(); break;
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
}

// --- PAGE-SPECIFIC LOADERS ---

function loadDashboard() {
    // Update stats
    document.getElementById('totalNotices').textContent = demoData.notices.length;
    document.getElementById('totalEvents').textContent = demoData.events.filter(e => e.status === 'Upcoming').length;
    document.getElementById('totalMembers').textContent = demoData.applications.filter(a => a.status === 'verified').length;
    document.getElementById('pendingApplications').textContent = demoData.applications.filter(a => a.status === 'pending').length;

    // Load recent notices
    const recentNotices = demoData.notices.slice(0, 3);
    const noticesHtml = recentNotices.map(notice => `
        <div class="notice-card">
            <div class="notice-title">${notice.title}</div>
            <div class="notice-content text-muted small">${notice.content.substring(0, 100)}...</div>
            <div class="notice-date mt-2">
                <i class="far fa-calendar"></i> ${formatDate(notice.created_at)}
            </div>
        </div>
    `).join('');
    document.getElementById('recentNotices').innerHTML = noticesHtml || '<p class="text-muted">No recent notices</p>';

    // Load upcoming events
    const upcomingEvents = demoData.events.filter(e => e.status === 'Upcoming').slice(0, 3);
    const eventsHtml = upcomingEvents.map(event => `
        <div class="event-card">
            <div class="event-title">${event.title}</div>
            <div class="event-date mt-2">
                <i class="far fa-calendar"></i> ${formatDate(event.start_date)}
            </div>
            <div class="event-location text-muted small mt-1">
                <i class="fas fa-map-marker-alt"></i> ${event.location}
            </div>
        </div>
    `).join('');
    document.getElementById('upcomingEvents').innerHTML = eventsHtml || '<p class="text-muted">No upcoming events</p>';
    
    // Load gallery preview
    const galleryPreview = demoData.gallery.slice(0, 4);
    const galleryHtml = galleryPreview.map(image => `
        <div class="col-6 mb-2">
            <img src="../${image.image_path}" class="img-thumbnail w-100" alt="${image.title}" style="height: 80px; object-fit: cover;">
        </div>
    `).join('');
    document.getElementById('galleryPreview').innerHTML = galleryHtml ? 
        `<div class="row">${galleryHtml}</div>` : 
        '<p class="text-muted">No gallery images</p>';
}

function loadNotices() {
    const noticesHtml = demoData.notices.map(notice => `
        <tr>
            <td><strong>${notice.title}</strong></td>
            <td>${notice.content.substring(0, 100)}...</td>
            <td>${formatDate(notice.created_at)}</td>
            <td><span class="status-badge status-published">Published</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editNotice(${notice.notice_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteNotice(${notice.notice_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    document.getElementById('noticesTable').innerHTML = noticesHtml || '<tr><td colspan="5" class="text-center text-muted">No notices found</td></tr>';
}

function loadEvents() {
    const eventsHtml = demoData.events.map(event => `
        <tr>
            <td><strong>${event.title}</strong></td>
            <td>${formatDate(event.start_date)}</td>
            <td>${event.start_date ? event.start_date.split(' ')[1] : 'N/A'}</td>
            <td>${event.location}</td>
            <td><span class="status-badge status-${event.status.toLowerCase()}">${event.status}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editEvent(${event.event_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent(${event.event_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    document.getElementById('eventsTable').innerHTML = eventsHtml || '<tr><td colspan="6" class="text-center text-muted">No events found</td></tr>';
}

function loadGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (!demoData.gallery || demoData.gallery.length === 0) {
        galleryGrid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No images in gallery</p></div>';
        return;
    }
    
    galleryGrid.innerHTML = demoData.gallery.map(image => {
        // Handle image path correctly
        const imagePath = image.image_path ? (
            image.image_path.startsWith('/') ? 
                image.image_path.substring(1) : 
                image.image_path
        ) : '';
        
        // Construct the full path relative to the current directory
        const previewPath = `../../${image.image_path}`;
        const fullImagePath = `${imagePath}`;
        
        return `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div class="card h-100">
                    <div class="gallery-image-container" style="height: 200px; overflow: hidden;">
                        <img src="${fullImagePath}" class="card-img-top gallery-image" 
                             alt="${image.title}" 
                             style="height: 100%; width: 100%; object-fit: cover;"
                             onerror="this.src='../assets/Images/placeholder.jpg'">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">${image.title || 'Untitled'}</h6>
                        <p class="card-text small text-muted flex-grow-1">${image.description || 'No description'}</p>
                        <div class="btn-group mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewImage('${previewPath}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteImage(${image.image_id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadApplications() {
    const table = document.getElementById('applicationsTable');
    
    if (!demoData.applications || demoData.applications.length === 0) {
        table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No applications found</td></tr>';
        return;
    }
    
    table.innerHTML = demoData.applications.map(app => `
        <tr>
            <td><strong>${app.full_name}</strong></td>
            <td>${app.email}</td>
            <td>${app.phone || 'N/A'}</td>
            <td>${app.visa_type}</td>
            <td>${formatDate(app.application_date)}</td>
            <td>
                <span class="badge bg-${app.status === 'pending' ? 'warning' : app.status === 'verified' ? 'success' : 'danger'}">
                    ${app.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="viewApplication(${app.application_id})">
                    <i class="fas fa-eye"></i>
                </button>
                ${app.status === 'pending' ? `
                    <button class="btn btn-sm btn-success me-1" onclick="approveApplication(${app.application_id})">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectApplication(${app.application_id})">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function loadBanners() {
    const currentBanner = document.getElementById('currentBanner');
    const bannersTable = document.getElementById('bannersTable');
    
    const activeBanner = demoData.banners.find(b => b.status === 'active');
    
    if (activeBanner) {
        currentBanner.innerHTML = `
            <img src="../${activeBanner.image_path}" class="img-fluid rounded" alt="${activeBanner.title}" style="max-height: 300px;">
            <div class="mt-3">
                <h5>${activeBanner.title}</h5>
                <p class="text-muted">Uploaded: ${formatDate(activeBanner.uploaded_at)}</p>
                <button class="btn btn-sm btn-warning" onclick="setBannerInactive(${activeBanner.banner_id})">
                    Set Inactive
                </button>
            </div>
        `;
    } else {
        currentBanner.innerHTML = '<p class="text-muted text-center">No active banner</p>';
    }
    
    if (!demoData.banners || demoData.banners.length === 0) {
        bannersTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No banners uploaded</td></tr>';
        return;
    }
    
    bannersTable.innerHTML = demoData.banners.map(banner => `
        <tr>
            <td>
                <img src="../${banner.image_path}" class="banner-thumbnail" alt="${banner.title}" style="width: 100px; height: 60px; object-fit: cover;">
            </td>
            <td>${banner.title}</td>
            <td>${formatDate(banner.uploaded_at)}</td>
            <td>
                <span class="badge bg-${banner.status === 'active' ? 'success' : 'secondary'}">
                    ${banner.status}
                </span>
            </td>
            <td>
                ${banner.status !== 'active' ? `<button class="btn btn-sm btn-primary me-1" onclick="setBannerActive(${banner.banner_id})">Set Active</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteBanner(${banner.banner_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadActivityLogs() {
    const table = document.getElementById('activityLogsTable');
    if (!demoData.activityLogs || demoData.activityLogs.length === 0) {
        table.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No activity logs</td></tr>';
        return;
    }
    table.innerHTML = demoData.activityLogs.map(log => `
        <tr>
            <td>${log.username || 'System'}</td>
            <td>${log.action}</td>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.ip_address || 'N/A'}</td>
        </tr>
    `).join('');
}

function loadAdmins() {
    const adminsHtml = demoData.admins.map(admin => `
        <tr>
            <td><strong>${admin.full_name || 'N/A'}</strong></td>
            <td>${admin.email}</td>
            <td>${admin.role}</td>
            <td><span class="status-badge status-${admin.status.toLowerCase()}">${admin.status}</span></td>
            <td>${formatDate(admin.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteAdmin(${admin.user_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    document.getElementById('adminsTable').innerHTML = adminsHtml || '<tr><td colspan="6" class="text-center text-muted">No admins found</td></tr>';
}

function loadPayments() {
    const paymentsHtml = demoData.payments.map(payment => `
        <div class="payment-card card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-lg-3 col-md-6 mb-3 mb-md-0">
                        <strong>${payment.user}</strong>
                        <div class="text-muted small">${payment.date}</div>
                    </div>
                    <div class="col-lg-2 col-md-6 mb-3 mb-md-0">
                        <strong>${payment.amount}</strong>
                    </div>
                    <div class="col-lg-3 col-md-6 mb-3 mb-md-0">
                        <div class="text-muted small">${payment.description}</div>
                    </div>
                    <div class="col-lg-2 col-md-6 mb-3 mb-md-0">
                        <img src="${payment.screenshot}" alt="Payment Screenshot" class="img-thumbnail payment-screenshot" onclick="viewPaymentDetails(${payment.id})" style="cursor: pointer; max-width: 80px;">
                    </div>
                    <div class="col-lg-2 col-md-6">
                        <span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span>
                        <button class="btn btn-sm btn-primary mt-2 w-100" onclick="viewPaymentDetails(${payment.id})">
                            Review
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('paymentsList').innerHTML = paymentsHtml || '<p class="text-muted text-center">No payments found</p>';
}


// --- MODAL FUNCTIONS ---

function openNoticeModal() {
    const modal = new bootstrap.Modal(document.getElementById('noticeModal'));
    document.getElementById('noticeForm').reset();
    modal.show();
}

function openEventModal() {
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    document.getElementById('eventForm').reset();
    modal.show();
}

function openGalleryModal() {
    const modal = new bootstrap.Modal(document.getElementById('galleryModal'));
    document.getElementById('galleryForm').reset();
    modal.show();
}

function openBannerModal() {
    const modal = new bootstrap.Modal(document.getElementById('bannerModal'));
    document.getElementById('bannerForm').reset();
    modal.show();
}

function openAdminModal() {
    const modal = new bootstrap.Modal(document.getElementById('adminModal'));
    document.getElementById('adminForm').reset();
    modal.show();
}

// --- SAVE FUNCTIONS ---

async function saveNotice() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    
    try {
        const savedNotice = await postData('notices', { title, content });
        demoData.notices.unshift(savedNotice);
        bootstrap.Modal.getInstance(document.getElementById('noticeModal')).hide();
        showToast('Notice added successfully!', 'success');
        loadNotices();
        loadDashboard();
    } catch (error) {
        // Error is already shown by postData helper
    }
}

async function saveEvent() {
    const title = document.getElementById('eventName').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value;
    const description = document.getElementById('eventDescription').value;
    
    try {
        const savedEvent = await postData('events', {
            title, description, location,
            start_date: `${date} ${time}`,
            end_date: `${date} ${time}`
        });
        demoData.events.unshift(savedEvent);
        bootstrap.Modal.getInstance(document.getElementById('eventModal')).hide();
        showToast('Event added successfully!', 'success');
        loadEvents();
        loadDashboard();
    } catch (error) {}
}

async function saveGalleryImage() {
    // Get form data
    const form = document.getElementById('galleryForm');
    const title = document.getElementById('galleryTitle').value;
    const description = document.getElementById('galleryDescription').value;
    const fileInput = document.getElementById('galleryImage');
    const file = fileInput.files[0];

    // Validate inputs
    if (!title.trim()) {
        showToast('Please enter a title for the image.', 'error');
        return;
    }

    if (!file) {
        showToast('Please select an image to upload.', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPG, PNG, or GIF).', 'error');
        return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    formData.append('description', description || ''); // Send empty string if no description
    formData.append('destination', 'assests/Images'); // Specify the upload directory
    
    // Add event relation if selected
    const eventId = document.getElementById('galleryEvent').value;
    if (eventId) {
        formData.append('event_id', eventId);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/gallery`, {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeaders().Authorization
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image');
        }

        const savedImage = await response.json();
        
        // Add to local data
        if (savedImage.data) {
            demoData.gallery.unshift(savedImage.data);
        } else {
            demoData.gallery.unshift(savedImage);
        }

        // Reset form and close modal
        form.reset();
        bootstrap.Modal.getInstance(document.getElementById('galleryModal')).hide();
        
        showToast('Image uploaded successfully!', 'success');
        loadGallery();
        loadDashboard();
    } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Failed to upload image: ' + error.message, 'error');
    }
}

async function saveBanner() {
    // Get form data
    const form = document.getElementById('bannerForm');
    const title = document.getElementById('bannerTitle').value;
    const status = document.getElementById('bannerStatus').value;
    const fileInput = document.getElementById('bannerImage');
    const file = fileInput.files[0];

    // Validate inputs
    if (!title.trim()) {
        showToast('Please enter a title for the banner.', 'error');
        return;
    }

    if (!file) {
        showToast('Please select a banner image to upload.', 'error');
        return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    formData.append('status', status);

    try {
        const response = await fetch(`${API_BASE_URL}/banners`, {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeaders().Authorization
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload banner');
        }

        const savedBanner = await response.json();
        
        // Add to local data
        if (savedBanner.data) {
            demoData.banners.unshift(savedBanner.data);
        } else {
            demoData.banners.unshift(savedBanner);
        }

        // Reset form and close modal
        form.reset();
        bootstrap.Modal.getInstance(document.getElementById('bannerModal')).hide();
        
        showToast('Banner uploaded successfully!', 'success');
        loadBanners();
    } catch (error) {
        console.error('Error uploading banner:', error);
        showToast('Failed to upload banner: ' + error.message, 'error');
    }
}

async function saveAdmin() {
    const full_name = document.getElementById('adminName').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const role = document.getElementById('adminRole').value;
    
    try {
        const savedAdmin = await postData('admins', { full_name, email, password, role });
        demoData.admins.push(savedAdmin);
        bootstrap.Modal.getInstance(document.getElementById('adminModal')).hide();
        showToast('Admin created successfully!', 'success');
        loadAdmins();
        loadDashboard();
    } catch (error) {}
}

// --- DELETE FUNCTIONS ---

async function deleteNotice(id) {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
        await deleteDataWithBody('notices', { notice_id: id });
        demoData.notices = demoData.notices.filter(n => n.notice_id !== id);
        showToast('Notice deleted successfully!', 'success');
        loadNotices();
        loadDashboard();
    } catch (error) {}
}

async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        await deleteDataWithBody('events', { event_id: id });
        demoData.events = demoData.events.filter(e => e.event_id !== id);
        showToast('Event deleted successfully!', 'success');
        loadEvents();
        loadDashboard();
    } catch (error) {}
}

async function deleteImage(id) {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
        await deleteDataWithBody('gallery', { image_id: id });
        demoData.gallery = demoData.gallery.filter(img => img.image_id !== id);
        showToast('Image deleted successfully!', 'success');
        loadGallery();
    } catch (error) {}
}

async function deleteBanner(id) {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
        await deleteDataWithBody('banners', { banner_id: id });
        demoData.banners = demoData.banners.filter(b => b.banner_id !== id);
        showToast('Banner deleted successfully!', 'success');
        loadBanners();
    } catch (error) {}
}

async function deleteAdmin(id) {
    if (!confirm('Are you sure you want to delete this admin? This cannot be undone.')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admins`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ user_id: id })
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete admin');
        }
        
        demoData.admins = demoData.admins.filter(a => a.user_id !== id);
        showToast('Admin deleted successfully!', 'success');
        loadAdmins();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting admin:', error);
        showToast('Failed to delete admin: ' + error.message, 'error');
    }
}

// --- OTHER ACTION FUNCTIONS ---

function viewApplication(id) {
    const application = demoData.applications.find(app => app.application_id === id);
    if (!application) {
        showToast('Application not found', 'error');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('applicationModal'));
    const detailsHtml = `
        <div class="application-details">
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Personal Information</h6>
                    <p><strong>Full Name:</strong> ${application.full_name}</p>
                    <p><strong>Email:</strong> ${application.email}</p>
                    <p><strong>Phone:</strong> ${application.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${application.address || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h6>Application Details</h6>
                    <p><strong>Visa Type:</strong> ${application.visa_type}</p>
                    <p><strong>Application Date:</strong> ${formatDate(application.application_date)}</p>
                    <p><strong>Status:</strong> <span class="badge bg-${application.status === 'pending' ? 'warning' : application.status === 'verified' ? 'success' : 'danger'}">${application.status}</span></p>
                </div>
            </div>
            ${application.documents ? `
                <div class="row mb-3">
                    <div class="col-12">
                        <h6>Documents</h6>
                        <div class="documents-preview">
                            ${application.documents.map(doc => `
                                <div class="document-item">
                                    <i class="fas fa-file-alt"></i>
                                    <a href="../${doc.path}" target="_blank">${doc.name}</a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
            ${application.payment_proof ? `
                <div class="row">
                    <div class="col-12">
                        <h6>Payment Proof</h6>
                        <div class="payment-proof-preview">
                            <img src="../${application.payment_proof}" alt="Payment Proof" class="img-fluid">
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    document.getElementById('applicationDetails').innerHTML = detailsHtml;
    currentApplicationId = id;
    modal.show();
}

async function approveApplication(id) {
    if (!confirm('Are you sure you want to approve this application?')) return;
    try {
        const response = await putData('membership-applications', { application_id: id, status: 'verified' });
        // API returns the updated application on success
        if (response && (response.success || response.application_id || response.status)) {
            // Update local data if present
            const application = demoData.applications.find(a => a.application_id === id);
            if (application) application.status = 'verified';
            showToast('Application approved successfully', 'success');
            loadApplications();
            loadDashboard();
        } else {
            showToast('Failed to approve application', 'error');
        }
    } catch (error) {
        console.error('Approve application error:', error);
        showToast(error.message || 'Failed to approve application', 'error');
    }
}

async function rejectApplication(id) {
    if (!confirm('Are you sure you want to reject this application?')) return;
    try {
        const response = await putData('membership-applications', { application_id: id, status: 'rejected' });
        if (response && (response.success || response.application_id || response.status)) {
            const application = demoData.applications.find(a => a.application_id === id);
            if (application) application.status = 'rejected';
            showToast('Application rejected', 'warning');
            loadApplications();
            loadDashboard();
        } else {
            showToast('Failed to reject application', 'error');
        }
    } catch (error) {
        console.error('Reject application error:', error);
        showToast(error.message || 'Failed to reject application', 'error');
    }
}

async function setBannerActive(id) {
    try {
        await putData('banners', { banner_id: id, status: 'active' });
        demoData.banners.forEach(b => b.status = b.banner_id === id ? 'active' : 'inactive');
        showToast('Banner set as active!', 'success');
        loadBanners();
    } catch (error) {}
}

async function setBannerInactive(id) {
    try {
        await putData('banners', { banner_id: id, status: 'inactive' });
        const banner = demoData.banners.find(b => b.banner_id === id);
        if (banner) { banner.status = 'inactive'; showToast('Banner set as inactive.', 'info'); loadBanners(); }
    } catch (error) {}
}

// --- UTILITY FUNCTIONS ---

function viewImage(imagePath) {
    window.open(`../${imagePath}`, '_blank');
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE_URL}/logout`, { method: 'POST', headers: getAuthHeaders() });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('adminSession'); localStorage.removeItem('adminToken'); localStorage.removeItem('adminData');
        sessionStorage.removeItem('adminSession'); sessionStorage.removeItem('adminToken'); sessionStorage.removeItem('adminData');
        window.location.href = 'index.html';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function showToast(message, type = 'success') {
    const toastHtml = `
        <div class="custom-toast toast-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    const toastContainer = document.getElementById('toastContainer');
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    setTimeout(() => {
        if (toastContainer.lastElementChild) {
            toastContainer.lastElementChild.remove();
        }
    }, 3000);
}

// --- EDIT PLACEHOLDERS ---
function editNotice(id) { showToast('Edit functionality to be implemented.', 'info'); }
function editEvent(id) { showToast('Edit functionality to be implemented.', 'info'); }