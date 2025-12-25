
// API Configuration
const API_URL = '/cats';

// DOM Elements
const gallery = document.getElementById('gallery');
const catForm = document.getElementById('cat-form');
const catModal = document.getElementById('cat-modal');
const confirmModal = document.getElementById('confirm-modal');
const modalTitle = document.getElementById('modal-title');
const catCountElement = document.getElementById('cat-count');

// State Variables
let currentCatId = null;
let catToDeleteId = null;
let adoptedCatIds = new Set(); // Track adopted cats

// Initialization
// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Verify session is still valid if user has token
    if (currentUser) {
        await verifySession();
    }

    // Only fetch cats if we are on the gallery page
    if (document.getElementById('gallery')) {
        fetchCats('', 1);
        fetchTags();
    }

    // Auth is global
    setupEventListeners();
    setupAuthForms();
    updateAuthUI();

    // Load adoption data if logged in
    if (currentUser) {
        fetchAdoptionCount();
        fetchAdoptedCats();
    }
});

// --- API FUNCTIONS ---

// Pagination State
// Pagination State
let currentPage = 1;
const itemsPerPage = 6;
let allCats = []; // Store all fetched cats

async function fetchCats(searchTerm = '', page = 1) {
    gallery.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Loading cats...</p>';
    currentPage = page; // Set desired page

    const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(tagFilter.value && { tag: tagFilter.value })
    });

    try {
        const response = await fetch(`${API_URL}?${params}`);
        const data = await response.json();

        if (Array.isArray(data)) {
            allCats = data; // Store all cats
            updateGallery(); // Render current page
        } else {
            console.error('Invalid data:', data);
            gallery.innerHTML = '<p class="error">Error loading cats from database.</p>';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        gallery.innerHTML = '<p class="error">Could not connect to database.</p>';
    }
}

function updateGallery() {
    // Calculate slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCats = allCats.slice(startIndex, endIndex);

    renderCats(paginatedCats);

    // Update controls
    const totalPages = Math.ceil(allCats.length / itemsPerPage);
    renderPagination(totalPages);
    updateCatCount(allCats.length);
}

const tagFilter = document.getElementById('tag-filter');

