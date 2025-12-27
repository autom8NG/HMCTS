// ==================== Configuration ====================
const API_BASE_URL = window.location.origin;
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

// ==================== State Management ====================
let accessToken = null;
let refreshToken = null;
let userData = null;
let tokenRefreshInterval = null;

// ==================== DOM Elements ====================
const loginCard = document.getElementById('loginCard');
const dashboardCard = document.getElementById('dashboardCard');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginAlert = document.getElementById('loginAlert');
const dashboardAlert = document.getElementById('dashboardAlert');
const loadingOverlay = document.getElementById('loadingOverlay');
const togglePassword = document.getElementById('togglePassword');

// ==================== Utility Functions ====================
function showLoading() {
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

function showAlert(element, message, type = 'error') {
    element.textContent = message;
    element.className = `alert alert-${type} show`;
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Storage error:', error);
    }
}

function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Storage error:', error);
        return null;
    }
}

function clearStorage() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('JWT decode error:', error);
        return null;
    }
}

function formatTokenDisplay(token) {
    if (!token) return 'No token';
    return token.substring(0, 30) + '...' + token.substring(token.length - 30);
}

function getTokenExpiry(token) {
    const decoded = decodeJWT(token);
    if (decoded && decoded.exp) {
        const expiry = new Date(decoded.exp * 1000);
        const now = new Date();
        const diff = expiry - now;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        if (diff > 0) {
            return `Expires in: ${minutes}m ${seconds}s`;
        } else {
            return 'Token expired';
        }
    }
    return '';
}

// ==================== API Functions ====================
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw {
                status: response.status,
                message: data.error_description || data.error || 'Request failed'
            };
        }

        return data;
    } catch (error) {
        throw error;
    }
}

async function login(username, password) {
    showLoading();
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        accessToken = data.access_token;
        refreshToken = data.refresh_token;

        // Decode token to get user data
        const decoded = decodeJWT(accessToken);
        userData = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };

        // Save to storage
        saveToStorage(TOKEN_KEY, accessToken);
        saveToStorage(REFRESH_TOKEN_KEY, refreshToken);
        saveToStorage(USER_KEY, userData);

        showDashboard();
        startTokenRefreshTimer();
        
        return data;
    } catch (error) {
        throw error;
    } finally {
        hideLoading();
    }
}

