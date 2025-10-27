// Utility functions
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// PageManager class - Add this at the top of your script.js
class PageManager {
    static init() {
        // Initialize page-specific functionality
        this.initPageTransitions();
        this.initScrollEffects();
        this.initMobileOptimizations();
    }

    static initPageTransitions() {
        // Smooth page transitions
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    static initScrollEffects() {
        // Add scroll-based effects
        let lastScrollTop = 0;
        const header = document.querySelector('header');

        if (header) {
            window.addEventListener('scroll', () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    header.classList.add('header-hidden');
                } else {
                    header.classList.remove('header-hidden');
                }

                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            });
        }
    }

    static initMobileOptimizations() {
        // Mobile-specific optimizations
        if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-view');

            // Add touch event support
            this.addTouchSupport();
        }
    }

    static addTouchSupport() {
        let touchStartY = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipeGesture(touchStartY, touchEndY);
        });
    }

    static handleSwipeGesture(startY, endY) {
        const swipeThreshold = 50;
        const diff = startY - endY;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe up
                document.body.classList.add('swipe-up');
            } else {
                // Swipe down
                document.body.classList.remove('swipe-up');
            }
        }
    }
}

// Committee Members Rendering
function renderCommitteeMembers() {
    const committeeContainer = $('#committee-members');
    if (!committeeContainer) return;

    // Sample committee data - in a real app, this would come from the API
    const committeeMembers = [
        {
            name: "Ashok Acharya",
            position: "President",
            image: "assets/images/committee/president.jpg",
            bio: "Leading the NCB community with vision and dedication."
        },
        {
            name: "Sita Sharma",
            position: "Vice President",
            image: "assets/images/committee/vice-president.jpg",
            bio: "Supporting cultural events and member engagement."
        },
        {
            name: "Rajendra Thapa",
            position: "Treasurer",
            image: "assets/images/committee/treasurer.jpg",
            bio: "Managing finances and ensuring transparency."
        },
        {
            name: "Meera Gurung",
            position: "Secretary",
            image: "assets/images/committee/secretary.jpg",
            bio: "Handling communications and documentation."
        }
    ];

    let html = '<div class="committee-grid">';

    committeeMembers.forEach(member => {
        html += `
            <div class="committee-member">
                <div class="member-image">
                    <img src="${member.image}" alt="${member.name}" loading="lazy">
                </div>
                <div class="member-info">
                    <h3>${member.name}</h3>
                    <p class="position">${member.position}</p>
                    <p class="bio">${member.bio}</p>
                </div>
            </div>
        `;
    });

    html += '</div>';
    committeeContainer.innerHTML = html;
}

// Server configuration for PHP
const API = {
    base: 'http://localhost/NCB/backend/api.php', // Adjusted for your directory structure
    endpoints: {
  members: 'members',
  events: 'events',
  news: 'news',
  gallery: 'gallery',
  applications: 'applications',
  search: 'search',
  rsvp: 'rsvp'
    }
};
// Helper: normalize image/file paths returned by the backend to absolute URLs
function normalizeImagePath(path) {
  if (!path) return '';

  // If it's an absolute URL, try to normalize its pathname (remove backend/../uploads etc)
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const root = API.base.replace(/\/backend\/api\.php$/i, '');

      // If the absolute URL already contains the public assets path, use that portion
      const assetsIndex = url.pathname.toLowerCase().indexOf('/assets/');
      if (assetsIndex !== -1) {
        const cleaned = url.pathname.substring(assetsIndex).replace(/^\//, '');
        return root.replace(/\/$/, '') + '/' + cleaned;
      }

      // If URL contains uploads/assets, collapse to assets/...
      const uploadsAssetsIndex = url.pathname.toLowerCase().indexOf('/uploads/');
      if (uploadsAssetsIndex !== -1) {
        // try to find '/assets/...' after uploads
        const assetsAfter = url.pathname.toLowerCase().indexOf('/assets/', uploadsAssetsIndex);
        if (assetsAfter !== -1) {
          const cleaned = url.pathname.substring(assetsAfter).replace(/^\//, '');
          return root.replace(/\/$/, '') + '/' + cleaned;
        }
        // fallback: use basename into gallery
        const parts = url.pathname.split('/');
        const baseName = parts.pop() || parts.pop();
        return root.replace(/\/$/, '') + '/assets/Images/gallery/' + baseName;
      }

      // No known patterns — return the original absolute URL
      return path;
    } catch (e) {
      // If URL parsing fails, fall through to relative handling
    }
  }

  // Remove any leading ../ or ./ segments
  let cleaned = path.replace(/^(\.\.\/|\.\/)+/, '');

  // If backend prefixed paths with uploads (e.g. ../uploads/assets/...), strip the uploads segment
  // so we end up with assets/Images/... instead of uploads/assets/Images/...
  cleaned = cleaned.replace(/^(?:uploads[\/]|(?:\.\.\/[\/]?)?uploads[\/])/i, '');
  // Also collapse any accidental 'uploads/assets' occurrences inside the path
  cleaned = cleaned.replace(/uploads[\/]+assets/i, 'assets');

  // Fix common typo from backend ('assests' -> 'assets')
  cleaned = cleaned.replace(/assests\//i, 'assets/');

  // Trim any leading slashes
  cleaned = cleaned.replace(/^\//, '');

  // Build absolute URL using API.base root (http://.../NCB)
  const root = API.base.replace(/\/backend\/api\.php$/i, '');
  // If the backend returned only a filename (no slash) assume it lives in the gallery folder
  if (!/\/|\\/.test(cleaned) && /\.[a-zA-Z]{2,4}$/.test(cleaned)) {
    cleaned = 'assets/Images/gallery/' + cleaned;
  }
  // Ensure no double slashes when joining
  return root.replace(/\/$/, '') + '/' + cleaned.replace(/^\//, '');
}

// Update your server utility functions to call backend with action as a query parameter
const server = {
  async get(action, params = {}) {
    try {
      const url = new URL(API.base);
      url.searchParams.append('action', action);

      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });

      const response = await fetch(url.toString(), { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const payload = await response.json();
      if (!payload || payload.status !== 'success') {
        console.warn('API GET returned non-success:', payload);
        return null;
      }

      return payload.data ?? null;
    } catch (error) {
      console.error('GET request failed:', error);
      return null;
    }
  },

  async post(action, data, isFormData = false) {
    try {
      const url = new URL(API.base);
      url.searchParams.append('action', action);

      if (isFormData) {
        const form = new FormData();
        // If data is already FormData-like, copy keys
        Object.keys(data).forEach(key => {
          form.append(key, data[key]);
        });
        // include action in POST body as well for compatibility
        form.append('action', action);

        const response = await fetch(url.toString(), { method: 'POST', body: form, credentials: 'same-origin' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const payload = await response.json();
        return payload.status === 'success' ? (payload.data ?? null) : null;
      } else {
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'same-origin'
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const payload = await response.json();
        return payload.status === 'success' ? (payload.data ?? null) : null;
      }
    } catch (error) {
      console.error('POST request failed:', error);
      return null;
    }
  }
};

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    PageManager.init();
    renderCommitteeMembers();
});

async function initializeApp() {
    setCurrentYear();
    initNavigation();
    initSearch();
  // Load dynamic data from server to replace any demo content
  await loadEventsIntoDOM();
  await loadNoticesIntoDOM();
    initHeroSlider();
    initTabs();
    initCardEffects();
    initRSVPButtons();
    initSmoothScrolling();
    initAnimations();
    initReadMore();
    await initGallery();
    initGallerySlider();
    addLoadingStyles();
    addNewsModalStyles();
    newsExpandModal();
    initJoinNCBButton();
    addCertificateStyles();
}

// Core functionality
function setCurrentYear() {
    const yearElement = $('#year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();
}

function initNavigation() {
    const mobileToggle = $('.mobile-nav-toggle');
    const navMenu = $('.nav-menu');
    const dropdownParents = Array.from($$('.has-sub'));
    const parentLinks = Array.from($$('.has-sub > a'));

    if (!mobileToggle || !navMenu) return;

    const closeAllDropdowns = () => {
        dropdownParents.forEach(li => {
            li.classList.remove('open');
            const link = li.querySelector('a');
            if (link) link.setAttribute('aria-expanded', 'false');
        });
    };

    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navMenu.classList.toggle('open');
        mobileToggle.classList.toggle('active');
        if (!navMenu.classList.contains('open')) closeAllDropdowns();
    });

    parentLinks.forEach(link => {
        link.setAttribute('aria-haspopup', 'true');
        link.setAttribute('aria-expanded', 'false');

        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                e.stopPropagation();
                const parentLi = link.parentElement;
                const isOpen = parentLi.classList.contains('open');

                if (isOpen) {
                    parentLi.classList.remove('open');
                    link.setAttribute('aria-expanded', 'false');
                } else {
                    closeAllDropdowns();
                    parentLi.classList.add('open');
                    link.setAttribute('aria-expanded', 'true');
                }
            }
        });
    });

    $$('.has-sub .dropdown a').forEach(sublink => {
        sublink.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                navMenu.classList.remove('open');
                mobileToggle.classList.remove('active');
                closeAllDropdowns();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 && !e.target.closest('.main-nav')) {
            navMenu.classList.remove('open');
            mobileToggle.classList.remove('active');
            closeAllDropdowns();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            navMenu.classList.remove('open');
            mobileToggle.classList.remove('active');
            closeAllDropdowns();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
            navMenu.classList.remove('open');
            mobileToggle.classList.remove('active');
            closeAllDropdowns();
        }
    });
}