function renderPagination(totalPages) {
    const controls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (totalPages <= 1) {
        controls.style.display = 'none';
        return;
    }

    controls.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} sur ${totalPages}`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// Fetch distinct tags and populate dropdown

// Fetch distinct tags and populate dropdown
function fetchTags() {
    fetch('/tags')
        .then(res => res.json())
        .then(tags => {
            const tagFilter = document.getElementById('tag-filter');
            // Keep the first option (Tous les tags)
            const defaultOption = tagFilter.firstElementChild;
            tagFilter.innerHTML = '';
            tagFilter.appendChild(defaultOption);

            if (Array.isArray(tags)) {
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize
                    tagFilter.appendChild(option);
                });
            }
        })
        .catch(err => console.error('Error fetching tags:', err));
}

function addCat(catData) {
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
    })
        .then(res => res.json())
        .then(() => {
            showNotification('Cat added successfully!', 'success');
            fetchCats();
            closeModals();
        })
        .catch(err => {
            console.error('Error adding cat:', err);
            showNotification('Error adding cat.', 'error');
        });
}

function updateCat(id, catData) {
    fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
    })
        .then(res => res.json())
        .then(() => {
            showNotification('Cat updated successfully!', 'success');
            fetchCats();
            closeModals();
        })
        .catch(err => {
            console.error('Error updating cat:', err);
            showNotification('Error updating cat.', 'error');
        });
}

function deleteCat(id) {
    fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
    })
        .then(() => {
            showNotification('Cat deleted successfully!', 'info');
            fetchCats();
            closeModals();
        })
        .catch(err => {
            console.error('Error deleting cat:', err);
            showNotification('Error deleting cat.', 'error');
        });
}

// --- RENDER FUNCTIONS ---

function renderCats(cats) {
    gallery.innerHTML = '';

    if (cats.length === 0) {
        gallery.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No cats found in database. Add one!</p>';
        return;
    }

    cats.forEach(cat => {
        const card = createCatCard(cat);
        gallery.appendChild(card);
    });
}

function createCatCard(cat) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cat.id;

    // Backend: name, descreption, tag, img
    const imgSrc = cat.img || '';
    const name = escapeHtml(cat.name);
    const desc = escapeHtml(cat.descreption);
    const tag = escapeHtml(cat.tag);

    let imageHTML = '';
    if (imgSrc) {
        // Safe onerror handler that replaces the image with the icon placeholder if loading fails
        const fallbackHTML = `<div class="image-placeholder"><i class="fas fa-cat"></i><div>${name}</div></div>`;
        // We use a function for onerror to handle the DOM manipulation cleanly
        imageHTML = `
            <div class="cat-image">
                <img src="${imgSrc}" alt="${name}" loading="lazy" 
                onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-cat\\'></i><div>${escapeHtml(name)}</div></div>'">
            </div>
        `;
    } else {
        imageHTML = `
             <div class="cat-image">
                <div class="image-placeholder">
                    <i class="fas fa-cat"></i>
                    <div>${name}</div>
                </div>
             </div>
        `;
    }

    card.innerHTML = `
        ${imageHTML}
        <div class="card-header">
            <h2 class="card-title">${name}</h2>
            <p class="card-description">${desc}</p>
            <span class="card-tag">${tag}</span>
        </div>
        <div class="card-body">
            <div class="card-actions">
                <button class="btn btn-edit" data-id="${cat.id}" 
                    data-name="${name}" data-desc="${desc}" data-tag="${tag}" data-img="${escapeHtml(imgSrc)}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-delete" data-id="${cat.id}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
                ${currentUser ? `
                    <button class="btn ${adoptedCatIds.has(cat.id) ? 'btn-adopted' : 'btn-adopt'}" data-id="${cat.id}" data-adopted="${adoptedCatIds.has(cat.id)}">
                        <i class="fas fa-heart"></i> ${adoptedCatIds.has(cat.id) ? 'Adopté' : 'Adopter'}
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

// --- EVENT HANDLERS ---

function setupEventListeners() {
    // Gallery specific listeners
    const addCatBtn = document.getElementById('add-cat-btn');
    if (addCatBtn) {
        addCatBtn.addEventListener('click', () => {
            openCatModal();
        });
    }

    // Search listeners
    const searchInput = document.getElementById('cat-search');
    const searchBtn = document.getElementById('search-btn');
    const tagFilter = document.getElementById('tag-filter');

    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    if (tagFilter) {
        tagFilter.addEventListener('change', () => {
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            fetchCats(searchTerm, 1); // Reset to page 1
        });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (tagFilter) tagFilter.value = '';
            fetchCats('', 1);
        });
    }

    // Pagination Listeners
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateGallery();
                window.scrollTo(0, 0);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allCats.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateGallery();
                window.scrollTo(0, 0);
            }
        });
    }

    // Global Listeners (Modals)
    document.querySelectorAll('.close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (event) => {
        if (event.target === catModal || event.target === confirmModal) {
            closeModals();
        }
    });

    if (catForm) catForm.addEventListener('submit', handleFormSubmit);

    const btnDeleteConfirm = document.querySelector('.btn-delete-confirm');
    if (btnDeleteConfirm) {
        btnDeleteConfirm.addEventListener('click', () => {
            if (catToDeleteId) {
                deleteCat(catToDeleteId);
            }
        });
    }

    if (gallery) {
        gallery.addEventListener('click', (event) => {
            const target = event.target;

            const editBtn = target.closest('.btn-edit');
            if (editBtn) {
                const id = editBtn.dataset.id;
                const catData = {
                    id: id,
                    name: editBtn.dataset.name,
                    descreption: editBtn.dataset.desc,
                    tag: editBtn.dataset.tag,
                    img: editBtn.dataset.img
                };
                openCatModal(catData);
            }

            const deleteBtn = target.closest('.btn-delete');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                openDeleteConfirm(id);
            }

            const adoptBtn = target.closest('.btn-adopt');
            if (adoptBtn) {
                const id = adoptBtn.dataset.id;
                const isAdopted = adoptBtn.dataset.adopted === 'true';
                if (isAdopted) {
                    unadoptCat(id);
                } else {
                    adoptCat(id);
                }
            }

            const adoptedBtn = target.closest('.btn-adopted');
            if (adoptedBtn) {
                const id = adoptedBtn.dataset.id;
                unadoptCat(id);
            }
        });
    }

    // Auth Listeners
    const btnSignup = document.getElementById('btn-signup');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');

    if (btnSignup) {
        btnSignup.addEventListener('click', () => {
            if (registerModal) {
                // Reset form before showing
                const registerForm = document.getElementById('register-form');
                if (registerForm) registerForm.reset();
                registerModal.style.display = 'flex';
            }
        });
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            if (loginModal) {
                // Reset form before showing
                const loginForm = document.getElementById('login-form');
                if (loginForm) loginForm.reset();
                loginModal.style.display = 'flex';
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }

    // Adoption badge click - open modal with adopted cats
    const adoptionBadge = document.getElementById('adoption-count-badge');
    if (adoptionBadge) {
        adoptionBadge.addEventListener('click', openAdoptedCatsModal);
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('cat-search').value.trim();
    fetchCats(searchTerm, 1);
}

function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(catForm);

    // Map form fields to backend schema
    const catData = {
        name: formData.get('name'),
        descreption: formData.get('description'),
        tag: formData.get('tag'),
        img: formData.get('image')
    };

    if (currentCatId) {
        updateCat(currentCatId, catData);
    } else {
        addCat(catData);
    }
}

function openCatModal(cat = null) {
    if (cat) {
        currentCatId = cat.id;
        modalTitle.textContent = 'Modifier le chat';
        document.getElementById('cat-name').value = cat.name;
        document.getElementById('cat-description').value = cat.descreption;
        document.getElementById('cat-tag').value = cat.tag;
        document.getElementById('cat-image').value = cat.img;
    } else {
        currentCatId = null;
        modalTitle.textContent = 'Ajouter un nouveau chat';
        catForm.reset();
    }
    catModal.style.display = 'flex';
}

function openDeleteConfirm(id) {
    catToDeleteId = id;
    confirmModal.style.display = 'flex';
}

function closeModals() {
    if (catModal) catModal.style.display = 'none';
    if (confirmModal) confirmModal.style.display = 'none';

    // Auth Modals
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'none';

    // Adopted cats modal
    const adoptedCatsModal = document.getElementById('adopted-cats-modal');
    if (adoptedCatsModal) adoptedCatsModal.style.display = 'none';

    currentCatId = null;
    catToDeleteId = null;
}

function updateCatCount(count) {
    catCountElement.textContent = count;
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Afficher une notification
function showNotification(message, type) {
    // Supprimer les notifications existantes
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Style de la notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '6px';
    notification.style.color = 'white';
    notification.style.fontWeight = '600';
    notification.style.zIndex = '2000';
    notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    notification.style.animation = 'slideIn 0.3s ease';

    // Couleurs selon le type
    if (type === 'success') {
        notification.style.backgroundColor = '#2ecc71';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#e74c3c';
    } else {
        notification.style.backgroundColor = '#3498db';
    }

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);

    // Ajouter les animations CSS si elles n'existent pas déjà
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// --- AUTHENTICATION HELPERS ---

// Auth State
let currentUser = JSON.parse(localStorage.getItem('user'));

// Verify session is still valid on server
async function verifySession() {
    try {
        const res = await fetch('/session', {
            credentials: 'include' // Include cookies
        });
        const data = await res.json();

        // If session is invalid, clear local user data
        if (!data.isAuthenticated) {
            currentUser = null;
            adoptedCatIds.clear();
            localStorage.removeItem('user');
        }
    } catch (err) {
        console.error('Error verifying session:', err);
    }
}


function updateAuthUI() {
    // Re-select elements to be sure
    const btnSignup = document.getElementById('btn-signup');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const addCatBtn = document.getElementById('add-cat-btn');

    if (currentUser) {
        // Logged In
        if (btnSignup) btnSignup.style.display = 'none';
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'block';

        // Show protected elements (Add Cat, etc.)
        if (addCatBtn) addCatBtn.style.display = 'inline-block';

        // Show edit/delete buttons
        document.body.classList.add('logged-in');

        // Show user session info (name + adoption badge)
        const userSessionInfo = document.getElementById('user-session-info');
        if (userSessionInfo) userSessionInfo.style.display = 'flex';

        // Update username display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && currentUser) {
            usernameDisplay.textContent = currentUser.username;
        }
    } else {
        // Logged Out
        if (btnSignup) btnSignup.style.display = 'block';
        if (btnLogin) btnLogin.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'none';

        // Hide protected elements
        if (addCatBtn) addCatBtn.style.display = 'none';

        document.body.classList.remove('logged-in');

        // Hide user session info
        const userSessionInfo = document.getElementById('user-session-info');
        if (userSessionInfo) userSessionInfo.style.display = 'none';
    }
}

async function logout() {
    // Call backend to destroy session
    try {
        await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies
        });
    } catch (err) {
        console.error('Error during logout:', err);
    }

    // Clear client-side data
    currentUser = null;
    adoptedCatIds.clear();
    localStorage.removeItem('user');

    // Reset auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();

    updateAuthUI();
    showNotification('Logged out successfully', 'info');

    // Refresh gallery to hide adopt buttons
    if (document.getElementById('gallery')) {
        fetchCats('', 1);
    }
}

// Function to handle Auth Form Submits
function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');

    // Register Submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();

                if (res.ok) {
                    showNotification('Registration successful! Please login.', 'success');
                    registerForm.reset(); // Clear registration form
                    if (registerModal) registerModal.style.display = 'none';
                    if (loginModal) {
                        // Reset login form before showing
                        const loginForm = document.getElementById('login-form');
                        if (loginForm) loginForm.reset();
                        loginModal.style.display = 'flex';
                    }
                } else {
                    showNotification(result.error || 'Registration failed', 'error');
                }
            } catch (err) {
                console.error(err);
                showNotification('Error registering', 'error');
            }
        });
    }

    // Login Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();

                if (res.ok) {
                    // Success
                    currentUser = result.user;
                    localStorage.setItem('user', JSON.stringify(currentUser));

                    showNotification(`Welcome back, ${currentUser.username}!`, 'success');
                    loginForm.reset(); // Clear login form
                    if (loginModal) loginModal.style.display = 'none';
                    updateAuthUI();

                    // Load adoption data
                    fetchAdoptionCount();
                    fetchAdoptedCats();

                    // Refresh gallery to show adopt buttons
                    if (document.getElementById('gallery')) {
                        fetchCats('', 1);
                    }
                } else {
                    showNotification(result.error || 'Login failed', 'error');
                }
            } catch (err) {
                console.error(err);
                showNotification('Error logging in', 'error');
            }
        });
    }
}

// --- ADOPTION FUNCTIONS ---

// Fetch adoption count
async function fetchAdoptionCount() {
    if (!currentUser) return;

    try {
        const res = await fetch('/adoptions/count', {
            // Cookie sent automatically
        });
        const data = await res.json();

        if (res.ok) {
            const countElement = document.getElementById('adoption-count');
            if (countElement) {
                countElement.textContent = data.count;
            }
        }
    } catch (err) {
        console.error('Error fetching adoption count:', err);
    }
}

// Fetch adopted cats to build the set
async function fetchAdoptedCats() {
    if (!currentUser) return;

    try {
        const res = await fetch('/adoptions', {
            // Cookie sent automatically
        });
        const data = await res.json();

        if (res.ok) {
            adoptedCatIds.clear();
            data.forEach(cat => adoptedCatIds.add(cat.id));

            // Refresh gallery if on gallery page
            if (document.getElementById('gallery')) {
                updateGallery();
            }
        }
    } catch (err) {
        console.error('Error fetching adopted cats:', err);
    }
}

// Adopt a cat
async function adoptCat(catId) {
    if (!currentUser) {
        showNotification('Please login to adopt cats', 'error');
        return;
    }

    try {
        const res = await fetch(`/adopt/${catId}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (res.ok) {
            showNotification(data.message, 'success');
            adoptedCatIds.add(parseInt(catId));
            fetchAdoptionCount();
            updateGallery(); // Refresh to update button
        } else {
            showNotification(data.error || 'Error adopting cat', 'error');
        }
    } catch (err) {
        console.error('Error adopting cat:', err);
        showNotification('Error adopting cat', 'error');
    }
}