async function refreshAccessToken() {
    try {
        showLoading();
        
        const data = await apiRequest('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        accessToken = data.access_token;
        refreshToken = data.refresh_token;

        // Update storage
        saveToStorage(TOKEN_KEY, accessToken);
        saveToStorage(REFRESH_TOKEN_KEY, refreshToken);

        // Update display
        updateTokenDisplay();
        
        showAlert(dashboardAlert, 'Tokens refreshed successfully!', 'success');
        
        return data;
    } catch (error) {
        showAlert(dashboardAlert, 'Failed to refresh token. Please login again.', 'error');
        setTimeout(() => logout(), 2000);
        throw error;
    } finally {
        hideLoading();
    }
}

async function logout() {
    showLoading();
    try {
        if (refreshToken) {
            await apiRequest('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        stopTokenRefreshTimer();
        clearStorage();
        accessToken = null;
        refreshToken = null;
        userData = null;
        showLogin();
        hideLoading();
    }
}

async function testProtectedEndpoint() {
    showLoading();
    try {
        const data = await apiRequest('/api/protected', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        displayApiResponse(data);
        showAlert(dashboardAlert, 'Successfully accessed protected endpoint!', 'success');
    } catch (error) {
        showAlert(dashboardAlert, `Error: ${error.message}`, 'error');
        displayApiResponse({ error: error.message, status: error.status });
        
        // If token expired, try to refresh
        if (error.status === 401) {
            setTimeout(() => refreshAccessToken(), 1000);
        }
    } finally {
        hideLoading();
    }
}

async function testPublicEndpoint() {
    showLoading();
    try {
        const data = await apiRequest('/api/public');
        displayApiResponse(data);
        showAlert(dashboardAlert, 'Successfully accessed public endpoint!', 'info');
    } catch (error) {
        showAlert(dashboardAlert, `Error: ${error.message}`, 'error');
        displayApiResponse({ error: error.message });
    } finally {
        hideLoading();
    }
}

async function testAdminEndpoint() {
    showLoading();
    try {
        const data = await apiRequest('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        displayApiResponse(data);
        showAlert(dashboardAlert, 'Successfully accessed admin endpoint!', 'success');
    } catch (error) {
        showAlert(dashboardAlert, `Error: ${error.message}`, 'error');
        displayApiResponse({ error: error.message, status: error.status });
    } finally {
        hideLoading();
    }
}

// ==================== UI Functions ====================
function showLogin() {
    loginCard.style.display = 'block';
    dashboardCard.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginAlert.classList.remove('show');
}

function showDashboard() {
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';
    
    // Update user info
    document.getElementById('welcomeMessage').textContent = `Welcome, ${userData.username}!`;
    document.getElementById('userRole').textContent = userData.role.toUpperCase();
    document.getElementById('userId').textContent = userData.userId;
    document.getElementById('userUsername').textContent = userData.username;
    
    const roleBadge = document.getElementById('userRoleBadge');
    roleBadge.textContent = userData.role;
    roleBadge.className = `badge badge-${userData.role === 'admin' ? 'admin' : 'user'}`;
    
    // Show admin button if user is admin
    const adminBtn = document.getElementById('adminBtn');
    if (userData.role === 'admin') {
        adminBtn.style.display = 'inline-flex';
    }
    
    // Update token display
    updateTokenDisplay();
}

function updateTokenDisplay() {
    // Access token
    const accessTokenDisplay = document.getElementById('accessTokenDisplay');
    accessTokenDisplay.querySelector('code').textContent = formatTokenDisplay(accessToken);
    document.getElementById('accessTokenExpiry').textContent = getTokenExpiry(accessToken);
    
    // Refresh token
    const refreshTokenDisplay = document.getElementById('refreshTokenDisplay');
    refreshTokenDisplay.querySelector('code').textContent = formatTokenDisplay(refreshToken);
}

function displayApiResponse(data) {
    const responseSection = document.getElementById('apiResponseSection');
    const responseBox = document.getElementById('apiResponse');
    
    responseSection.style.display = 'block';
    responseBox.textContent = JSON.stringify(data, null, 2);
    
    // Scroll to response
    responseSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyToken(type) {
    const token = type === 'access' ? accessToken : refreshToken;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(token).then(() => {
            showAlert(dashboardAlert, `${type} token copied to clipboard!`, 'success');
        });
    }
}

// ==================== Token Refresh Timer ====================
function startTokenRefreshTimer() {
    // Refresh token every 4 minutes (before 5-minute expiry)
    tokenRefreshInterval = setInterval(() => {
        refreshAccessToken().catch(console.error);
    }, 4 * 60 * 1000);
    
    // Update expiry display every second
    setInterval(() => {
        if (accessToken) {
            document.getElementById('accessTokenExpiry').textContent = getTokenExpiry(accessToken);
        }
    }, 1000);
}

function stopTokenRefreshTimer() {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
    }
}

// ==================== Event Listeners ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    try {
        await login(username, password);
        showAlert(dashboardAlert, 'Login successful! Welcome back.', 'success');
    } catch (error) {
        showAlert(loginAlert, error.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
});

logoutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
});

togglePassword.addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const icon = togglePassword.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// ==================== Initialize ====================
function init() {
    // Check if user is already logged in
    const storedToken = getFromStorage(TOKEN_KEY);
    const storedRefreshToken = getFromStorage(REFRESH_TOKEN_KEY);
    const storedUser = getFromStorage(USER_KEY);
    
    if (storedToken && storedRefreshToken && storedUser) {
        accessToken = storedToken;
        refreshToken = storedRefreshToken;
        userData = storedUser;
        
        // Verify token is still valid
        const decoded = decodeJWT(accessToken);
        if (decoded && decoded.exp * 1000 > Date.now()) {
            showDashboard();
            startTokenRefreshTimer();
        } else {
            // Token expired, try to refresh
            refreshAccessToken().catch(() => {
                showLogin();
            });
        }
    } else {
        showLogin();
    }
}

// Start the app
init();

// Make functions available globally for onclick handlers
window.testProtectedEndpoint = testProtectedEndpoint;
window.testPublicEndpoint = testPublicEndpoint;
window.testAdminEndpoint = testAdminEndpoint;
window.refreshAccessToken = refreshAccessToken;
window.copyToken = copyToken;

// Add event listeners as backup for CSP-blocked inline handlers
document.addEventListener('DOMContentLoaded', function() {
    // Find buttons by their onclick content or text
    const buttons = document.querySelectorAll('.actions-grid button');
    buttons.forEach(button => {
        const text = button.textContent.trim();
        if (text.includes('Test Protected API')) {
            button.addEventListener('click', testProtectedEndpoint);
        } else if (text.includes('Test Public API')) {
            button.addEventListener('click', testPublicEndpoint);
        } else if (text.includes('Refresh Token')) {
            button.addEventListener('click', refreshAccessToken);
        } else if (text.includes('Admin Dashboard')) {
            button.addEventListener('click', testAdminEndpoint);
        }
    });
});