function initSearch() {
    const searchBtn = $('#search-btn');
    const searchInput = $('#search-input');

    if (!searchBtn || !searchInput) return;

    const performSearch = async () => {
        const term = searchInput.value.trim();
        if (!term) {
            handleEmptySearch(searchInput);
            return;
        }

        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchBtn.disabled = true;

        // Fetch search results from PHP API
        const results = await server.get(API.endpoints.search, { q: term });

        setTimeout(() => {
            if (results) {
                displaySearchResults(results);
            } else {
                alert(`No results found for: ${term}`);
            }
            searchBtn.innerHTML = 'Search';
            searchBtn.disabled = false;
        }, 500);
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());
    searchInput.addEventListener('keydown', (e) => e.key === 'Escape' && clearSearch(searchInput));
}

function handleEmptySearch(input) {
    input.setAttribute('placeholder', 'Please enter a search term...');
    input.focus();
    setTimeout(() => input.setAttribute('placeholder', 'Search...'), 2000);
}

function displaySearchResults(results) {
    // Implementation to display search results
    console.log('Search results:', results);
    // You could update a modal or a dedicated results section
}

function clearSearch(input) {
    input.value = '';
    input.blur();
}

// Hero Slider
function initHeroSlider() {
    const slides = $$('.hero-slider .slide');
    if (!slides.length) return;

    let currentSlide = 0;
    let slideInterval = setInterval(nextSlide, 5000);
    let isPaused = false;

    const showSlide = (index) => {
        currentSlide = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
            const isActive = i === currentSlide;
            slide.classList.toggle('active', isActive);
            slide.setAttribute('aria-hidden', !isActive);
            slide.style.transition = 'opacity 0.5s ease';
        });
    };

    const nextSlide = () => !isPaused && showSlide(currentSlide + 1);
    const prevSlide = () => !isPaused && showSlide(currentSlide - 1);

    const resetAutoAdvance = () => {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 5000);
    };

    $$('.slider-controls .prev, .slider-controls .next').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            index ? nextSlide() : prevSlide();
            resetAutoAdvance();
        });
    });

    const heroSlider = $('.hero-slider');
    if (heroSlider) {
        const pauseSlider = () => {
            isPaused = true;
            clearInterval(slideInterval);
        };

        const resumeSlider = () => {
            isPaused = false;
            resetAutoAdvance();
        };

        heroSlider.addEventListener('mouseenter', pauseSlider);
        heroSlider.addEventListener('mouseleave', resumeSlider);
        heroSlider.addEventListener('touchstart', pauseSlider);
        heroSlider.addEventListener('touchend', () => setTimeout(resumeSlider, 3000));
    }

    document.addEventListener('keydown', (e) => {
        const keyActions = {
            'ArrowLeft': () => { prevSlide(); resetAutoAdvance(); },
            'ArrowRight': () => { nextSlide(); resetAutoAdvance(); },
            ' ': () => {
                isPaused = !isPaused;
                isPaused ? clearInterval(slideInterval) : resetAutoAdvance();
            }
        };

        keyActions[e.key]?.();
    });

    showSlide(0);
}

