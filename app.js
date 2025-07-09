document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        categories: [],
        currentCategory: null,
        currentPage: 1,
        limit: 15,
        totalPages: 1,
        isLoading: false,
        allDataLoaded: false,
        themeMode: localStorage.getItem('themeMode') || 'light',
        themeName: localStorage.getItem('themeName') || 'indigo',
    };

    const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwLeesyNBCPPM-Zx24ZJlsSaNcr2Q0bJaMJiXJIjshE8EnPjBeQgZjOf6Cy7XD_SpuSFQ/exec';

    // --- Gradient Theme Definitions ---
    const themes = {
        indigo: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        teal: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
        rose: 'linear-gradient(135deg, #f43f5e, #fb7185)',
        amber: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        sky: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    };
    
    // --- DOM Elements ---
    const splashScreen = document.getElementById('splash-screen');
    const messageContainer = document.getElementById('message-container');
    const mainContent = document.getElementById('main-content');
    const categoryContainer = document.getElementById('category-container');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const gotoPageBtn = document.getElementById('goto-page-btn');
    const gotoPageModal = document.getElementById('goto-page-modal');
    const themeModal = document.getElementById('theme-modal');

    // --- Core Functions ---
    const initApp = async () => {
        applyTheme();
        renderThemeSwatches();
        setupEventListeners();
        await fetchCategories();
    };

    const hideSplashScreen = () => {
        if (splashScreen) {
            splashScreen.classList.add('hidden');
            // Optional: completely remove from DOM after fade out
            setTimeout(() => {
                splashScreen.remove();
            }, 500); // Should match the transition duration in CSS
        }
    };
    
    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}?mode=listSheets`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            let data = await response.json();
            state.categories = Array.isArray(data) ? data : data.sheets || [];

            if (state.categories.length > 0) {
                renderCategories();
                switchCategory(state.categories[0]);
            } else {
                hideSplashScreen(); // Hide splash before showing error
                renderStatusMessage('No categories found.', 'fa-solid fa-folder-open');
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            hideSplashScreen(); // Hide splash before showing error
            renderStatusMessage('Could not load categories.', 'fa-solid fa-triangle-exclamation');
        }
    };

    const fetchMessages = async () => {
        if (state.isLoading || state.allDataLoaded) return;
        
        state.isLoading = true;
        renderLoader(true);

        const url = `${API_BASE_URL}?sheet=${encodeURIComponent(state.currentCategory)}&page=${state.currentPage}&limit=${state.limit}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const result = await response.json();
            
            if (result.total) {
                state.totalPages = Math.ceil(result.total / state.limit);
            }

            const newMessages = result.data || [];

            if (newMessages.length > 0) {
                renderMessages(newMessages);
                state.currentPage++;
            } else {
                state.allDataLoaded = true;
                if (state.currentPage === 1) {
                    renderStatusMessage('No messages found in this category.', 'fa-solid fa-inbox');
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            renderStatusMessage('Failed to load messages.', 'fa-solid fa-wifi');
        } finally {
            state.isLoading = false;
            renderLoader(false);
            // Hide the splash screen only after the first successful fetch
            hideSplashScreen();
        }
    };

    const switchCategory = (categoryName) => {
        mainContent.scrollTop = 0;
        messageContainer.innerHTML = '';
        state.currentCategory = categoryName;
        state.currentPage = 1;
        state.totalPages = 1;
        state.allDataLoaded = false;
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === categoryName);
        });

        fetchMessages();
    };

    const jumpToPage = (page) => {
        if (page < 1 || page > state.totalPages) {
            alert(`Invalid page number. Please enter a number between 1 and ${state.totalPages}.`);
            return;
        }
        
        mainContent.scrollTop = 0;
        messageContainer.innerHTML = '';
        state.currentPage = page;
        state.allDataLoaded = false;
        
        fetchMessages();
    };

    // --- Rendering Functions ---
    const renderCategories = () => {
        categoryContainer.innerHTML = '';
        state.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = category;
            btn.innerHTML = `<i class="${getCategoryIcon(category)}"></i><span>${category}</span>`;
            btn.addEventListener('click', () => switchCategory(category));
            categoryContainer.appendChild(btn);
        });
    };
    
    const renderMessages = (messages) => {
        const fragment = document.createDocumentFragment();
        messages.forEach((msg, index) => {
            const text = msg.value || msg;
            const encodedText = encodeURIComponent(text);
            const author = state.currentCategory;

            const card = document.createElement('div');
            card.className = 'message-card';
            card.style.animationDelay = `${index * 0.07}s`;
            
            card.innerHTML = `
                <div class="card-inner">
                    <div class="message-text">${text}</div>
                    <div class="card-footer">
                        <div class="author-tag">${author}</div>
                        <div class="message-actions">
                            <button class="action-btn copy-btn" title="Copy"><i class="fa-regular fa-copy"></i></button>
                            <a class="action-btn" href="https://wa.me/?text=${encodedText}" target="_blank" title="Share on WhatsApp"><i class="fab fa-whatsapp"></i></a>
                            <a class="action-btn" href="https://twitter.com/intent/tweet?text=${encodedText}" target="_blank" title="Share on X (Twitter)"><i class="fab fa-x-twitter"></i></a>
                        </div>
                    </div>
                </div>
            `;

            card.querySelector('.copy-btn').addEventListener('click', (e) => copyToClipboard(text, e.currentTarget));
            fragment.appendChild(card);
        });
        messageContainer.appendChild(fragment);
    };

    const renderLoader = (show) => {
        let loader = messageContainer.querySelector('.loader-container');
        if (show) {
            if (!loader) {
                const loaderContainer = document.createElement('div');
                loaderContainer.className = 'loader-container';
                loaderContainer.innerHTML = `<div class="typing-loader"><div></div><div></div><div></div></div>`;
                messageContainer.appendChild(loaderContainer);
            }
        } else {
            if (loader) {
                loader.remove();
            }
        }
    };

    const renderStatusMessage = (message, iconClass) => {
        messageContainer.innerHTML = `<div class="status-message"><i class="${iconClass}"></i><p>${message}</p></div>`;
    };

    const renderThemeSwatches = () => {
        const container = document.getElementById('theme-options');
        container.innerHTML = '';
        Object.entries(themes).forEach(([name, gradient]) => {
            const swatch = document.createElement('button');
            swatch.className = 'theme-swatch';
            if (name === state.themeName) swatch.classList.add('active');
            swatch.style.background = gradient;
            swatch.dataset.themeName = name;
            swatch.addEventListener('click', () => {
                state.themeName = name;
                applyTheme();
                document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
            });
            container.appendChild(swatch);
        });
    };

    // --- Helper Functions ---
    const applyTheme = () => {
        document.documentElement.style.setProperty('--primary-gradient', themes[state.themeName]);
        document.documentElement.style.setProperty('--primary-color', themes[state.themeName].split(', ')[1]);
        document.body.dataset.themeMode = state.themeMode;
        
        localStorage.setItem('themeMode', state.themeMode);
        localStorage.setItem('themeName', state.themeName);
    };

    const copyToClipboard = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            button.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fa-regular fa-copy"></i>';
            }, 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    };

    const getCategoryIcon = (category) => {
        const cat = category.toLowerCase().trim();
        switch (cat) {
            case 'morning': return 'fa-solid fa-sun';
            case 'night': return 'fa-solid fa-moon';
            case 'jokes': return 'fa-solid fa-face-laugh-squint';
            case 'shayri': return 'fa-solid fa-heart-pulse';
            case 'hindiquotes': return 'fa-solid fa-quote-left';
            case 'suvichar': return 'fa-solid fa-brain';
            case 'love': return 'fa-solid fa-heart';
            case 'sad': return 'fa-solid fa-face-sad-tear';
            case 'broken': case 'bewafa': return 'fa-solid fa-heart-crack';
            case 'romantic': return 'fa-solid fa-face-kiss-wink-heart';
            case 'breakup': return 'fa-solid fa-handshake-angle';
            case 'missyou': return 'fa-solid fa-comment-dots';
            case 'bholenath': return 'fa-solid fa-om';
            case 'attitude': return 'fa-solid fa-fire';
            case 'dosti': return 'fa-solid fa-user-group';
            default: return 'fa-solid fa-grip'; 
        }
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        themeToggleBtn.addEventListener('click', () => {
            themeModal.classList.add('visible');
        });
        
        mainContent.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = mainContent;
            if (scrollTop + clientHeight >= scrollHeight - 300) {
                fetchMessages();
            }
        });

        const pageNumberInput = document.getElementById('page-number-input');
        gotoPageBtn.addEventListener('click', () => {
            document.getElementById('modal-page-info').textContent = `Enter a page number (1 - ${state.totalPages})`;
            pageNumberInput.value = '';
            gotoPageModal.classList.add('visible');
            pageNumberInput.focus();
        });
        document.getElementById('modal-go-btn').addEventListener('click', () => {
            const pageNum = parseInt(pageNumberInput.value, 10);
            if (!isNaN(pageNum)) {
                jumpToPage(pageNum);
                gotoPageModal.classList.remove('visible');
            }
        });

        [gotoPageModal, themeModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('visible');
                }
            });
            const cancelBtn = modal.querySelector('.modal-btn.cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    modal.classList.remove('visible');
                });
            }
        });
    };

    // --- Initial Load ---
    initApp();
});
