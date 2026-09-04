document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // DOM ELEMENT SELECTORS
    // ============================================================
    const trackModal = document.getElementById('trackModal');
    const closeBtn = trackModal ? trackModal.querySelector('.close-btn') : null;
    const searchBtn = document.getElementById('searchBtn');
    const bookingInput = document.getElementById('bookingInput');
    const bookingResult = document.getElementById('bookingResult');
    const detailsContent = document.getElementById('detailsContent');
    const submitReviewBtn = document.getElementById('submitReview');
    const reviewBox = document.getElementById('reviewBox');
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * Get all bookings from localStorage, falling back to mock data if none found.
     */
    async function getBookings() {
        try {
            const response = await fetch(`${API_BASE}/api/bookings`, { credentials: 'include' });
            if (response.ok) {
                const bookings = await response.json();
                localStorage.setItem('papsBookings', JSON.stringify(bookings));
                return bookings;
            }
        } catch (e) {
            console.warn('Could not load bookings from backend:', e);
        }
        try {
            const stored = localStorage.getItem('papsBookings');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error reading bookings from localStorage:', e);
        }

        // Fallback mock data
        return [
            {
                id: 'PAP-ABC123',
                service: 'Premium Session',
                amount: 570,
                addons: [
                    { name: 'Makeup Artist', price: 120 }
                ],
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                location: 'Central Park',
                date: '2024-09-15',
                time: '14:00',
                status: 'Confirmed'
            },
            {
                id: 'PAP-XYZ789',
                service: 'Standard Session',
                amount: 250,
                addons: [],
                name: 'John Smith',
                email: 'john.smith@example.com',
                location: 'Studio A',
                date: '2024-10-01',
                time: '10:00',
                status: 'Pending'
            }
        ];
    }

    /**
     * Close the modal
     */
    function closeModal(modal) {
        if (!modal) return;
        modal.style.display = 'none';
    }

    // ============================================================
    // EVENT HANDLERS
    // ============================================================

    // --- Search Button Click ---
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const code = bookingInput.value.trim().toUpperCase();
            if (!code) {
                alert('Please enter a Booking ID.');
                return;
            }

            // Use public tracking endpoint - only returns non-sensitive data
            let booking = null;
            try {
                const response = await fetch(`${API_BASE}/api/track/${code}`, { credentials: 'include' });
                if (response.ok) {
                    booking = await response.json();
                }
            } catch (e) {
                console.warn('Could not load booking from backend:', e);
            }

            if (booking) {
                let addonsHtml = 'None';
                if (booking.addons && booking.addons.length > 0) {
                    addonsHtml = booking.addons.map(addon => addon.name).join(', ');
                }

                const statusColor = booking.status === 'Confirmed' || booking.status === 'Paid' ? '#4CAF50' : '#C9A76A';

                detailsContent.innerHTML = `
                    <div class="booking-detail-card">
                        <p><strong>Service:</strong> ${booking.service || 'N/A'}</p>
                        <p><strong>Add-ons:</strong> ${addonsHtml}</p>
                        <p><strong>Name:</strong> ${booking.name || 'N/A'}</p>
                        <p><strong>Email:</strong> ${booking.email || 'N/A'}</p>
                        <p><strong>Location:</strong> ${booking.location || 'N/A'}</p>
                        <p><strong>Date:</strong> ${booking.date || 'N/A'}</p>
                        <p><strong>Time:</strong> ${booking.time || 'N/A'}</p>
                        <p><strong>Amount:</strong> GH₵${(booking.amount || 0).toLocaleString()}</p>
                        <p><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${booking.status || 'Pending'}</span></p>
                    </div>
                `;
                bookingResult.style.display = 'block';
                if (submitReviewBtn) submitReviewBtn.style.display = 'block';
                if (reviewBox) reviewBox.style.display = 'block';
            } else {
                detailsContent.innerHTML = '<p style="color:#ff6b6b; text-align:center; padding:20px;">❌ Booking not found. Please check your ID and try again.</p>';
                bookingResult.style.display = 'block';
                if (submitReviewBtn) submitReviewBtn.style.display = 'none';
                if (reviewBox) reviewBox.style.display = 'none';
            }
        });
    }

    // --- Enter key triggers search ---
    if (bookingInput) {
        bookingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchBtn) {
                searchBtn.click();
            }
        });
    }

    // --- Close button ---
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeModal(trackModal);
            if (bookingResult) bookingResult.style.display = 'none';
            if (bookingInput) bookingInput.value = '';
        });
    }

    // --- Click outside modal to close ---
    window.addEventListener('click', (event) => {
        if (event.target === trackModal) {
            closeModal(trackModal);
            if (bookingResult) bookingResult.style.display = 'none';
            if (bookingInput) bookingInput.value = '';
        }
    });

    async function getClientMessages() {
        try {
            const response = await fetch(`${API_BASE}/api/data/messages`, { credentials: 'include' });
            if (response.ok) {
                const messages = await response.json();
                localStorage.setItem('papsClientMessages', JSON.stringify(messages));
                return messages;
            }
        } catch (e) {
            console.warn('Could not load messages from backend:', e);
        }
        try {
            return JSON.parse(localStorage.getItem('papsClientMessages') || '[]');
        } catch (e) {
            console.error('Error reading client messages:', e);
            return [];
        }
    }

    function saveClientMessages(messages) {
        localStorage.setItem('papsClientMessages', JSON.stringify(messages));
        fetch(`${API_BASE}/api/data/messages`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(messages)
        }).catch(e => console.warn('Could not sync review to backend:', e));
    }

    function getSelectedRating() {
        const activeStar = document.querySelector('#trackReviewForm .rating-star.active');
        return activeStar ? Number(activeStar.dataset.rating || 0) : 0;
    }

    // --- Submit Review ---
    if (submitReviewBtn && reviewBox) {
        submitReviewBtn.addEventListener('click', async () => {
            const review = reviewBox.value.trim();
            if (!review) {
                alert('Please write a review before submitting.');
                return;
            }

            try {
                const messages = await getClientMessages();
                messages.push({
                    id: 'rev_' + Date.now(),
                    type: 'review',
                    name: 'Client review',
                    email: '',
                    phone: '',
                    message: review,
                    rating: getSelectedRating(),
                    date: new Date().toISOString().split('T')[0],
                    status: 'Pending'
                });
                saveClientMessages(messages);
                alert('Thank you! Your review has been submitted.');
                reviewBox.value = '';
                document.querySelectorAll('#trackReviewForm .rating-star').forEach(star => star.classList.remove('active'));
            } catch (e) {
                console.error('Error saving review:', e);
                alert('There was an error submitting your review. Please try again.');
            }
        });
    }
});

