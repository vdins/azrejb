// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAbhAd8bkpAQD2rs638FDCCAoJ2MieqTWU",
    authDomain: "asramaku-web.firebaseapp.com",
    projectId: "asramaku-web",
    storageBucket: "asramaku-web.firebasestorage.app",
    messagingSenderId: "131249690755",
    appId: "1:131249690755:web:f5e642a3fc58cc64eb23b6",
    measurementId: "G-39C09WY1WF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
db.enablePersistence({synchronizeTabs: true})
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Global variables
let currentLang = 'id';
let currentUser = null;
let allUsers = [];
let firebaseConfigured = false;

// Notification Functions
function showFirebaseNotification(isSuccess = false) {
    const notification = document.getElementById('firebaseNotification');
    const title = document.getElementById('notificationTitle');
    const content = document.getElementById('notificationContent');

    if (isSuccess) {
        notification.classList.add('success');
        title.textContent = '✅ Database Connected Successfully';
        content.innerHTML = '';
        // Auto hide after 5 seconds
        setTimeout(() => closeNotification(), 5000);
    } else {
        notification.classList.remove('success');
        title.textContent = '❌ Firebase Configuration Required';
        content.innerHTML = `
            <p>Please complete Firebase setup:</p>
            <ol>
                <li>Go to <a href="https://console.firebase.google.com/" target="_blank" style="color: #2563eb;">Firebase Console</a></li>
                <li>Select project: <strong>asramaku-web</strong></li>
                <li>Click <strong>Firestore Database</strong> → Create database → <strong>Test mode</strong></li>
                <li>Click <strong>Authentication</strong> → Get started → Enable <strong>Email/Password</strong></li>
                <li>Refresh this page</li>
            </ol>
        `;
    }

    notification.classList.add('active');
}

function closeNotification() {
    document.getElementById('firebaseNotification').classList.remove('active');
}

// Language Toggle Functionality
function setLanguage(lang) {
    currentLang = lang;
    
    // Update button states
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update all translatable elements
    const elements = document.querySelectorAll('[data-lang-id][data-lang-en]');
    elements.forEach(element => {
        const text = element.getAttribute(`data-lang-${lang}`);
        if (text) {
            element.textContent = text;
        }
    });
}

// Helper function to create fake email
function createFakeEmail(name) {
    return `${name.toLowerCase().replace(/\s+/g, '')}@azrehosting.local`;
}

// Modal Functions
function openLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function openRegisterModal() {
    document.getElementById('registerModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    clearErrors();
}

function switchToRegister() {
    closeModal('loginModal');
    openRegisterModal();
}

function switchToLogin() {
    closeModal('registerModal');
    openLoginModal();
}

function clearErrors() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => {
        el.classList.remove('active');
        el.textContent = '';
    });
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 5000);
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 5000);
}