// Gallery Slider with PHP integration
async function initGallerySlider() {
    const slidesContainer = $(".slides");
    const dotsContainer = $(".dots");
    const prevBtn = $(".prev");
    const nextBtn = $(".next");
    const playPauseBtn = $(".play-pause");

    if (!slidesContainer || !dotsContainer) return;

  // Fetch images from PHP API
  const response = await server.get(API.endpoints.gallery);
  let images = response || [];

  // Normalize backend image records to include a .url property used by the slider
  if (Array.isArray(images)) {
    images = images.map(img => {
      if (!img) return img;
      if (typeof img === 'string') return { url: normalizeImagePath(img), title: '', desc: '' };

      const raw = img.image_path || img.image || img.url || img.src || '';
      const url = raw ? normalizeImagePath(raw) : (img.url || img.src || '');

      // Set title and desc properly from possible backend fields
      const title = img.title || img.name || img.filename || '';
      const desc = img.description || img.desc || img.caption || '';

      return Object.assign({}, img, { url, title, desc });
    });
  } else {
    images = [];
  }

    if (images.length === 0) {
        console.warn('No gallery images found for slider');
        return;
    }

  let currentIndex = 0;
    let autoSlide = true;
    let interval;

    // Create slides and dots
  images.forEach((image, index) => {
    const img = document.createElement("img");
    img.src = image.url || image;
    img.alt = image.title || image.desc || '';
    img.loading = 'lazy';

    // If image fails to load, try a few heuristics then fallback to placeholder
    img.addEventListener('error', function () {
      // Try to repair common path issues
      const src = this.src || '';
      const attempts = [];

      // replace 'assests' -> 'assets'
      if (/assests/i.test(src)) attempts.push(src.replace(/assests/i, 'assets'));
      // remove any '/../' segments
      attempts.push(src.replace(/(\.{2}\/)+/g, ''));
      // try gallery uploads folder
      const baseName = src.split('/').pop();
      attempts.push(API.base.replace(/\/backend\/api\.php$/i, '').replace(/\/$/, '') + '/assets/Images/gallery/' + baseName);

      let tried = 0;
      const tryNext = () => {
        if (tried >= attempts.length) {
                    this.src = 'data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='#eeeeee' width='100%' height='100%'/><text x='50%' y='50%' font-family='Arial, Helvetica, sans-serif' font-size='24' text-anchor='middle' fill='#888'>Image not available</text></svg>");
          return;
        }
        this.src = attempts[tried++];
      };

      tryNext();
    });

    if (index === 0) img.classList.add("active");
    slidesContainer.appendChild(img);

    const dot = document.createElement("span");
    dot.classList.add("dot");
    if (index === 0) dot.classList.add("active");
    dot.addEventListener("click", () => showSlide(index));
    dotsContainer.appendChild(dot);
  });

    const slides = $$(".slides img");
    const dots = $$(".dots span");

    const showSlide = (index) => {
        slides[currentIndex]?.classList.remove("active");
        dots[currentIndex]?.classList.remove("active");

        currentIndex = (index + slides.length) % slides.length;

        slides[currentIndex]?.classList.add("active");
        dots[currentIndex]?.classList.add("active");
    };

    const nextSlide = () => showSlide(currentIndex + 1);
    const prevSlideFunc = () => showSlide(currentIndex - 1);

    const startAutoSlide = () => interval = setInterval(nextSlide, 3000);
    const stopAutoSlide = () => clearInterval(interval);

    const toggleAutoSlide = () => {
        autoSlide = !autoSlide;
        playPauseBtn.textContent = autoSlide ? "⏸" : "▶";
        autoSlide ? startAutoSlide() : stopAutoSlide();
    };

    prevBtn?.addEventListener("click", prevSlideFunc);
    nextBtn?.addEventListener("click", nextSlide);
    playPauseBtn?.addEventListener("click", toggleAutoSlide);

    startAutoSlide();
}

// Additional components
function initTabs() {
    const tabs = $$('.tab');
    if (!tabs.length) return;

    $('.tabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab?.dataset.target) return;

        const targetId = tab.dataset.target;

        tabs.forEach(t => {
            const isActive = t === tab;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive);
            t.style.transition = 'all 0.3s ease';
        });

        $$('.tab-panel').forEach(panel => {
            panel.style.transition = 'opacity 0.3s ease';
            panel.style.opacity = '0';

            setTimeout(() => {
                panel.classList.toggle('active', panel.id === targetId);
                setTimeout(() => panel.style.opacity = '1', 50);
            }, 150);
        });
    });
}

function initCardEffects() {
    $$('.card').forEach(card => {
        const activateCard = (event) => {
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.transform = event.type === 'mouseenter'
                ? 'translateY(-8px) scale(1.02)'
                : 'translateY(-4px) scale(1.01)';
        };

        const deactivateCard = () => {
            card.style.transform = 'translateY(0) scale(1)';
        };

        card.addEventListener('mouseenter', activateCard);
        card.addEventListener('touchstart', activateCard);
        card.addEventListener('mouseleave', deactivateCard);
        card.addEventListener('touchend', deactivateCard);
    });
}

function initRSVPButtons() {
  $$('.rsvp').forEach(button => {
    // prevent double-binding: mark initialized buttons
    if (button.dataset.rsvpInit === '1') return;
    button.dataset.rsvpInit = '1';

    // ensure this button won't accidentally submit a surrounding form or navigate
    try { button.type = 'button'; } catch (e) {}

    button.addEventListener('click', async (e) => {
      // prevent default navigation (anchors) or form submission
      if (e && typeof e.preventDefault === 'function') e.preventDefault();

      const eventCard = button.closest('.event-card');
      if (!eventCard) return console.warn('RSVP button has no parent .event-card');

      const titleEl = eventCard.querySelector('h4');
      const eventTitle = titleEl ? titleEl.textContent : '';
      const eventId = eventCard.dataset.eventId;

      if (!eventId) {
        console.warn('Cannot RSVP: eventId missing on card');
        // give quick visual feedback
        button.textContent = 'No event ID';
        setTimeout(() => { button.textContent = 'RSVP'; }, 2000);
        return;
      }

      const origText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      button.disabled = true;

      // Post RSVP to PHP API
      const response = await server.post(API.endpoints.rsvp, {
        eventId,
        eventTitle
      });

      // response is the data payload (or null on error). Log for debugging.
      console.debug('RSVP response:', response);

      setTimeout(() => {
        if (response && response.success) {
          button.textContent = 'RSVP Confirmed!';
          button.style.background = '#28a745';
        } else {
          button.textContent = 'RSVP Failed';
          button.style.background = '#dc3545';
        }

        setTimeout(() => {
          button.textContent = 'RSVP';
          button.disabled = false;
          button.style.background = '';
        }, 3000);
      }, 300);
    });
  });
}