// Remove adoption
async function unadoptCat(catId) {
    if (!currentUser) return;

    try {
        const res = await fetch(`/adopt/${catId}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (res.ok) {
            showNotification(data.message, 'info');
            adoptedCatIds.delete(parseInt(catId));
            fetchAdoptionCount();
            updateGallery(); // Refresh to update button
        } else {
            showNotification(data.error || 'Error removing adoption', 'error');
        }
    } catch (err) {
        console.error('Error removing adoption:', err);
        showNotification('Error removing adoption', 'error');
    }
}

// Open modal with adopted cats list
async function openAdoptedCatsModal() {
    if (!currentUser) return;

    const modal = document.getElementById('adopted-cats-modal');
    const listContainer = document.getElementById('adopted-cats-list');

    // Show loading state
    listContainer.innerHTML = '<p style="text-align:center; padding:20px;">Chargement...</p>';
    modal.style.display = 'flex';

    try {
        const res = await fetch('/adoptions', {
            // Cookie sent automatically
        });
        const cats = await res.json();

        if (res.ok) {
            if (cats.length === 0) {
                listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#7f8c8d;">Vous n\'avez pas encore adopté de chats.</p>';
            } else {
                listContainer.innerHTML = '';
                cats.forEach(cat => {
                    const catCard = createAdoptedCatCard(cat);
                    listContainer.appendChild(catCard);
                });
            }
        } else {
            listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#e74c3c;">Erreur lors du chargement des chats adoptés.</p>';
        }
    } catch (err) {
        console.error('Error loading adopted cats:', err);
        listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#e74c3c;">Erreur lors du chargement.</p>';
    }
}

// Create a card for adopted cat in modal
function createAdoptedCatCard(cat) {
    const card = document.createElement('div');
    card.className = 'adopted-cat-card';

    const imgSrc = cat.img || '';
    const name = escapeHtml(cat.name);
    const desc = escapeHtml(cat.descreption);
    const tag = escapeHtml(cat.tag);

    let imageHTML = '';
    if (imgSrc) {
        imageHTML = `<img src="${imgSrc}" alt="${name}" onerror="this.parentElement.innerHTML='<div class=\'adopted-cat-placeholder\'><i class=\'fas fa-cat\'></i></div>'">`;
    } else {
        imageHTML = `<div class="adopted-cat-placeholder"><i class="fas fa-cat"></i></div>`;
    }

    card.innerHTML = `
        <div class="adopted-cat-image">
            ${imageHTML}
        </div>
        <div class="adopted-cat-info">
            <h3>${name}</h3>
            <p>${desc}</p>
            <span class="adopted-cat-tag">${tag}</span>
        </div>
    `;

    return card;
}