// Authentication Functions
async function handleRegister(event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById('registerName').value.trim();
    const pin = document.getElementById('registerPin').value;
    const pinConfirm = document.getElementById('registerPinConfirm').value;

    if (pin !== pinConfirm) {
        showError('registerError', 'PIN tidak cocok / PINs do not match');
        return;
    }

    try {
        const fakeEmail = createFakeEmail(name);
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(fakeEmail, pin);
        const user = userCredential.user;

        // Store user data in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: fakeEmail,
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccess('registerSuccess', 'Registrasi berhasil! / Registration successful!');
        setTimeout(() => {
            closeModal('registerModal');
            openLoginModal();
        }, 2000);
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showError('registerError', 'Nama sudah digunakan / Name already in use');
        } else {
            showError('registerError', error.message);
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById('loginName').value.trim();
    const pin = document.getElementById('loginPin').value;

    try {
        const fakeEmail = createFakeEmail(name);
        await auth.signInWithEmailAndPassword(fakeEmail, pin);
        closeModal('loginModal');
    } catch (error) {
        console.error('Login error:', error);
        showError('loginError', 'Nama atau PIN salah / Invalid name or PIN');
    }
}

async function logout() {
    try {
        await auth.signOut();
        document.getElementById('adminPanel').classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Admin Panel Functions
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        panel.classList.add('active');
        loadUsers();
        panel.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        allUsers = [];
        
        snapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach((user, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.isAdmin ? '<span class="admin-badge">Admin</span>' : 'User'}</td>
            <td>
                <div class="action-btns">
                    <button class="edit-btn" onclick="editUser('${user.id}')">
                        ${currentLang === 'id' ? 'Edit' : 'Edit'}
                    </button>
                    <button class="delete-btn" onclick="deleteUser('${user.id}', '${user.name}')">
                        ${currentLang === 'id' ? 'Hapus' : 'Delete'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function searchUsers() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    displayUsers(filtered);
}

function openAddUserModal() {
    document.getElementById('crudModalTitle').textContent = currentLang === 'id' ? 'Tambah Pengguna' : 'Add User';
    document.getElementById('crudUserId').value = '';
    document.getElementById('crudName').value = '';
    document.getElementById('crudPin').value = '';
    document.getElementById('crudPin').required = true;
    document.getElementById('crudIsAdmin').checked = false;
    document.getElementById('crudModal').classList.add('active');
}

async function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('crudModalTitle').textContent = currentLang === 'id' ? 'Edit Pengguna' : 'Edit User';
    document.getElementById('crudUserId').value = userId;
    document.getElementById('crudName').value = user.name;
    document.getElementById('crudPin').value = '';
    document.getElementById('crudPin').required = false;
    document.getElementById('crudIsAdmin').checked = user.isAdmin || false;
    document.getElementById('crudModal').classList.add('active');
}

async function handleCrudSubmit(event) {
    event.preventDefault();
    clearErrors();

    const userId = document.getElementById('crudUserId').value;
    const name = document.getElementById('crudName').value.trim();
    const pin = document.getElementById('crudPin').value;
    const isAdmin = document.getElementById('crudIsAdmin').checked;

    try {
        if (userId) {
            // Update existing user
            const updateData = {
                name: name,
                isAdmin: isAdmin
            };

            await db.collection('users').doc(userId).update(updateData);

            // If PIN is provided, update Firebase Auth password
            if (pin) {
                // Note: Updating password for another user requires admin SDK
                // For simplicity, we'll skip this in client-side code
                showSuccess('crudSuccess', 'User updated (PIN update requires admin SDK)');
            } else {
                showSuccess('crudSuccess', 'User berhasil diupdate / User updated successfully');
            }
        } else {
            // Create new user
            const fakeEmail = createFakeEmail(name);
            const userCredential = await auth.createUserWithEmailAndPassword(fakeEmail, pin);
            
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: fakeEmail,
                isAdmin: isAdmin,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Sign back in as admin
            await auth.signOut();
            await auth.signInWithEmailAndPassword(currentUser.email, '12345678');

            showSuccess('crudSuccess', 'User berhasil ditambahkan / User added successfully');
        }

        setTimeout(() => {
            closeModal('crudModal');
            loadUsers();
        }, 1500);
    } catch (error) {
        console.error('CRUD error:', error);
        showError('crudError', error.message);
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`Hapus user ${userName}? / Delete user ${userName}?`)) {
        return;
    }

    try {
        await db.collection('users').doc(userId).delete();
        
        // Note: Deleting user from Firebase Auth requires admin SDK
        loadUsers();
        alert('User berhasil dihapus dari database / User deleted from database');
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error: ' + error.message);
    }
}

// Initialize admin account
async function initializeAdminAccount() {
    const adminEmail = 'azre@azrehosting.local';
    const adminPin = '12345678';
    const adminName = 'Azre';

    // Wait a bit for Firebase to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        // Try to create admin account (will fail if already exists)
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPin);
            await db.collection('users').doc(userCredential.user.uid).set({
                name: adminName,
                email: adminEmail,
                isAdmin: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Admin account created successfully');
            console.log('Login with - Name: Azre | PIN: 12345678');
            firebaseConfigured = true;
            showFirebaseNotification(true);
            await auth.signOut();
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log('ℹ️ Admin account already exists');
                console.log('Login with - Name: Azre | PIN: 12345678');
                firebaseConfigured = true;
                showFirebaseNotification(true);
            } else if (error.code === 'unavailable' || error.code === 'permission-denied') {
                console.error('❌ Firebase is not configured properly!');
                firebaseConfigured = false;
                showFirebaseNotification(false);
            } else {
                console.error('Error creating admin:', error);
                firebaseConfigured = false;
                showFirebaseNotification(false);
            }
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
        firebaseConfigured = false;
        showFirebaseNotification(false);
    }
}

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const adminPanelBtn = document.getElementById('adminPanelBtn');

    if (user) {
        // User is signed in
        try {
            const userDoc = await db.collection('users').doc(user.uid).get({source: 'server'});
            
            if (!userDoc.exists) {
                console.warn('User document not found, creating one...');
                // Create user document if it doesn't exist
                await db.collection('users').doc(user.uid).set({
                    name: user.email.split('@')[0],
                    email: user.email,
                    isAdmin: user.email === 'azre@azrehosting.local',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                // Retry getting the document
                const newUserDoc = await db.collection('users').doc(user.uid).get();
                currentUser = { uid: user.uid, ...newUserDoc.data() };
            } else {
                const userData = userDoc.data();
                currentUser = { uid: user.uid, ...userData };
            }

            authButtons.style.display = 'none';
            userMenu.style.display = 'flex';
            document.getElementById('userName').textContent = currentUser.name || 'User';

            if (currentUser.isAdmin) {
                adminPanelBtn.style.display = 'block';
            } else {
                adminPanelBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            
            // Fallback: show user menu even if Firestore fails
            authButtons.style.display = 'none';
            userMenu.style.display = 'flex';
            document.getElementById('userName').textContent = user.email.split('@')[0];
            
            // Show warning
            if (error.code === 'unavailable') {
                console.warn('⚠️ Firestore is not accessible. Please check your Firebase configuration.');
                console.warn('1. Go to https://console.firebase.google.com/');
                console.warn('2. Select project: asramaku-web');
                console.warn('3. Enable Firestore Database');
                console.warn('4. Enable Authentication > Email/Password');
            }
        }
    } else {
        // User is signed out
        currentUser = null;
        authButtons.style.display = 'block';
        userMenu.style.display = 'none';
        document.getElementById('adminPanel').classList.remove('active');
    }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeAdminAccount();
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll animation for sections
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections (except admin panel)
document.querySelectorAll('section:not(#adminPanel)').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Header background change on scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    } else {
        header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    }
});

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

