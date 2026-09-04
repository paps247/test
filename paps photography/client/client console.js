document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    // ============================================================
    // ALL DOM ELEMENT SELECTORS
    // ============================================================

    // --- Main Page ---
    const primaryNav = document.getElementById('primary-navigation');
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const contactCategories = document.querySelectorAll('.contact-category');
    const brandNameEl = document.getElementById('brand-name-h1');
    const brandLogoEl = document.getElementById('brand-logo-img');
    const aboutMeEl = document.getElementById('about-me-p');
    const aboutImageEl = document.querySelector('.about-image-wrapper img');
    const footerLinksEl = document.getElementById('footer-links');

    // --- Track Status Modal ---
    const trackModal = document.getElementById('trackModal');
    const trackCloseBtn = trackModal ? trackModal.querySelector('.close-btn') : null; 
    const triggerButtons = document.querySelectorAll('#track-status-btn');
    const searchBtn = document.getElementById('searchBtn');
    const bookingInput = document.getElementById('bookingInput');
    const bookingResult = document.getElementById('bookingResult');
    const detailsContent = document.getElementById('detailsContent');
    const reviewSection = document.getElementById('reviewSection');
    const trackReviewForm = document.getElementById('trackReviewForm');

    // --- Review Stars ---
    const ratingStars = document.querySelectorAll('.rating-star');
    // --- Booking Modal ---
    const bookingModal = document.getElementById('bookingModal');
    const bookNowBtn = document.querySelector('.fixed-action-btn');
    const bookingClose = bookingModal ? bookingModal.querySelector('.booking-close') : null;
    
    const step1 = document.getElementById('bookingStep1');
    const step2 = document.getElementById('bookingStep2');
    const step3 = document.getElementById('bookingStep3');
    const step4 = document.getElementById('bookingStep4');
    
    // Step 2 elements
    const selectedServiceDisplay = document.getElementById('selectedServiceDisplay');
    const agreeTerms = document.getElementById('agreeTerms');
    const acceptTermsBtn = document.getElementById('acceptTermsBtn');

    // Step 3 elements
    const bookingServiceDisplay = document.getElementById('bookingServiceDisplay');
    const bookingForm = document.getElementById('bookingForm');
    const formName = document.getElementById('formName');
    const formEmail = document.getElementById('formEmail');
    const formPhone = document.getElementById('formPhone');
    const formLocation = document.getElementById('formLocation');
    const formDate = document.getElementById('formDate');
    const formTime = document.getElementById('formTime');

    // --- Time Slot Availability ---
    // Normalize time strings to 24-hour "HH:MM" format for comparison
    function normalizeTime(timeStr) {
        if (!timeStr) return '';
        // Already in 24-hour format (e.g., "14:00")
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
            const parts = timeStr.split(':');
            return `${String(Number(parts[0])).padStart(2, '0')}:${parts[1]}`;
        }
        // 12-hour format (e.g., "2:00 PM", "8:00 AM")
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        }
        return '';
    }

    // Get the 24-hour time value for a form option
    function getOptionTimeValue(option) {
        return option.value || normalizeTime(option.text);
    }

    // Disable time slots that are already booked (confirmed/paid) for the selected date
    async function updateTimeSlotAvailability() {
        if (!formDate || !formTime) return;

        const selectedDate = formDate.value;
        if (!selectedDate) {
            // Reset all options when no date is selected
            Array.from(formTime.options).forEach(option => {
                option.disabled = false;
                option.style.color = '';
            });
            return;
        }

        const bookings = await getBookings();
        const bookedTimes = new Set();

        bookings.forEach(booking => {
            if (booking.date === selectedDate && (booking.status === 'Confirmed' || booking.status === 'Paid')) {
                const normalized = normalizeTime(booking.time);
                if (normalized) {
                    bookedTimes.add(normalized);
                }
            }
        });

        // Disable time slots that are already booked
        Array.from(formTime.options).forEach(option => {
            if (option.value === '') return; // Skip the placeholder option
            const optionTime = getOptionTimeValue(option);
            if (bookedTimes.has(optionTime)) {
                option.disabled = true;
                option.style.color = '#ff6b6b';
            } else {
                option.disabled = false;
                option.style.color = '';
            }
        });
    }

    if (formDate) {
        formDate.addEventListener('change', updateTimeSlotAvailability);
    }

    // Step 4 elements
    const confirmService = document.getElementById('confirmService');
    const confirmAmount = document.getElementById('confirmAmount');
    const confirmName = document.getElementById('confirmName');
    const confirmEmail = document.getElementById('confirmEmail');
    const confirmLocation = document.getElementById('confirmLocation');
    const confirmDate = document.getElementById('confirmDate');
    const confirmAddons = document.getElementById('confirmAddons');
    const confirmTime = document.getElementById('confirmTime');
    const bookingIdDisplay = document.getElementById('bookingIdDisplay');
    const copyBtn = document.getElementById('copyBookingId');
    const closeBookingConfirm = document.getElementById('closeBookingConfirm');

    // State
    let selectedService = '';
    let selectedPrice = 0;
    let selectedAddons = [];

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================
    async function getBookings() {
        try {
            const response = await fetch(`${API_BASE}/api/bookings`, { credentials: 'include' });
            if (response.ok) {
                const bookings = await response.json();
                localStorage.setItem('papsBookings', JSON.stringify(bookings));
                return bookings;
            }
        } catch (e) {
            console.error('Error fetching bookings from backend:', e);
        }

        try {
            const stored = localStorage.getItem('papsBookings');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error reading bookings from localStorage:', e);
        }
        return [];
    }

    async function getClientMessages() {
        try {
            const response = await fetch(`${API_BASE}/api/data/messages`, { credentials: 'include' });
            if (response.ok) {
                const messages = await response.json();
                localStorage.setItem('papsClientMessages', JSON.stringify(messages));
                return messages;
            }
        } catch (e) {
            console.warn('Could not load client messages from backend:', e);
        }
        try {
            const stored = localStorage.getItem('papsClientMessages');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error reading client messages from localStorage:', e);
        }

        try {
            const legacyReviews = JSON.parse(localStorage.getItem('papsReviews') || '[]');
            if (legacyReviews.length > 0) {
                return legacyReviews.map(item => ({
                    id: item.id || `legacy-${Date.now()}-${Math.random()}`,
                    type: item.type || 'review',
                    name: item.name || 'Client',
                    email: item.email || '',
                    phone: item.phone || '',
                    message: item.feedback || item.message || '',
                    rating: item.rating || 0,
                    status: item.status || 'New',
                    date: item.date || new Date().toISOString().split('T')[0]
                }));
            }
        } catch (e) {
            console.error('Error reading legacy reviews data:', e);
        }

        return [];
    }

    function saveClientMessages(messages) {
        try {
            localStorage.setItem('papsClientMessages', JSON.stringify(messages));
        } catch (e) {
            console.error('Error saving client messages to localStorage:', e);
        }
        fetch(`${API_BASE}/api/data/messages`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(messages)
        }).catch(e => console.warn('Error syncing client messages:', e));
    }
    
    async function getSiteSettings() {
        try {
            const response = await fetch(`${API_BASE}/api/settings`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data && (data.rateCard || data.business)) {
                localStorage.setItem('papsPhotographySettings', JSON.stringify(data));
                if (data.business?.brandName) {
                    localStorage.setItem('settings_brandName', data.business.brandName);
                }
                if (data.business?.brandLogo) {
                    localStorage.setItem('settings_brandLogo', data.business.brandLogo);
                }
                return data;
            }
        } catch (e) {
            console.warn('Error fetching site settings from backend:', e);
        }

        try {
            const storedSettings = localStorage.getItem('papsPhotographySettings');
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                if (parsed && (parsed.rateCard || parsed.business)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error reading local admin settings:', e);
        }

        try {
            const response = await fetch(`${API_BASE}/api/settings`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (e) {
            console.error('Error fetching site settings:', e);
            return {}; // Return empty object on error
        }
    }

function openModal(modal) {
        if (!modal) return;
        if (modal.id === 'bookingModal') resetBooking();
        modal.style.display = 'flex';
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.style.display = 'none';
    }

    function openBookingModal() {
        resetBooking();
        openModal(bookingModal);
        showStep(1);
    }
    
    function showStep(step) {
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'none';
        if (step4) step4.style.display = 'none';

        const target = document.getElementById('bookingStep' + step);
        if (target) {
            target.style.display = 'block';
            target.style.animation = 'none';
            target.offsetHeight;
            target.style.animation = '';
            
            if (step === 4) {
                if (confirmAddons) {
                    if (selectedAddons.length > 0) {
                        confirmAddons.textContent = selectedAddons.map(addon => addon.name).join(', ');
                    } else {
                        confirmAddons.textContent = 'None';
                    }
                }
            }
        }
    }
    
    function resetBooking() {
        selectedService = '';
        selectedPrice = 0;
        document.querySelectorAll('.service-item').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.rate-category').forEach(c => c.classList.remove('open'));
        if (agreeTerms) {
            agreeTerms.checked = false;
            acceptTermsBtn.disabled = true;
        }
        if (bookingForm) bookingForm.reset();
        if (selectedServiceDisplay) selectedServiceDisplay.textContent = '';
        if (bookingServiceDisplay) bookingServiceDisplay.textContent = '';
        if (confirmAddons) confirmAddons.textContent = '';
        if (confirmAmount) confirmAmount.textContent = '';
        if (bookingIdDisplay) bookingIdDisplay.textContent = 'Loading...';
        if (bookingResult) bookingResult.style.display = 'none';
        if (copyBtn) {
            copyBtn.textContent = '📋';
            copyBtn.classList.remove('copied');
        }
    }

    // ============================================================
    // CORE FUNCTIONALITY
    // ============================================================

    async function loadSettings() {
        const settings = await getSiteSettings();

        if (settings.business) {
            if (settings.business.brandName && brandNameEl) {
                brandNameEl.textContent = settings.business.brandName;
            }
            if (settings.business.brandLogo && brandLogoEl) {
                brandLogoEl.src = settings.business.brandLogo;
            }
            if (settings.business.aboutUs && aboutMeEl) {
                aboutMeEl.textContent = settings.business.aboutUs;
            }
        }

        if (settings.personal) {
            const profilePic = settings.personal.profilePic || settings.personal.profilePicture;
            if (profilePic && aboutImageEl) {
                aboutImageEl.src = profilePic;
            }

            if (settings.personal.socials && footerLinksEl) {
                const socials = settings.personal.socials;
                footerLinksEl.innerHTML = '';
                if (socials.instagram) footerLinksEl.innerHTML += `<a href="${socials.instagram}" target="_blank">Instagram</a>`;
                if (socials.twitter) footerLinksEl.innerHTML += `<a href="${socials.twitter}" target="_blank">Twitter</a>`;
                if (socials.facebook) footerLinksEl.innerHTML += `<a href="${socials.facebook}" target="_blank">Facebook</a>`;
            }
        }
        
        renderHeroSlides(settings); // Render hero slides with dynamic data
        renderRateCardsIntoBooking(settings); // Render rate cards for booking with dynamic data
    }

    function renderHeroSlides(settings) {
        const heroSliderContainer = document.getElementById('hero-slider-container');
        if (!heroSliderContainer) return;

        heroSliderContainer.innerHTML = ''; // Clear existing slides

        if (settings.rateCard && settings.rateCard.length > 0) {
            settings.rateCard.forEach(category => {
                const hasCoverPhoto = category.coverPhoto && category.coverPhoto.trim();
                const hasCategoryName = category.name && category.name.trim();

                if (!hasCoverPhoto || !hasCategoryName) {
                    return;
                }

                const slide = document.createElement('div');
                slide.classList.add('hero-slide');
                const categoryDescription = category.description && category.description.trim()
                    ? category.description
                    : 'Explore our service options.';

                slide.innerHTML = /*html*/`
                    <img src="${category.coverPhoto}" alt="${category.name}">
                    <div class="overlay">
                        <div class="overlay-content">
                            <h2>${category.name}</h2>
                            <p>${categoryDescription}</p>
                        </div>
                    </div>
                `;
                heroSliderContainer.appendChild(slide);
            });
        }
        
        // Re-initialize hero slider functionality after dynamic content is loaded
        const heroSlides = document.querySelectorAll('.hero-slide');
        if (heroSlides.length > 0) {
            let currentSlide = 0;

            function showNextSlide() {
                heroSlides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % heroSlides.length;
                heroSlides[currentSlide].classList.add('active');
            }

            // Set the first slide as active
            heroSlides[0].classList.add('active');
            // Start the auto-slide only if there are multiple slides
            if (heroSlides.length > 1) {
                setInterval(showNextSlide, 5000);
            }
        }
    }


    if (navToggle && primaryNav) {
        navToggle.addEventListener('click', () => {
            const isVisible = primaryNav.getAttribute('data-visible') === 'true';
            primaryNav.setAttribute('data-visible', isVisible ? 'false' : 'true');
            navToggle.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
        });
    }

    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    if (revealElements.length > 0) {
        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    }

    async function getPortfolioProjects() {
        try {
            const response = await fetch(`${API_BASE}/api/portfolio`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('Could not load portfolio from backend:', e);
        }

        return [];
    }

    async function getAllPhotos() {
        try {
            const response = await fetch(`${API_BASE}/api/photos`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('Could not load photos from backend:', e);
        }

        // Fallback: derive photos from portfolio projects
        const projects = await getPortfolioProjects();
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

    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (portfolioGrid) {
        getAllPhotos().then(photos => {
            // Display exactly 5 photos from all available photos
            const imagesToDisplay = photos.slice(0, 5);
            if (imagesToDisplay.length === 0) {
                portfolioGrid.innerHTML = '<p>Portfolio updates will appear here.</p>';
                return;
            }

            portfolioGrid.innerHTML = imagesToDisplay.map(img => {
                return `
                    <div class="portfolio-item">
                        <img src="${img.imageUrl}" alt="${img.caption}" class="portfolio-img" loading="lazy">
                    </div>
                `;
            }).join('');
        });
    }

    if (contactCategories) {
        contactCategories.forEach(category => {
            const header = category.querySelector('.contact-category-header');
            if (header) {
                header.addEventListener('click', () => {
                    const wasOpen = category.classList.contains('open');
                    contactCategories.forEach(c => c.classList.remove('open'));
                    if (!wasOpen) {
                        category.classList.add('open');
                    }
                });
            }
        });
    }

    function getSelectedRatingFromForm(form) {
        if (!form) return 0;
        const activeStar = form.querySelector('.rating-star.active');
        return activeStar ? Number(activeStar.dataset.rating || 0) : 0;
    }

    const bookingInquiryForm = document.getElementById('contactFormBooking');
    if (bookingInquiryForm) {
        bookingInquiryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = bookingInquiryForm.querySelector('input[placeholder="Full Name"]').value.trim();
            const email = bookingInquiryForm.querySelector('input[placeholder="Email Address"]').value.trim();
            const phone = bookingInquiryForm.querySelector('input[placeholder="Phone Number"]').value.trim();
            const message = bookingInquiryForm.querySelector('textarea').value.trim();

            if (!name || !email || !message) {
                alert('Please complete the inquiry form before sending.');
                return;
            }

            const messages = await getClientMessages();
            messages.push({
                id: `msg_${Date.now()}`,
                type: 'inquiry',
                name,
                email,
                phone,
                message,
                rating: 0,
                status: 'New',
                date: new Date().toISOString().split('T')[0]
            });
            saveClientMessages(messages);
            bookingInquiryForm.reset();
            alert('Your booking inquiry has been sent.');
        });
    }

    const supportForm = document.getElementById('contactFormSupport');
    if (supportForm) {
        supportForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = supportForm.querySelector('input[placeholder="Full Name"]').value.trim();
            const email = supportForm.querySelector('input[placeholder="Email Address"]').value.trim();
            const bookingId = supportForm.querySelector('input[placeholder="Booking ID (if applicable)"]').value.trim();
            const message = supportForm.querySelector('textarea').value.trim();

            if (!name || !email || !message) {
                alert('Please complete the support form before sending.');
                return;
            }

            const messages = await getClientMessages();
            messages.push({
                id: `msg_${Date.now()}`,
                type: 'support',
                name,
                email,
                phone: bookingId,
                message,
                rating: 0,
                status: 'New',
                date: new Date().toISOString().split('T')[0]
            });
            saveClientMessages(messages);
            supportForm.reset();
            alert('Your support message has been sent.');
        });
    }

    const feedbackForm = document.getElementById('contactFormFeedback');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = feedbackForm.querySelector('input[placeholder="Full Name"]').value.trim();
            const email = feedbackForm.querySelector('input[placeholder="Email Address"]').value.trim();
            const message = feedbackForm.querySelector('textarea').value.trim();
            const rating = getSelectedRatingFromForm(feedbackForm);

            if (!name || !email || !message) {
                alert('Please complete the feedback form before sending.');
                return;
            }

            const messages = await getClientMessages();
            messages.push({
                id: `msg_${Date.now()}`,
                type: 'review',
                name,
                email,
                phone: '',
                message,
                rating,
                status: 'New',
                date: new Date().toISOString().split('T')[0]
            });
            saveClientMessages(messages);
            feedbackForm.reset();
            feedbackForm.querySelectorAll('.rating-star').forEach(star => star.classList.remove('active'));
            alert('Thank you for your feedback.');
        });
    }

    if (trackModal) {
        triggerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                trackModal.style.display = 'block';
            });
        });

        if (trackCloseBtn) {
            trackCloseBtn.addEventListener('click', () => closeModal(trackModal));
        }

        window.addEventListener('click', (event) => {
            if (event.target === trackModal) {
                closeModal(trackModal);
                if (bookingResult) bookingResult.style.display = 'none';
                if (reviewSection) reviewSection.style.display = 'none';
                if (bookingInput) bookingInput.value = '';
            }
        });
    }

    if (ratingStars.length > 0) {
        const ratingContainer = ratingStars[0].parentElement;
        const ratingValueInput = document.getElementById('ratingValue');

        ratingContainer.setAttribute('role', 'radiogroup');
        ratingContainer.setAttribute('aria-label', 'Feedback Rating');

        const setRating = (value) => {
            if (ratingValueInput) {
                ratingValueInput.value = value;
            }
            ratingStars.forEach((star, index) => {
                const starValue = index + 1;
                if (starValue <= value) {
                    star.classList.add('active');
                    star.setAttribute('aria-checked', 'true');
                } else {
                    star.classList.remove('active');
                    star.setAttribute('aria-checked', 'false');
                }
            });
        };

        ratingStars.forEach((star, index) => {
            const value = index + 1;
            star.setAttribute('role', 'radio');
            star.setAttribute('aria-checked', 'false');
            star.setAttribute('aria-label', `${value} out of 5 stars`);
            star.setAttribute('tabindex', '0');

            star.addEventListener('click', () => {
                setRating(value);
            });

            star.addEventListener('keydown', (e) => {
                let newIndex = index;
                if (e.key === 'ArrowRight') {
                    newIndex = Math.min(index + 1, ratingStars.length - 1);
                } else if (e.key === 'ArrowLeft') {
                    newIndex = Math.max(index - 1, 0);
                }

                if (newIndex !== index) {
                    ratingStars[newIndex].focus();
                }

                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setRating(value);
                }
            });
        });

        const initialValue = ratingValueInput ? parseInt(ratingValueInput.value, 10) : 0;
        if (initialValue > 0) {
            setRating(initialValue);
        }
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const code = bookingInput.value.trim().toUpperCase();
            if (!code) {
                alert('Please enter a Booking ID.');
                return;
            }
            const allBookings = await getBookings();
            const booking = allBookings.find(b => b.id && b.id.toUpperCase() === code);
            if (booking) {
                let addonsHtml = 'None';
                if (booking.addons && booking.addons.length > 0) {
                    addonsHtml = booking.addons.map(addon => addon.name).join(', ');
                }

                const statusColor = booking.status === 'Confirmed' || booking.status === 'Paid' ? '#4CAF50' : '#C9A76A';

                detailsContent.innerHTML = `
                    <p><strong>Service:</strong> ${booking.service || 'N/A'}</p>
                    <p><strong>Add-ons:</strong> ${addonsHtml}</p>
                    <p><strong>Name:</strong> ${booking.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${booking.email || 'N/A'}</p>
                    <p><strong>Location:</strong> ${booking.location || 'N/A'}</p>
                    <p><strong>Date:</strong> ${booking.date || 'N/A'}</p>
                    <p><strong>Amount:</strong> GH₵${booking.amount || 'N/A'}</p>
                    <p><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${booking.status || 'Pending'}</span></p>
                `;
                bookingResult.style.display = 'block';
                reviewSection.style.display = 'block';
            } else {
                detailsContent.innerHTML = '<p style="color:#ff6b6b;">Booking not found. Please check your ID and try again.</p>';
                bookingResult.style.display = 'block';
                reviewSection.style.display = 'none';
            }
        });
    }
    if (bookingInput) {
        bookingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchBtn) searchBtn.click();
        });
    }
    
    async function showBookingModal() {
        const settings = await getSiteSettings();
        renderRateCardsIntoBooking(settings);
        openBookingModal();
    }

    if (bookingModal) {
        if (bookNowBtn) {
            bookNowBtn.addEventListener('click', showBookingModal);
        }
        if (bookingClose) {
            bookingClose.addEventListener('click', () => closeModal(bookingModal));
        }
        window.addEventListener('click', (event) => {
            if (event.target === bookingModal) {
                closeModal(bookingModal);
            }
        });
    }
    
    function attachBookingStep1Handlers() {
        const serviceItems = document.querySelectorAll('#rate-card-container .service-item');
        serviceItems.forEach(item => {
            const addons = item.querySelectorAll('.addon-checkbox');
            const totalPriceEl = item.querySelector('.total-price');
            const selectBtn = item.querySelector('.select-service-btn');
            const basePrice = parseInt(item.dataset.price, 10);
            addons.forEach(addon => {
                addon.addEventListener('change', () => {
                    let currentTotal = basePrice;
                    addons.forEach(cb => {
                        if (cb.checked) {
                            currentTotal += parseInt(cb.dataset.price, 10);
                        }
                    });
                    if (totalPriceEl) {
                        totalPriceEl.textContent = 'GH₵' + currentTotal.toLocaleString();
                    }
                });
            });

            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    let finalPrice = basePrice;
                    selectedAddons = [];
                    
                    addons.forEach(cb => {
                        if (cb.checked) {
                            const price = parseInt(cb.dataset.price, 10);
                            finalPrice += price;
                            selectedAddons.push({
                                name: cb.dataset.name,
                                price: price
                            });
                        }
                    });

                    selectedService = item.dataset.service;
                    selectedPrice = finalPrice;
                    
                    let addonsText = selectedAddons.length > 0 
                        ? ` (+ ${selectedAddons.map(a => a.name).join(', ')})`
                        : '';
                    
                    const fullDisplayText = `${selectedService}${addonsText} — GH₵${selectedPrice.toLocaleString()}`;

                    if (selectedServiceDisplay) selectedServiceDisplay.innerHTML = 'Selected: ' + fullDisplayText;
                    if (bookingServiceDisplay) bookingServiceDisplay.innerHTML = 'Service: ' + fullDisplayText;
                    
                    showStep(2);
                });
            }
        });
    }


    function renderRateCardsIntoBooking(settings) {
        const container = document.getElementById('rate-card-container');
        if (!container) return;

        const rateCardData = settings.rateCard || [];

        if (rateCardData.length === 0) {
            container.innerHTML = '<p>No services currently available. Please configure the rate card in the admin panel.</p>';
            return;
        }

        container.innerHTML = rateCardData.map(category => {
            return /*html*/`
                <div class="rate-category">
                    <div class="rate-category-header">
                        <span>${category.name}</span>
                        <span class="category-toggle-icon"></span>
                    </div>
                    <div class="rate-card-list">
                        ${(category.services || []).map(service => {
                            const { id, name, price, description, includes, details, addOns } = service;
                            const detailItems = Array.isArray(details) && details.length > 0
                                ? details
                                : (Array.isArray(includes) ? includes : []);
                            const availableAddOns = Array.isArray(addOns) && addOns.length > 0
                                ? addOns
                                : (Array.isArray(category.addOns) ? category.addOns : []);

                            return /*html*/`
                                <div class="service-item" data-service-id="${id}" data-service="${name}" data-price="${price}">
                                    <div class="service-item-header">
                                        <h4>${name}</h4>
                                        <div class="price-and-toggle">
                                            <span class="service-price">GH₵${price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div class="service-item-details">
                                        ${description ? `<p class="service-description">${description}</p>` : ''}
                                        ${detailItems.length > 0 ? /*html*/`
                                        <div class="service-includes">
                                            <h5>What's Included:</h5>
                                            <ul>${detailItems.map(item => `<li><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span>${item}</span></li>`).join('')}</ul>
                                        </div>` : ''}
                                        ${availableAddOns.length > 0 ? /*html*/`
                                        <div class="add-ons-container">
                                            <h5>Available Add-ons:</h5>
                                            ${availableAddOns.map(addon => `
                                                <label class="addon-label">
                                                    <input type="checkbox" class="addon-checkbox" data-price="${addon.price}" data-name="${addon.name}">
                                                    <div class="addon-info">
                                                        <span class="addon-name">${addon.name}</span>
                                                        <span class="addon-price">+ GH₵${addon.price.toLocaleString()}</span>
                                                    </div>
                                                </label>
                                            `).join('')}
                                        </div>` : ''}
                                        <div class="total-price-container">
                                            <strong>Total: <span class="total-price">GH₵${price.toLocaleString()}</span></strong>
                                        </div>
                                        <button class="btn-primary select-service-btn">Select & Continue</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('#rate-card-container .rate-category-header').forEach(header => {
            header.addEventListener('click', () => {
                const category = header.parentElement;
                const wasOpen = category.classList.contains('open');
                
                const allCategories = document.querySelectorAll('#rate-card-container .rate-category');
                allCategories.forEach(c => c.classList.remove('open'));

                if (!wasOpen) {
                    category.classList.add('open');
                }
            });
        });

        attachBookingStep1Handlers();
    }
    
    if (agreeTerms) {
        agreeTerms.addEventListener('change', () => {
            acceptTermsBtn.disabled = !agreeTerms.checked;
        });
    }

    if (acceptTermsBtn) {
        acceptTermsBtn.addEventListener('click', () => showStep(3));
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookingId = 'BRAND-' + Date.now().toString(36).toUpperCase();

            const newBooking = {
                id: bookingId,
                service: selectedService,
                amount: selectedPrice,
                addons: selectedAddons,
                name: formName.value,
                email: formEmail.value,
                phone: formPhone.value,
                location: formLocation.value,
                date: formDate.value,
                time: formTime.options[formTime.selectedIndex].text,
                status: 'Pending'
            };

            try {
                const response = await fetch(`${API_BASE}/api/bookings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify(newBooking)
                });

                if (!response.ok) {
                    throw new Error('Backend booking save failed');
                }

                const savedBooking = await response.json();
                const existingBookings = JSON.parse(localStorage.getItem('papsBookings') || '[]');
                existingBookings.push(savedBooking);
                localStorage.setItem('papsBookings', JSON.stringify(existingBookings));
            } catch (err) {
                console.error('Error saving booking to backend/localStorage:', err);
                alert('There was an issue saving your booking. Please try again.');
                return;
            }

            if (confirmService) confirmService.textContent = selectedService;
            if (confirmAmount) confirmAmount.textContent = 'GH₵' + selectedPrice.toLocaleString();
            if (confirmName) confirmName.textContent = formName.value;
            if (confirmEmail) confirmEmail.textContent = formEmail.value;
            if (confirmLocation) confirmLocation.textContent = formLocation.value;
            if (confirmDate) confirmDate.textContent = formDate.value;
            if (confirmTime) confirmTime.textContent = formTime.options[formTime.selectedIndex].text;
            if (bookingIdDisplay) bookingIdDisplay.textContent = bookingId;
            showStep(4);
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const idText = bookingIdDisplay.textContent;
            navigator.clipboard.writeText(idText).then(() => {
                copyBtn.textContent = '✅';
                setTimeout(() => { copyBtn.textContent = '📋'; }, 2000);
            });
        });
    }

    if (closeBookingConfirm) {
        closeBookingConfirm.addEventListener('click', () => closeModal(bookingModal));
    }

    // --- Initial Page Load ---
    loadSettings().catch(console.error);
});