function initSmoothScrolling() {
    $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = $(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

function initAnimations() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    $$('.card, .event-card, .news-item, .program-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

function initReadMore() {
    const readMoreBtn = $('.read-more-btn');
    const messageContainer = $('.message-container');

    if (readMoreBtn && messageContainer) {
        readMoreBtn.addEventListener('click', () => {
            const isExpanded = messageContainer.classList.toggle('expanded');
            readMoreBtn.textContent = isExpanded ? 'Read Less' : 'Read More';
        });
    }
}

// Image Gallery with Pagination and Lightbox with PHP integration
let Galimages = [];
let currentPage = 1;
let imagesPerPage = 9;
let currentLightboxIndex = 0;

async function initGallery() {
    const container = $('.images-container');
    if (!container) return;

  // Fetch images from PHP API
  const response = await server.get(API.endpoints.gallery);
  Galimages = Array.isArray(response) ? response.map(img => {
    if (!img) return img;
    if (typeof img === 'string') return { url: normalizeImagePath(img), title: '', desc: '' };
    const raw = img.image_path || img.image || img.url || img.src || '';
    const url = raw ? normalizeImagePath(raw) : (img.url || img.src || '');
    return Object.assign({}, img, { url });
  }) : [];

    if (Galimages.length === 0) {
        console.warn('No gallery images found');
        container.innerHTML = '<p>No images available</p>';
        return;
    }

    // Create gallery controls if they don't exist
    createGalleryControls(container);

    // Create lightbox modal
    createLightboxModal();

    // Initialize pagination
    updateGallery();
    setupGalleryEventListeners();
}

function createGalleryControls(container) {
    if ($('.gallery-controls')) return;

    const gallerySection = container.closest('#Gallery');
    if (!gallerySection) return;

    const controlsHTML = `
    <div class="gallery-controls">
      <div class="images-per-page">
        <label for="per-page">Images per page:</label>
        <select id="per-page">
          <option value="6">6</option>
          <option value="9" selected>9</option>
          <option value="12">12</option>
          <option value="15">15</option>
        </select>
      </div>
    </div>
    <div class="pagination">
      <button id="first-page" class="page-btn">«</button>
      <button id="prev-page" class="page-btn">‹</button>
      <div class="page-numbers" id="page-numbers"></div>
      <button id="next-page" class="page-btn">›</button>
      <button id="last-page" class="page-btn">»</button>
    </div>
    <div class="page-info" id="page-info"></div>
  `;

    container.insertAdjacentHTML('afterend', controlsHTML);
}

function createLightboxModal() {
    if ($('#lightbox-modal')) return;

    const lightboxHTML = `
    <div id="lightbox-modal" class="lightbox">
      <div class="lightbox-content">
        <span class="lightbox-close">&times;</span>
        <button class="lightbox-nav lightbox-prev">‹</button>
        <div class="lightbox-image-container">
          <img id="lightbox-image" src="" alt="">
          <div class="lightbox-info">
            <h3 id="lightbox-title"></h3>
            <p id="lightbox-desc"></p>
            <div class="lightbox-counter">
              <span id="lightbox-counter">1 of ${Galimages.length}</span>
            </div>
          </div>
        </div>
        <button class="lightbox-nav lightbox-next">›</button>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    setupLightboxEventListeners();
}

function setupLightboxEventListeners() {
    const lightbox = $('#lightbox-modal');
    const closeBtn = $('.lightbox-close');
    const prevBtn = $('.lightbox-prev');
    const nextBtn = $('.lightbox-next');

    closeBtn?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    prevBtn?.addEventListener('click', showPrevImage);
    nextBtn?.addEventListener('click', showNextImage);

    document.addEventListener('keydown', handleLightboxKeyboard);
}

function handleLightboxKeyboard(e) {
    const lightbox = $('#lightbox-modal');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    switch (e.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowLeft':
            showPrevImage();
            break;
        case 'ArrowRight':
            showNextImage();
            break;
    }
}

function openLightbox(imageIndex) {
    const lightbox = $('#lightbox-modal');
    const lightboxImage = $('#lightbox-image');
    const lightboxTitle = $('#lightbox-title');
    const lightboxDesc = $('#lightbox-desc');
    const lightboxCounter = $('#lightbox-counter');

    if (!lightbox || !lightboxImage) return;

    currentLightboxIndex = imageIndex;
    const image = Galimages[imageIndex];

    lightboxImage.src = image.url || image.src;
    lightboxImage.alt = image.title;
    lightboxTitle.textContent = image.title;
    lightboxDesc.textContent = image.desc;
    lightboxCounter.textContent = `${imageIndex + 1} of ${Galimages.length}`;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = $('#lightbox-modal');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showNextImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % Galimages.length;
    openLightbox(currentLightboxIndex);
}

function showPrevImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + Galimages.length) % Galimages.length;
    openLightbox(currentLightboxIndex);
}

function setupGalleryEventListeners() {
    const perPageSelect = $('#per-page');
    const prevPageBtn = $('#prev-page');
    const nextPageBtn = $('#next-page');
    const firstPageBtn = $('#first-page');
    const lastPageBtn = $('#last-page');

    if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
            imagesPerPage = parseInt(e.target.value);
            currentPage = 1;
            updateGallery();
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateGallery();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < getTotalPages()) {
                currentPage++;
                updateGallery();
            }
        });
    }

    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            updateGallery();
        });
    }

    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            currentPage = getTotalPages();
            updateGallery();
        });
    }
}

function getTotalPages() {
    return Math.ceil(Galimages.length / imagesPerPage);
}

function getCurrentPageImages() {
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;
    return Galimages.slice(startIndex, endIndex);
}

function updateGallery() {
    const container = $('.images-container');
    if (!container) return;

    container.innerHTML = '';
    const currentImages = getCurrentPageImages();
    const startIndex = (currentPage - 1) * imagesPerPage;

    currentImages.forEach((image, index) => {
        const globalIndex = startIndex + index;
        const card = createImageCard(image, globalIndex);
        container.appendChild(card);
    });

    updatePagination();
    updatePageInfo();
}

function createImageCard(image, globalIndex) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.style.cursor = 'pointer';

    const img = document.createElement('img');
  img.src = image.url || image.src;
    img.alt = image.title;
    img.loading = 'lazy';

  // try to fix broken images on the fly
  img.addEventListener('error', function () {
    const src = this.src || '';
    // common fixes
    const attempts = [];
    if (/assests/i.test(src)) attempts.push(src.replace(/assests/i, 'assets'));
    attempts.push(src.replace(/(\.{2}\/)+/g, ''));
    const baseName = src.split('/').pop();
    attempts.push(API.base.replace(/\/backend\/api\.php$/i, '').replace(/\/$/, '') + '/assets/Images/gallery/' + baseName);

    let tried = 0;
    const tryNext = () => {
      if (tried >= attempts.length) {
                this.src = 'data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='#eeeeee' width='100%' height='100%'/><text x='50%' y='50%' font-family='Arial, Helvetica, sans-serif' font-size='24' text-anchor='middle' fill='#888'>Image not available</text></svg>");
        return;
      }
      this.src = attempts[tried++];
    };

    tryNext();
  });

    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';

  const title = document.createElement('div');
  title.className = 'image-title';
  title.textContent = image.title || image.desc || '';

  const desc = document.createElement('div');
  desc.className = 'image-desc';
  desc.textContent = image.desc || '';

    overlay.appendChild(title);
    overlay.appendChild(desc);
    card.appendChild(img);
    card.appendChild(overlay);

    card.addEventListener('click', () => {
        openLightbox(globalIndex);
    });

    return card;
}

function updatePagination() {
    const totalPages = getTotalPages();
    const pageNumbersContainer = $('#page-numbers');

    if (!pageNumbersContainer) return;

    pageNumbersContainer.innerHTML = '';

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const firstBtn = createPageButton(1);
        pageNumbersContainer.appendChild(firstBtn);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'page-ellipsis';
            pageNumbersContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i);
        pageNumbersContainer.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'page-ellipsis';
            pageNumbersContainer.appendChild(ellipsis);
        }
        const lastBtn = createPageButton(totalPages);
        pageNumbersContainer.appendChild(lastBtn);
    }

    updatePaginationButtonStates(totalPages);
}

function createPageButton(pageNumber) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'page-btn';
    pageBtn.textContent = pageNumber;
    pageBtn.classList.toggle('active', pageNumber === currentPage);

    pageBtn.addEventListener('click', () => {
        currentPage = pageNumber;
        updateGallery();
    });

    return pageBtn;
}

function updatePaginationButtonStates(totalPages) {
    const prevPageBtn = $('#prev-page');
    const nextPageBtn = $('#next-page');
    const firstPageBtn = $('#first-page');
    const lastPageBtn = $('#last-page');

    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;
}

function updatePageInfo() {
    const pageInfo = $('#page-info');
    if (!pageInfo) return;

    const totalPages = getTotalPages();
    const startIndex = (currentPage - 1) * imagesPerPage + 1;
    const endIndex = Math.min(currentPage * imagesPerPage, Galimages.length);

    pageInfo.textContent = `Showing ${startIndex}-${endIndex} of ${Galimages.length} images (Page ${currentPage} of ${totalPages})`;
}

// News modal with PHP integration
async function newsExpandModal() {
    if ($('#news-modal')) return;

    // Fetch news from PHP API
    const newsItems = await server.get(API.endpoints.news) || [];

    if (newsItems.length === 0) {
        console.warn('No news items found');
        return;
    }

    const modalHTML = `
    <div id="news-modal" class="news-modal" style="display: none;">
      <div class="news-modal-overlay"></div>
      <div class="news-modal-content">
        <button class="news-modal-close" aria-label="Close modal">
          <i class="fas fa-times"></i>
        </button>
        <div class="news-modal-header">
          <h2 class="news-modal-title"></h2>
          <p class="news-modal-date"></p>
        </div>
        <div class="news-modal-body">
          <div class="news-modal-message"></div>
        </div>
        <div class="news-modal-footer">
          <button class="btn-secondary" onclick="closeNewsModal()">Close</button>
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const readMoreLinks = $$('.news-item a[href="#"]');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const newsItem = this.closest('.news-item');
            const title = newsItem.querySelector('h4').textContent;
            const date = newsItem.querySelector('.date').textContent;

            // Find news content from fetched data
            const newsContent = newsItems.find(item => item.title === title);
            const content = newsContent ? newsContent.content : getNewsContent(title);

            openNewsModal(title, date, content);
        });
    });

    const overlay = $('.news-modal-overlay');
    const closeBtn = $('.news-modal-close');

    if (overlay) overlay.addEventListener('click', closeNewsModal);
    if (closeBtn) closeBtn.addEventListener('click', closeNewsModal);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeNewsModal();
        }
    });
}

