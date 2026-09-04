document.addEventListener('DOMContentLoaded', () => {
    const fullPortfolioContainer = document.getElementById('full-portfolio-container');
    const filterBar = document.getElementById('portfolio-filter-bar');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxPrev = document.querySelector('.lightbox-prev');
    const lightboxNext = document.querySelector('.lightbox-next');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const backToTopBtn = document.getElementById('back-to-top-btn');
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    let currentImages = [];
    let currentIndex = 0;

    // ============================================================
    // DATA LOADING
    // ============================================================

    async function loadProjects() {
        try {
            const response = await fetch(`${API_BASE}/api/projects`, { credentials: 'include' });
            if (response.ok) {
                const projects = await response.json();
                return Array.isArray(projects) ? projects : [];
            }
        } catch (e) {
            console.warn('Could not load projects from backend:', e);
        }

        // Fallback to portfolio endpoint
        try {
            const response = await fetch(`${API_BASE}/api/portfolio`, { credentials: 'include' });
            if (response.ok) {
                const projects = await response.json();
                return Array.isArray(projects) ? projects : [];
            }
        } catch (e) {
            console.warn('Could not load portfolio from backend:', e);
        }
        return [];
    }

    async function loadAllPhotos() {
        try {
            const response = await fetch(`${API_BASE}/api/photos`, { credentials: 'include' });
            if (response.ok) {
                const photos = await response.json();
                if (Array.isArray(photos)) {
                    return photos;
                }
            }
        } catch (e) {
            console.warn('Could not load photos from backend:', e);
        }

        // Fallback: derive photos from projects
        const projects = await loadProjects();
        const photos = [];
        projects.forEach(project => {
            (project.works || []).forEach(work => {
                photos.push({
                    id: work.id,
                    imageUrl: work.imageUrl,
                    caption: work.caption || project.name,
                    projectId: project.id,
                    projectName: project.name
                });
            });
        });
        return photos;
    }

    // ============================================================
    // RENDERING
    // ============================================================

    function renderFullPortfolio(projects) {
        if (!fullPortfolioContainer) return;
        fullPortfolioContainer.innerHTML = '';

        if (projects.length === 0) {
            fullPortfolioContainer.innerHTML = '<p style="text-align:center; padding:2rem;">No portfolio projects available yet.</p>';
            return;
        }

        projects.forEach(project => {
            const imagesForCategory = (project.works || []).map(work => ({
                src: work.imageUrl,
                category: project.name,
                alt: work.caption || project.name,
                caption: work.caption || project.name,
                projectName: project.name
            }));

            if (imagesForCategory.length === 0) return;

            const section = document.createElement('section');
            section.className = 'portfolio-category-section';
            section.dataset.category = (project.name || '').toLowerCase().replace(/\s+/g, '-');

            const title = document.createElement('h3');
            title.className = 'portfolio-category-title';
            title.textContent = project.name;

            const grid = document.createElement('div');
            grid.className = 'portfolio-grid';

            imagesForCategory.forEach(img => {
                const item = document.createElement('div');
                item.className = 'portfolio-item';
                item.innerHTML = `<img src="${img.src}" alt="${img.alt}" loading="lazy" data-caption="${img.caption}" data-project="${img.projectName}">`;
                grid.appendChild(item);
            });

            section.appendChild(title);
            section.appendChild(grid);
            fullPortfolioContainer.appendChild(section);
        });
    }

    // ============================================================
    // FILTERING
    // ============================================================

    if (filterBar) filterBar.addEventListener('click', (e) => {
        if (e.target.matches('.filter-btn')) {
            const category = e.target.dataset.category;
            filterBar.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');

            document.querySelectorAll('.portfolio-category-section').forEach(section => {
                const sectionCategory = section.dataset.category;
                section.style.display = (category === 'all' || sectionCategory === category) ? 'block' : 'none';
            });
        }
    });

    // ============================================================
    // FULLSCREEN LIGHTBOX
    // ============================================================

    function openLightbox(index, imageList) {
        currentImages = imageList;
        currentIndex = index;
        updateLightboxImage();
        lightbox.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    function closeLightbox() {
        lightbox.style.display = 'none';
        document.body.style.overflow = ''; // Restore background scroll
    }

    function updateLightboxImage() {
        if (!lightboxImg || currentImages.length === 0) return;
        const current = currentImages[currentIndex];
        lightboxImg.src = current.src || current.imageUrl;
        if (lightboxCaption) {
            lightboxCaption.textContent = current.caption || current.alt || '';
        }
        if (lightboxCounter) {
            lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
        }
    }

    function showNextImage() {
        if (currentImages.length === 0) return;
        currentIndex = (currentIndex + 1) % currentImages.length;
        updateLightboxImage();
    }

    function showPrevImage() {
        if (currentImages.length === 0) return;
        currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        updateLightboxImage();
    }

    // Click on portfolio image to open fullscreen
    if (fullPortfolioContainer) fullPortfolioContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            const clickedSrc = e.target.src;
            const visibleImages = [];
            // Get all currently visible images with their metadata
            fullPortfolioContainer.querySelectorAll('.portfolio-item').forEach(item => {
                if (item.offsetParent !== null) { // Check if item is visible
                    const img = item.querySelector('img');
                    visibleImages.push({
                        src: img.src,
                        caption: img.dataset.caption || img.alt || '',
                        alt: img.alt || '',
                        projectName: img.dataset.project || ''
                    });
                }
            });
            const imageIndex = visibleImages.findIndex(img => img.src === clickedSrc);
            if (imageIndex > -1) {
                openLightbox(imageIndex, visibleImages);
            }
        }
    });

    // Lightbox controls
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', showNextImage);
    if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevImage);

    // Close when clicking on the backdrop (outside the image)
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox && lightbox.style.display === 'block') {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            } else if (e.key === 'ArrowLeft') {
                showPrevImage();
            }
        }
    });

    // ============================================================
    // BACK TO TOP BUTTON
    // ============================================================

    window.onscroll = function() {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            backToTopBtn.style.display = 'block';
            setTimeout(() => {
                backToTopBtn.style.opacity = '1';
                backToTopBtn.style.visibility = 'visible';
            }, 10);
        } else {
            backToTopBtn.style.opacity = '0';
            backToTopBtn.style.visibility = 'hidden';
            setTimeout(() => {
                if (window.scrollY < 300) backToTopBtn.style.display = 'none';
            }, 400);
        }
    };

    if (backToTopBtn) backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ============================================================
    // INITIALIZATION
    // ============================================================

    loadProjects().then(projects => {
        renderFullPortfolio(projects);

        // Dynamically add filter buttons for projects from admin panel
        const projectNames = [...new Set(projects.map(project => project.name).filter(Boolean))];
        if (projectNames.length > 0 && filterBar) {
            const existingButtons = Array.from(filterBar.querySelectorAll('.filter-btn'));
            const existingNames = existingButtons.map(btn => btn.dataset.category);
            projectNames.forEach(name => {
                const normalized = name.toLowerCase().replace(/\s+/g, '-');
                if (!existingNames.includes(normalized)) {
                    const button = document.createElement('button');
                    button.className = 'filter-btn';
                    button.dataset.category = normalized;
                    button.textContent = name;
                    filterBar.appendChild(button);
                }
            });
        }
    });
});