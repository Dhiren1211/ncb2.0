// Demo credentials
const DEMO_CREDENTIALS = {
    email: 'admin@admin.com',
    password: 'admin123'
};

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Hide previous messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    
    // Show loading state
    loginBtn.classList.add('loading');
    
    try {
        // Use real API call instead of setTimeout
        const response = await fetch('./API/api.php/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        loginBtn.classList.remove('loading');
        
        if (response.ok && data.success) {
            // Success
            successMessage.classList.add('show');
            
            // Store session data - MATCHING DASHBOARD EXPECTATIONS
            const storage = document.getElementById('rememberMe').checked ? localStorage : sessionStorage;
            
            storage.setItem('adminSession', 'true');
            storage.setItem('adminToken', data.token);
            storage.setItem('adminData', JSON.stringify(data.user || data.admin));
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            // Error from API
            document.getElementById('errorText').textContent = data.error || 'Invalid email or password';
            errorMessage.classList.add('show');
            
            // Shake animation for form
            document.querySelector('.login-form').style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                document.querySelector('.login-form').style.animation = '';
            }, 500);
        }
    } catch (error) {
        // Fallback to demo credentials if API fails
        loginBtn.classList.remove('loading');
        
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
            // Success with demo credentials
            successMessage.classList.add('show');
            
            // Store demo session data
            const storage = document.getElementById('rememberMe').checked ? localStorage : sessionStorage;
            
            storage.setItem('adminSession', 'true');
            storage.setItem('adminToken', 'demo-token-' + Date.now());
            storage.setItem('adminData', JSON.stringify({
                email: email,
                username: 'admin',
                role: 'Super Admin',
                full_name: 'System Administrator'
            }));
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            // Error
            document.getElementById('errorText').textContent = 'Invalid email or password. Try admin@admin.com / admin123';
            errorMessage.classList.add('show');
            
            // Shake animation for form
            document.querySelector('.login-form').style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                document.querySelector('.login-form').style.animation = '';
            }, 500);
        }
    }
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.25rem;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Check for existing session on page load - UPDATED TO MATCH DASHBOARD
window.addEventListener('load', function() {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    const session = localStorage.getItem('adminSession') || sessionStorage.getItem('adminSession');
    
    if (token && session === 'true') {
        showToast('You are already logged in. Redirecting...', 'info');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }
});

// Add input validation feedback
document.getElementById('email').addEventListener('input', function() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.value && !emailRegex.test(this.value)) {
        this.style.borderColor = 'var(--danger-color)';
    } else {
        this.style.borderColor = '';
    }
});

document.getElementById('password').addEventListener('input', function() {
    if (this.value && this.value.length < 6) {
        this.style.borderColor = 'var(--warning-color)';
    } else {
        this.style.borderColor = '';
    }
});