function openNewsModal(title, date, content) {
    const modal = $('#news-modal');
    const modalTitle = $('.news-modal-title');
    const modalDate = $('.news-modal-date');
    const modalMessage = $('.news-modal-message');

    if (modalTitle) modalTitle.textContent = title;
    if (modalDate) modalDate.textContent = date;
    if (modalMessage) modalMessage.innerHTML = content;

    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeNewsModal() {
    const modal = $('#news-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function getNewsContent(title) {
    const newsData = {
        "Teej Festival Announced": `
      <p>We are excited to announce the upcoming Teej Festival celebration in Busan! This year's event promises to be bigger and better than ever before.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Date:</strong> September 15, 2024</li>
        <li><strong>Time:</strong> 10:00 AM - 6:00 PM</li>
        <li><strong>Location:</strong> Busan Cultural Center</li>
        <li><strong>Dress Code:</strong> Traditional Nepali attire encouraged</li>
      </ul>
      <p>The festival will feature traditional music, dance performances, delicious Nepali food, and various cultural activities. All community members are warmly invited to participate in this celebration of our rich cultural heritage.</p>
      <p>We look forward to seeing you there for a day filled with joy, tradition, and community bonding!</p>
    `,
        "Membership Renewal Deadline": `
      <p>Attention all NCB members! This is a friendly reminder that the membership renewal deadline is approaching.</p>
      <p><strong>Important Information:</strong></p>
      <ul>
        <li><strong>Renewal Deadline:</strong> April 30, 2024</li>
        <li><strong>Annual Membership Fee:</strong> ₩20,000</li>
        <li><strong>Payment Methods:</strong> Bank transfer, cash, or online payment</li>
      </ul>
      <p>Renewing your membership ensures you continue to receive all benefits including:</p>
      <ul>
        <li>Priority access to community events</li>
        <li>Voting rights in general meetings</li>
        <li>Access to member-only resources</li>
        <li>Emergency support services</li>
      </ul>
      <p>Please contact our membership coordinator if you have any questions or need assistance with the renewal process.</p>
    `,
        "Upcoming Dashain Event": `
      <p>Mark your calendars! The NCB is organizing a grand Dashain celebration for all Nepali community members in Busan.</p>
      <p><strong>Celebration Highlights:</strong></p>
      <ul>
        <li>Traditional Dashain puja and rituals</li>
        <li>Tika and jamara distribution</li>
        <li>Cultural programs and performances</li>
        <li>Traditional Nepali feast</li>
        <li>Games and activities for all ages</li>
      </ul>
      <p>This is one of our most important cultural events of the year, bringing together our community to celebrate our traditions and strengthen our bonds.</p>
      <p>More detailed information including exact date, venue, and registration process will be announced soon. Stay tuned for updates!</p>
    `
    };

    return newsData[title] || `<p>Content not available for this news item.</p>`;
}

// Membership form with PHP integration
const PAYMENT_CONFIG = {
    amount: 10000,
    currency: 'KRW',
    bankName: 'Busan Bank',
    accountNumber: '123-456-7890',
    accountHolder: 'Nepalese Community Busan'
};

function initJoinNCBButton() {
    const joinButtons = $$('.join-btn, .join-today-btn');

    joinButtons.forEach(button => {
        button.addEventListener('click', function () {
            const originalText = button.textContent;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening Form...';
            button.disabled = true;

            setTimeout(() => {
                showJoinForm();
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 1000);
            }, 500);
        });
    });
}

function showJoinForm() {
    const formHTML = `
    <div id="join-modal" class="modal-overlay" style="display: flex;">
      <div class="modal-content">
        <button class="modal-close" onclick="closeJoinModal()">
          <i class="fas fa-times"></i>
        </button>
        <div class="modal-header">
          <h3>Join NCB - Nepalese Community in Busan</h3>
          <p class="membership-fee">Membership Fee: ${PAYMENT_CONFIG.amount.toLocaleString()} ${PAYMENT_CONFIG.currency}</p>
        </div>
        <form id="join-form">
          <div class="form-group">
            <label for="full-name">Full Name *</label>
            <input type="text" id="full-name" name="full_name" placeholder="Enter your full name" required>
          </div>
          
          <div class="form-group">
            <label for="email">Email Address *</label>
            <input type="email" id="email" name="email" placeholder="Enter your email address" required>
          </div>
          
          <div class="form-group">
            <label for="phone">Contact Number *</label>
            <input type="tel" id="phone" name="phone" placeholder="Enter your phone number" required>
          </div>
          
          <div class="form-group">
            <label for="university">University/Institution</label>
            <input type="text" id="university" name="university" placeholder="Which university do you attend?">
          </div>
          
          <div class="form-group">
            <label for="visa-type">Visa Type *</label>
            <select id="visa-type" name="visa_type" required>
              <option value="">Select your visa type</option>
              <option value="D-2">D-2 (Student Visa)</option>
              <option value="D-4">D-4 (General Training Visa)</option>
              <option value="E-7">E-7 (Professional Employment)</option>
              <option value="F-2">F-2 (Resident)</option>
              <option value="F-6">F-6 (Marriage Migrant)</option>
              <option value="other">Other Visa Type</option>
            </select>
          </div>
          
          <div class="form-group" id="other-visa-container" style="display: none;">
            <label for="other-visa">Please specify your visa type</label>
            <input type="text" id="other-visa" name="other_visa" placeholder="Enter your visa type">
          </div>
          
          <div class="form-group">
            <label for="arrival-date">Arrival Date in Korea</label>
            <input type="date" id="arrival-date" name="arrival_date">
          </div>
          
          <div class="form-group">
            <label for="interests">Areas of Interest (Optional)</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" name="interests[]" value="cultural-events"> Cultural Events
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="interests[]" value="sports"> Sports Activities
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="interests[]" value="volunteering"> Volunteering
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="interests[]" value="student-support"> Student Support
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="interests[]" value="professional"> Professional Networking
              </label>
            </div>
          </div>
          
          <div class="payment-section">
            <h4>Payment Information</h4>
            <div class="bank-details">
              <p><strong>Bank Name:</strong> ${PAYMENT_CONFIG.bankName}</p>
              <p><strong>Account Number:</strong> ${PAYMENT_CONFIG.accountNumber}</p>
              <p><strong>Account Holder:</strong> ${PAYMENT_CONFIG.accountHolder}</p>
              <p><strong>Amount:</strong> ${PAYMENT_CONFIG.amount.toLocaleString()} ${PAYMENT_CONFIG.currency}</p>
            </div>
            
            <div class="form-group">
              <label for="payment-screenshot">Payment Screenshot/Proof *</label>
              <input type="file" id="payment-screenshot" name="payment_screenshot" accept="image/*" required>
              <small class="file-help">Please upload a clear screenshot of your bank transfer</small>
            </div>
            
            <div class="form-group">
              <label for="transaction-id">Transaction ID/Reference Number *</label>
              <input type="text" id="transaction-id" name="transaction_id" placeholder="Enter transaction ID from your bank" required>
            </div>
          </div>
          
          <div class="form-footer">
            <p class="required-note">* Required fields</p>
            <button type="submit" class="btn-primary submit-btn">
              <i class="fas fa-user-plus"></i> Submit Membership Application
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

    const existingModal = $('#join-modal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', formHTML);

    const form = $('#join-form');
    if (form) {
        form.addEventListener('submit', handleJoinFormSubmit);
    }

    const visaTypeSelect = $('#visa-type');
    if (visaTypeSelect) {
        visaTypeSelect.addEventListener('change', function () {
            const otherVisaContainer = $('#other-visa-container');
            if (this.value === 'other') {
                otherVisaContainer.style.display = 'block';
            } else {
                otherVisaContainer.style.display = 'none';
            }
        });
    }

    addModalStyles();
}

async function handleJoinFormSubmit(e) {
    e.preventDefault();

    const submitBtn = $('.submit-btn');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    // Create FormData object for file upload
    const formData = new FormData();
    formData.append('action', API.endpoints.applications);

    // Add all form fields
    const formElements = $('#join-form').elements;
    for (let element of formElements) {
        if (element.name) {
            if (element.type === 'file') {
                formData.append(element.name, element.files[0]);
            } else if (element.type === 'checkbox') {
                if (element.checked) {
                    formData.append(element.name, element.value);
                }
            } else {
                formData.append(element.name, element.value);
            }
        }
    }

    // Add additional data
    formData.append('application_date', new Date().toISOString());
    formData.append('status', 'pending');
    formData.append('member_id', generateMemberId());

    try {
        const response = await fetch(API.base, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        const result = await response.json();

        if (result.status === 'success') {
            showApplicationSubmitted({
                name: formData.get('full_name'),
                email: formData.get('email'),
                memberId: formData.get('member_id')
            });
        } else {
            alert('Failed to submit application: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error submitting application:', error);
        alert('Failed to submit application. Please try again.');
    }

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
}

function showApplicationSubmitted(applicationData) {
    const form = $('#join-form');
    if (form) {
        form.innerHTML = `
      <div class="success-message">
        <div class="success-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Application Submitted Successfully! 🎉</h3>
        <p>Thank you, ${applicationData.name}, for applying to join the Nepalese Community in Busan.</p>
        <p><strong>Your Application ID: NCB-${applicationData.memberId}</strong></p>
        
        <div class="next-steps">
          <h4>What Happens Next?</h4>
          <ul>
            <li>We've received your application and payment details</li>
            <li>Our admin team will verify your payment within 24-48 hours</li>
            <li>Once verified, your membership certificate will be emailed to ${applicationData.email}</li>
            <li>You'll receive access to all NCB member benefits</li>
          </ul>
        </div>
        
        <div class="contact-info">
          <h4>Questions?</h4>
          <p>If you have any questions about your application, please contact us at:</p>
          <p><i class="fas fa-envelope"></i> ncb.administration@nepalibusan.org</p>
        </div>
        
        <button class="btn-primary" onclick="closeJoinModal()">Close</button>
      </div>
    `;
    }
}

function generateMemberId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
}

function closeJoinModal() {
    const modal = $('#join-modal');
    if (modal) {
        modal.remove();
    }
}

// Styles
function addLoadingStyles() {
    const style = document.createElement('style');
    style.textContent = `
    button.loading { 
      position: relative; 
      color: transparent !important; 
    }
    button.loading::after {
      content: ''; 
      position: absolute; 
      width: 16px; 
      height: 16px; 
      top: 50%; 
      left: 50%;
      margin: -8px 0 0 -8px; 
      border: 2px solid transparent; 
      border-top: 2px solid currentColor;
      border-radius: 50%; 
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 
      0% { transform: rotate(0deg); } 
      100% { transform: rotate(360deg); } 
    }
    
    /* Gallery Pagination Styles */
    .gallery-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 0 20px;
    }
    
    .images-per-page {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .images-per-page select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 30px;
      gap: 10px;
    }
    
    .pagination button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background-color: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .pagination button:hover:not(:disabled) {
      background-color: #e63946;
      color: white;
      border-color: #e63946;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .pagination .page-numbers {
      display: flex;
      gap: 5px;
    }
    
    .pagination .page-btn {
      min-width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .pagination .page-btn.active {
      background-color: #e63946;
      color: white;
      border-color: #e63946;
    }
    
    .page-ellipsis {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      color: #666;
    }
    
    .page-info {
      text-align: center;
      margin-top: 10px;
      color: #666;
    }
    
    /* Images container styles */
    .images-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      padding: 20px;
      min-height: 600px;
    }
    
    .image-card {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      aspect-ratio: 1 / 1;
      background-color: #fff;
    }
    
    .image-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
    }
    
    .image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.5s ease;
    }
    
    .image-card:hover img {
      transform: scale(1.05);
    }
    
    .image-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      color: white;
      padding: 20px 15px 15px;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    }
    
    .image-card:hover .image-overlay {
      transform: translateY(0);
    }
    
    .image-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .image-desc {
      font-size: 0.9rem;
      opacity: 0.9;
    }
    
    /* Lightbox Styles */
    .lightbox {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      animation: fadeIn 0.3s ease;
    }
    
    .lightbox.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .lightbox-close {
      position: absolute;
      top: -40px;
      right: 0;
      color: white;
      font-size: 35px;
      font-weight: bold;
      cursor: pointer;
      transition: color 0.3s ease;
      z-index: 1001;
    }
    
    .lightbox-close:hover {
      color: #e63946;
    }
    
    .lightbox-nav {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 24px;
      padding: 15px;
      cursor: pointer;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .lightbox-nav:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .lightbox-image-container {
      position: relative;
      max-width: 800px;
      max-height: 80vh;
    }
    
    #lightbox-image {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
    }
    
    .lightbox-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      color: white;
      padding: 20px;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }
    
    #lightbox-title {
      margin: 0 0 8px 0;
      font-size: 1.4rem;
    }
    
    #lightbox-desc {
      margin: 0 0 10px 0;
      opacity: 0.9;
    }
    
    .lightbox-counter {
      text-align: center;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @media (max-width: 768px) {
      .images-container {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        padding: 10px;
      }
      
      .gallery-controls {
        flex-direction: column;
        gap: 15px;
      }
      
      .pagination {
        flex-wrap: wrap;
      }
      
      .lightbox-content {
        flex-direction: column;
        gap: 10px;
      }
      
      .lightbox-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
      }
      
      .lightbox-prev {
        left: 10px;
      }
      
      .lightbox-next {
        right: 10px;
      }
    }
    
    @media (max-width: 480px) {
      .images-container {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
      
      .lightbox-nav {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }
    }
    
    /* Committee Styles */
    .committee-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 30px;
      padding: 20px;
    }
    
    .committee-member {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }
    
    .committee-member:hover {
      transform: translateY(-5px);
    }
    
    .member-image {
      height: 200px;
      overflow: hidden;
    }
    
    .member-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
    
    .committee-member:hover .member-image img {
      transform: scale(1.05);
    }
    
    .member-info {
      padding: 20px;
    }
    
    .member-info h3 {
      margin: 0 0 5px 0;
      color: #2b2d42;
    }
    
    .position {
      color: #e63946;
      font-weight: 600;
      margin: 0 0 10px 0;
    }
    
    .bio {
      color: #495057;
      font-size: 0.9rem;
      line-height: 1.4;
    }
  `;
    document.head.appendChild(style);
}

function addNewsModalStyles() {
    const styles = `
    /* News Modal Styles */
    .news-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
    }

    .news-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
    }

    .news-modal-content {
      position: relative;
      background: white;
      margin: 2rem auto;
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .news-modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #e63946;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
    }

    .news-modal-close:hover {
      background: #c1121f;
    }

    .news-modal-header {
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #e9ecef;
      background: #f8f9fa;
    }

    .news-modal-title {
      color: #2b2d42;
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .news-modal-date {
      color: #6c757d;
      margin: 0;
      font-size: 0.9rem;
    }

    .news-modal-body {
      padding: 2rem;
      flex: 1;
      overflow-y: auto;
    }

    .news-modal-message {
      line-height: 1.6;
      color: #495057;
    }

    .news-modal-message p {
      margin-bottom: 1rem;
    }

    .news-modal-message ul {
      margin-bottom: 1rem;
      padding-left: 1.5rem;
    }

    .news-modal-message li {
      margin-bottom: 0.5rem;
    }

    .news-modal-message strong {
      color: #2b2d42;
      font-weight: 600;
    }

    .news-modal-footer {
      padding: 1rem 2rem;
      border-top: 1px solid #e9ecef;
      background: #f8f9fa;
      text-align: right;
    }

    /* Animation for modal */
    .news-modal-content {
      animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .news-modal-content {
        margin: 1rem auto;
        width: 95%;
        max-height: 95vh;
      }
      
      .news-modal-header,
      .news-modal-body,
      .news-modal-footer {
        padding: 1.5rem;
      }
      
      .news-modal-title {
        font-size: 1.25rem;
      }
    }
  `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

function addModalStyles() {
    if ($('#modal-styles')) return;

    const styles = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    
    .modal-content {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #e63946;
      color: white;
      border: none;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    
    .modal-header h3 {
      color: #2b2d42;
      margin-bottom: 0.5rem;
    }
    
    .membership-fee {
      background: #fff3cd;
      color: #856404;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      margin: 0;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #2b2d42;
    }
    
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.8rem;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #e63946;
    }
    
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: normal;
      cursor: pointer;
    }
    
    .checkbox-label input[type="checkbox"] {
      width: auto;
    }
    
    .payment-section {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }
    
    .payment-section h4 {
      color: #2b2d42;
      margin-bottom: 1rem;
    }
    
    .bank-details {
      background: white;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }
    
    .bank-details p {
      margin: 0.5rem 0;
    }
    
    .file-help {
      display: block;
      margin-top: 0.25rem;
      color: #6c757d;
      font-size: 0.8rem;
    }
    
    .form-footer {
      border-top: 1px solid #e9ecef;
      padding-top: 1.5rem;
      text-align: center;
    }
    
    .required-note {
      font-size: 0.8rem;
      color: #6c757d;
      margin-bottom: 1rem;
    }
    
    .submit-btn {
      width: 100%;
      padding: 1rem;
      font-size: 1.1rem;
    }
    
    .success-message {
      text-align: center;
      padding: 1rem 0;
    }
    
    .success-icon {
      font-size: 4rem;
      color: #28a745;
      margin-bottom: 1rem;
    }
    
    .success-message h3 {
      color: #2b2d42;
      margin-bottom: 1rem;
    }
    
    .next-steps {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
      text-align: left;
    }
    
    .next-steps h4 {
      color: #2b2d42;
      margin-bottom: 1rem;
    }
    
    .next-steps ul {
      list-style: none;
      padding: 0;
    }
    
    .next-steps li {
      padding: 0.3rem 0;
      position: relative;
      padding-left: 1.5rem;
    }
    
    .next-steps li:before {
      content: "✓";
      color: #28a745;
      font-weight: bold;
      position: absolute;
      left: 0;
    }
    
    .contact-info {
      background: #e7f3ff;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }
    
    .contact-info h4 {
      color: #2b2d42;
      margin-bottom: 1rem;
    }
    
    @media (max-width: 768px) {
      .modal-content {
        padding: 1.5rem;
        margin: 1rem;
      }
    }
  `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'modal-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

function addCertificateStyles() {
    const styles = `
    .certificate-option {
      background: linear-gradient(135deg, #e63946, #c1121f);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin: 1.5rem 0;
      text-align: center;
    }

    .certificate-option h4 {
      margin-bottom: 1rem;
      font-size: 1.3rem;
    }

    .download-certificate-btn {
      background: #2b2d42;
      color: white;
      border: 2px solid white;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      margin-top: 1rem;
    }

    .download-certificate-btn:hover {
      background: white;
      color: #2b2d42;
      transform: translateY(-2px);
    }

    .success-message p strong {
      color: #e63946;
      font-size: 1.1rem;
    }
  `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Replace demo event cards in the DOM with data fetched from the server (if available)
async function loadEventsIntoDOM() {
  try {
    const events = await server.get(API.endpoints.events) || [];
    if (!Array.isArray(events) || events.length === 0) return;

    const container = document.querySelector('.events-list');
    if (!container) return;

    // Clear existing demo cards
    container.innerHTML = '';

    // Build cards from server data
    events.forEach(ev => {
      const eventId = ev.id ?? ev.event_id ?? ev.eventId ?? '';
      const title = ev.title || ev.name || 'Untitled Event';
      const dateRaw = ev.event_date ?? ev.start_date ?? ev.date ?? '';
      const displayDate = dateRaw ? (typeof dateRaw === 'string' && /[A-Za-z]/.test(dateRaw) ? dateRaw : new Date(dateRaw).toLocaleDateString()) : '';
      const location = ev.location || '';

      const card = document.createElement('div');
      card.className = 'event-card';
      if (eventId) card.dataset.eventId = eventId;

      const h = document.createElement('h4');
      h.textContent = title;

      const p = document.createElement('p');
      p.className = 'event-meta';
      p.textContent = [location, displayDate].filter(Boolean).join(' | ');

      const btn = document.createElement('button');
      btn.className = 'rsvp';
      btn.type = 'button';
      btn.textContent = 'RSVP';

      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(btn);

      container.appendChild(card);
    });

    // Wire up RSVP buttons for the newly created cards
    initRSVPButtons();
  } catch (e) {
    console.error('Failed to load events from server', e);
  }
}

// Replace demo news/notices in the DOM with server-provided notices
async function loadNoticesIntoDOM() {
  try {
    const notices = await server.get(API.endpoints.news) || [];
    if (!Array.isArray(notices) || notices.length === 0) return;

    const items = Array.from($$('.news-item'));
    if (items.length > 0) {
      items.forEach((item, i) => {
        const n = notices[i];
        if (!n) return;
        const titleEl = item.querySelector('h4');
        const dateEl = item.querySelector('.date');
        const excerptEl = item.querySelector('.excerpt, p');

        if (titleEl) titleEl.textContent = n.title || titleEl.textContent;
        if (dateEl) dateEl.textContent = n.created_at ? new Date(n.created_at).toLocaleDateString() : (n.created_at || dateEl.textContent);
        if (excerptEl) excerptEl.textContent = n.content ? (n.content.substring(0, 200) + (n.content.length > 200 ? '...' : '')) : excerptEl.textContent;
      });
    } else {
      // If there are no existing demo items, try to find a container to inject into
      const container = $('.news-list, #news-list, .news-section');
      if (container) {
        const html = notices.map(n => `
          <div class="news-item">
            <h4>${n.event_date}</h4>
            <div class="date">${n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</div>
            <p class="excerpt">${(n.content || '').substring(0,200)}${(n.content||'').length>200?'...':''}</p>
          </div>
        `).join('');
        container.innerHTML = html;
      }
    }
  } catch (e) {
    console.error('Failed to load notices from server', e);
  }
}