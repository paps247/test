document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    async function syncCollection(resource, data) {
        try {
            const response = await fetch(`${API_BASE}/api/data/${resource}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            console.warn(`Could not sync ${resource} to backend:`, error);
        }
    }

    async function hydrateCollection(resource, storageKey) {
        try {
            const response = await fetch(`${API_BASE}/api/data/${resource}`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(storageKey, JSON.stringify(data));
            }
        } catch (error) {
            console.warn(`Could not load ${resource} from backend:`, error);
        }
    }

    async function hydrateAdminData() {
        await Promise.all([
            hydrateCollection('bookings', 'papsBookings'),
            hydrateCollection('messages', 'papsClientMessages'),
            hydrateCollection('invoices', 'papsInvoices'),
            hydrateCollection('finance', 'papsFinanceEntries'),
            hydrateCollection('calendar', 'papsCalendarEvents')
        ]);
        try {
            const response = await fetch(`${API_BASE}/api/settings`, { credentials: 'include' });
            if (response.ok) {
                localStorage.setItem('papsPhotographySettings', JSON.stringify(await response.json()));
            }
        } catch (error) {
            console.warn('Could not load settings from backend:', error);
        }
    }

    // --- Security Check (Server-Side) ---
    // Verify authentication status with the server, not localStorage
    const authResponse = await fetch(`${API_BASE}/api/auth/status`, { credentials: 'include' });
    const authData = await authResponse.json();
    if (!authData.logged_in) {
        window.location.href = 'login.html';
        return;
    }

    const menuToggle = document.getElementById('menu-toggle');
    const mobileOverlay = document.querySelector('.mobile-overlay');
    const body = document.body;
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const pages = document.querySelectorAll('.admin-page');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                // On mobile, toggle a class for slide-in/out
                body.classList.toggle('sidebar-open');
            } else {
                // On desktop, toggle the collapsed state
                body.classList.toggle('sidebar-collapsed');
            }
        });
    }

    function closeSidebarIfNeeded() {
        if (window.innerWidth <= 768) {
            body.classList.remove('sidebar-open');
        }
    }

    // Close mobile menu when overlay is clicked
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            closeSidebarIfNeeded();
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear server session
            fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
                .catch(err => console.warn('Backend logout failed:', err));
            window.location.href = 'login.html';
        });
    }

    // --- Page Navigation ---
    navLinks.forEach(link => {
        // Skip the logout button
        if (link.id === 'logout-btn') return;

        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;

            // Update active link
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // Show the target page
            pages.forEach(page => {
                if (page.id === `${targetId}-page`) {
                    page.style.display = 'block';
                } else {
                    page.style.display = 'none';
                }
            });

            // Load content for the target page
            loadPageContent(targetId);

            // Close the mobile sidebar after selecting a feature
            closeSidebarIfNeeded();
        });
    });

    function loadPageContent(pageId) {
        if (pageId === 'overview') {
            loadOverview();
        }
        if (pageId === 'bookings') {
            loadBookings();
        }
        if (pageId === 'calendar') {
            loadCalendar();
        }
        if (pageId === 'invoices') {
            loadInvoices();
        }
        if (pageId === 'finance') {
            loadFinance();
        }
        if (pageId === 'reviews') {
            loadReviews();
        }
        if (pageId === 'issues') {
            loadIssues();
        }
        if (pageId === 'rate-card') {
            loadRateCard();
        }
        if (pageId === 'portfolio') {
            showProjectsView();
        }
        if (pageId === 'clients') {
            loadClients();
        }
        if (pageId === 'settings') {
            loadSettings();
        }
    }

    // --- Bookings Page Functionality ---
    function loadBookings() {
        const bookingsTableBody = document.querySelector('#bookings-table tbody');
        if (!bookingsTableBody) return;

        bookingsTableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        const bookings = getBookingsData();
        
        if (bookings.length === 0) {
            bookingsTableBody.innerHTML = '<tr><td colspan="7">No bookings found.</td></tr>';
            return;
        }

        bookingsTableBody.innerHTML = bookings.map(booking => {
            const statusClass = (booking.status || 'Pending').toLowerCase();
            const menuItems = [];

            if (booking.status === 'Pending') {
                menuItems.push(`<a href="#" class="dropdown-item accept-booking-btn" data-id="${booking.id}">Accept</a>`);
                menuItems.push(`<a href="#" class="dropdown-item discount-booking-btn" data-id="${booking.id}">Allow Discount</a>`);
            }

            if (booking.status !== 'Declined') {
                menuItems.push(`<a href="#" class="dropdown-item decline-booking-btn" data-id="${booking.id}">Decline</a>`);
            }

            if (booking.status === 'Paid') {
                menuItems.push(`<a href="#" class="dropdown-item view-receipt-btn" data-id="${booking.id}">View Receipt</a>`);
            }

            menuItems.push(`<a href="#" class="dropdown-item delete-booking-btn" data-id="${booking.id}">Delete</a>`);

            return `
                <tr>
                    <td>${booking.id || 'N/A'}</td>
                    <td>${booking.name || 'N/A'}</td>
                    <td>${booking.service || 'N/A'}</td>
                    <td>${booking.date || 'N/A'}</td>
                    <td>${booking.time || 'N/A'}</td>
                    <td>
                        GH₵${booking.amount ? Number(booking.amount).toLocaleString() : 'N/A'}
                        ${Number(booking.discountPercent || 0) > 0 ? `<small class="booking-discount-label">${booking.discountPercent}% discount from GH₵${Number(booking.originalAmount || booking.amount).toLocaleString()}</small>` : ''}
                    </td>
                    <td><span class="status-${statusClass}">${booking.status || 'Pending'}</span></td>
                    <td class="actions-cell">
                        <div class="actions-dropdown">
                            <button class="options-booking-btn" data-id="${booking.id}">Options</button>
                            <div class="dropdown-menu" id="dropdown-${booking.id}">
                                ${menuItems.join('')}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachBookingActionListeners();
    }

    function saveBookingsData(bookings) {
        bookingsData = bookings;
        // Persist changes to localStorage so client-side tracking reflects updates
        try {
            localStorage.setItem('papsBookings', JSON.stringify(bookings));
        } catch (e) {
            console.error('Error saving bookings to localStorage:', e);
        }
        void syncCollection('bookings', bookings);
        loadBookings(); // Refresh the view
    }

    function ensureFinanceEntryForBooking(booking) {
        const financeEntries = getFinanceData();
        const existingIndex = financeEntries.findIndex(entry => entry.bookingId === booking.id);

        const entryData = {
            id: `FIN-${booking.id}`,
            bookingId: booking.id,
            clientName: booking.name || 'Client',
            email: booking.email || '',
            service: booking.service || 'Service',
            amountDue: Number(booking.amount) || 0,
            amountPaid: 0,
            balance: Number(booking.amount) || 0,
            status: 'Awaiting Payment',
            paymentDate: '',
            paymentMethod: '',
            notes: '',
            date: booking.date || new Date().toISOString().split('T')[0]
        };

        if (existingIndex === -1) {
            financeEntries.push(entryData);
            saveFinanceData(financeEntries);
            return;
        }

        const existing = financeEntries[existingIndex];
        existing.clientName = booking.name || existing.clientName;
        existing.service = booking.service || existing.service;
        existing.amountDue = Number(booking.amount) || existing.amountDue;
        existing.balance = Math.max(existing.amountDue - existing.amountPaid, 0);
        existing.status = existing.amountPaid >= existing.amountDue ? 'Paid' : 'Awaiting Payment';
        saveFinanceData(financeEntries);
    }

    async function updateBookingStatus(bookingId, newStatus) {
        let bookings = getBookingsData();
        const bookingIndex = bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) return;

        try {
            const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const updatedBooking = await response.json();
                bookings[bookingIndex].status = updatedBooking.status;
            }
        } catch (e) {
            console.warn('Backend booking status update failed; using local state fallback.', e);
            bookings[bookingIndex].status = newStatus;
        }

        if (newStatus === 'Confirmed') {
            ensureFinanceEntryForBooking(bookings[bookingIndex]);
        }

        if (newStatus === 'Paid') {
            const booking = bookings[bookingIndex];
            const invoice = {
                id: `INV-${booking.id}`,
                bookingId: booking.id,
                clientName: booking.name,
                date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
                items: [{ description: booking.service, amount: booking.amount }],
                total: booking.amount,
                status: 'Paid'
            };
            let invoices = getInvoicesData();
            if (!invoices.some(inv => inv.id === invoice.id)) {
                invoices.push(invoice);
                saveInvoicesData(invoices);
            }
        }

        if (newStatus === 'Declined') {
            const financeEntries = getFinanceData();
            const entryIndex = financeEntries.findIndex(entry => entry.bookingId === bookingId);
            if (entryIndex > -1) {
                financeEntries[entryIndex].status = 'Cancelled';
                financeEntries[entryIndex].notes = 'Booking declined';
                financeEntries[entryIndex].balance = 0;
                saveFinanceData(financeEntries);
            }
        }

        saveBookingsData(bookings);
        loadBookings(); // Re-render the bookings table
    }

    function attachBookingActionListeners() {
        document.querySelectorAll('.accept-booking-btn').forEach(btn => btn.onclick = (e) => {
            e.preventDefault();
            updateBookingStatus(btn.dataset.id, 'Confirmed');
        });

        document.querySelectorAll('.mark-paid-btn').forEach(btn => btn.onclick = (e) => {
            e.preventDefault();
            updateBookingStatus(btn.dataset.id, 'Paid');
        });

        document.querySelectorAll('.view-receipt-btn').forEach(btn => btn.onclick = (e) => {
            e.preventDefault();
            const invoiceId = `INV-${btn.dataset.id}`;
            openInvoiceViewModal(invoiceId);
        });

        document.querySelectorAll('.decline-booking-btn').forEach(btn => btn.onclick = () => updateBookingStatus(btn.dataset.id, 'Declined'));
        
        document.querySelectorAll('.delete-booking-btn').forEach(btn => btn.onclick = (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to permanently delete this booking?')) {
                let bookings = getBookingsData().filter(b => b.id !== btn.dataset.id);
                saveBookingsData(bookings);
            }
        });

        document.querySelectorAll('.discount-booking-btn').forEach(btn => btn.onclick = (e) => {
            e.preventDefault();
            openDiscountModal(btn.dataset.id);
        });

        // Dropdown toggle logic
        document.querySelectorAll('.options-booking-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dropdown = document.getElementById(`dropdown-${btn.dataset.id}`);
                const isVisible = dropdown && dropdown.style.display === 'block';
                document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
                if (dropdown) {
                    dropdown.style.display = isVisible ? 'none' : 'block';
                }
            };
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
        });
    }

    // --- Discount Modal Functionality ---
    const discountModal = document.getElementById('discount-modal');
    const discountForm = document.getElementById('discount-form');

    function openDiscountModal(bookingId) {
        const bookings = getBookingsData();
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        document.getElementById('discount-booking-id').value = bookingId;
        document.getElementById('original-amount').value = booking.amount;
        document.getElementById('discount-percentage').value = '';
        document.getElementById('new-amount-preview').textContent = '';
        discountModal.style.display = 'flex';
    }

    if (discountModal) {
        document.getElementById('discount-modal-close').onclick = () => discountModal.style.display = 'none';

        discountForm.addEventListener('input', () => {
            const original = parseFloat(document.getElementById('original-amount').value);
            const percent = parseFloat(document.getElementById('discount-percentage').value);
            if (!isNaN(original) && !isNaN(percent)) {
                const newAmount = original * (1 - percent / 100);
                document.getElementById('new-amount-preview').textContent = `GH₵ ${newAmount.toFixed(2)}`;
            }
        });

        discountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookingId = document.getElementById('discount-booking-id').value;
            const originalAmount = parseFloat(document.getElementById('original-amount').value);
            const discountPercent = parseFloat(document.getElementById('discount-percentage').value);

            if (isNaN(originalAmount) || isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
                alert('Enter a discount between 0% and 100%.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/bookings/${bookingId}/discount`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ discountPercent })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const updatedBooking = await response.json();
                const bookings = getBookingsData();
                const bookingIndex = bookings.findIndex(booking => booking.id === bookingId);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex] = updatedBooking;
                    saveBookingsData(bookings);
                }
            } catch (error) {
                console.error('Could not apply booking discount:', error);
                alert('The discount could not be applied. Please try again.');
                return;
            }

            loadBookings();
            discountModal.style.display = 'none';
        });
    }

    // --- Invoices/Receipts Page Functionality ---
    const createInvoiceBtn = document.getElementById('create-invoice-btn');
    const invoiceFormModal = document.getElementById('invoice-form-modal');
    const invoiceViewModal = document.getElementById('invoice-view-modal');

    // Invoices persistence (stored in localStorage as 'papsInvoices')
    let invoicesData = [];
    function loadInvoicesDataFromStorage() {
        try {
            invoicesData = JSON.parse(localStorage.getItem('papsInvoices') || '[]');
        } catch (e) {
            console.error('Error reading invoices from storage:', e);
            invoicesData = [];
        }
    }

    function getInvoicesData() { return invoicesData; }

    function saveInvoicesData(data) {
        invoicesData = data;
        try {
            localStorage.setItem('papsInvoices', JSON.stringify(invoicesData));
        } catch (e) {
            console.error('Error saving invoices to storage:', e);
        }
        void syncCollection('invoices', invoicesData);
        loadInvoices();
    }

    // Initialize from storage
    loadInvoicesDataFromStorage();

    function loadInvoices() {
        const invoicesTableBody = document.querySelector('#invoices-table tbody');
        if (!invoicesTableBody) return;
        const invoices = getInvoicesData();

        if (invoices.length === 0) {
            invoicesTableBody.innerHTML = '<tr><td colspan="6">No invoices found. Click "Create New Invoice" to start.</td></tr>';
            return;
        }

        invoicesTableBody.innerHTML = invoices.map(invoice => `
            <tr>
                <td>${invoice.id}</td>
                <td>${invoice.clientName}</td>
                <td>${invoice.date}</td>
                <td>${invoice.total.toLocaleString()}</td>
                <td><span class="status-${invoice.status.toLowerCase()}">${invoice.status}</span></td>
                <td class="actions-cell">
                    <button class="btn-secondary view-invoice-btn" data-id="${invoice.id}">View</button>
                    ${invoice.status === 'Draft' ? `<button class="btn-secondary send-invoice-btn" data-id="${invoice.id}">Mark as Sent</button>` : ''}
                    ${invoice.status === 'Sent' ? `<button class="btn-secondary mark-paid-btn" data-id="${invoice.id}">Mark as Paid</button>` : ''}
                    <button class="btn-danger delete-invoice-btn" data-id="${invoice.id}">Delete</button>
                </td>
            </tr>
        `).join('');
        attachInvoiceActionListeners();
    }

    function attachInvoiceActionListeners() {
        document.querySelectorAll('.view-invoice-btn').forEach(btn => btn.onclick = () => openInvoiceViewModal(btn.dataset.id));
        document.querySelectorAll('.send-invoice-btn').forEach(btn => btn.onclick = () => {
            if (confirm('Mark this invoice as sent?')) {
                let invoices = getInvoicesData();
                const index = invoices.findIndex(inv => inv.id === btn.dataset.id);
                if (index > -1) invoices[index].status = 'Sent';
                saveInvoicesData(invoices);
            }
        });
        document.querySelectorAll('.mark-paid-btn').forEach(btn => btn.onclick = () => {
            if (confirm('Mark this invoice as paid? This will count towards total revenue.')) {
                let invoices = getInvoicesData();
                const index = invoices.findIndex(inv => inv.id === btn.dataset.id);
                if (index > -1) invoices[index].status = 'Paid';
                saveInvoicesData(invoices);
            }
        });
        document.querySelectorAll('.delete-invoice-btn').forEach(btn => btn.onclick = () => {
            if (confirm('Are you sure you want to delete this invoice?')) {
                let invoices = getInvoicesData().filter(inv => inv.id !== btn.dataset.id);
                saveInvoicesData(invoices);
            }
        });
    }

    if (createInvoiceBtn) createInvoiceBtn.onclick = () => openInvoiceFormModal({});

    function openInvoiceViewModal(invoiceId) {
        const invoice = getInvoicesData().find(inv => inv.id === invoiceId);
        if (!invoice) return;

        document.getElementById('invoice-client-name').textContent = invoice.clientName;
        document.getElementById('invoice-id').textContent = invoice.id;
        document.getElementById('invoice-date').textContent = invoice.date;
        
        const itemsTbody = document.querySelector('#invoice-items-table tbody');
        itemsTbody.innerHTML = invoice.items.map(item => `<tr><td>${item.description}</td><td>GH₵ ${item.amount.toLocaleString()}</td></tr>`).join('');
        
        document.getElementById('invoice-total-amount').textContent = `GH₵ ${invoice.total.toLocaleString()}`;
        invoiceViewModal.style.display = 'flex';
    }

    if (invoiceViewModal) {
        document.getElementById('invoice-view-modal-close').onclick = () => invoiceViewModal.style.display = 'none';
        document.getElementById('print-invoice-btn').onclick = () => window.print();
    }

    // --- Reviews/Feedback Page Functionality ---
    let reviewsData = [];
    let activeReviewTab = 'all';

    function getReviewsData() {
        try {
            const stored = JSON.parse(localStorage.getItem('papsClientMessages') || '[]');
            if (stored.length > 0) {
                reviewsData = stored;
                return stored;
            }
        } catch (e) {
            console.error('Error reading saved review messages:', e);
        }

        reviewsData = [
            {
                id: 'rev_1',
                type: 'review',
                name: 'Alice Johnson',
                email: 'alice@example.com',
                phone: '',
                message: 'Absolutely stunning photos! Paps has an incredible eye for detail and made us feel so comfortable.',
                rating: 5,
                date: '2024-07-20',
                status: 'Approved'
            },
            {
                id: 'rev_2',
                type: 'review',
                name: 'Michael Brown',
                email: 'michael@example.com',
                phone: '',
                message: 'Great experience overall. The photos were beautiful, though the turnaround time was a bit longer than expected.',
                rating: 4,
                date: '2024-06-15',
                status: 'Pending'
            }
        ];
        return reviewsData;
    }

    function saveReviewsData(data) {
        reviewsData = data;
        localStorage.setItem('papsClientMessages', JSON.stringify(data));
        void syncCollection('messages', data);
        loadReviews();
    }

    function loadReviews() {
        const reviewsContainer = document.getElementById('reviews-grid-container');
        if (!reviewsContainer) return;
        const reviews = getReviewsData();
        const filteredReviews = activeReviewTab === 'all'
            ? reviews
            : reviews.filter(review => (review.type || 'review') === activeReviewTab);

        if (filteredReviews.length === 0) {
            reviewsContainer.innerHTML = '<p>No messages in this category yet.</p>';
            return;
        }

        reviewsContainer.innerHTML = filteredReviews.map(review => {
            const ratingStars = review.rating ? '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) : '';
            const status = review.status || 'New';
            const messageType = review.type === 'inquiry' ? 'Booking Inquiry' : review.type === 'support' ? 'Support Message' : review.type === 'feedback' ? 'Feedback' : 'Review';
            const messageText = review.message || review.feedback || 'No details provided.';
            const contact = review.phone ? `<p class="review-author">Phone: ${review.phone}</p>` : '';
            const emailLine = review.email ? `<p class="review-date">Email: ${review.email}</p>` : '';

            return `
                <div class="review-card-admin">
                    <span class="status-badge ${status === 'Approved' ? 'status-confirmed' : 'status-pending'}">${status}</span>
                    <p class="review-author"><strong>${messageType}</strong></p>
                    <div class="review-rating">${ratingStars || 'No rating'}</div>
                    <p class="review-text">"${messageText}"</p>
                    <p class="review-author">${review.name || 'Client'}</p>
                    ${contact}
                    ${emailLine}
                    <p class="review-date">${new Date(review.date || Date.now()).toLocaleDateString()}</p>
                    <div class="review-actions">
                        ${status !== 'Approved' ? `<button class="btn-secondary approve-review-btn" data-id="${review.id}">Approve</button>` : ''}
                        <button class="btn-danger delete-review-btn" data-id="${review.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        attachReviewActionListeners();
        document.querySelectorAll('.review-tab').forEach(button => {
            button.classList.toggle('active', button.dataset.reviewTab === activeReviewTab);
        });
    }

    document.querySelectorAll('.review-tab').forEach(button => {
        button.addEventListener('click', () => {
            activeReviewTab = button.dataset.reviewTab || 'all';
            loadReviews();
        });
    });

    function attachReviewActionListeners() {
        document.querySelectorAll('.approve-review-btn').forEach(btn => {
            btn.onclick = () => {
                let reviews = getReviewsData();
                const index = reviews.findIndex(r => r.id === btn.dataset.id);
                if (index > -1) {
                    reviews[index].status = 'Approved';
                    saveReviewsData(reviews);
                }
            };
        });

        document.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Are you sure you want to delete this message?')) {
                    let reviews = getReviewsData().filter(r => r.id !== btn.dataset.id);
                    saveReviewsData(reviews);
                }
            };
        });
    }

    // --- Technical Issues Page Functionality ---
    function loadIssues() {
        const issuesContainer = document.getElementById('issues-grid-container');
        if (!issuesContainer) return;
        const messages = getReviewsData();
        // Show only support-type messages (technical issues)
        const issues = messages.filter(msg => (msg.type || '') === 'support');

        if (issues.length === 0) {
            issuesContainer.innerHTML = '<p>No technical issues reported yet.</p>';
            return;
        }

        issuesContainer.innerHTML = issues.map(issue => {
            const status = issue.status || 'New';
            const messageText = issue.message || issue.feedback || 'No details provided.';
            const contact = issue.phone ? `<p class="review-author">Booking ID: ${issue.phone}</p>` : '';
            const emailLine = issue.email ? `<p class="review-date">Email: ${issue.email}</p>` : '';

            return `
                <div class="review-card-admin">
                    <span class="status-badge ${status === 'Resolved' ? 'status-confirmed' : 'status-pending'}">${status}</span>
                    <p class="review-author"><strong>Technical Issue</strong></p>
                    <p class="review-text">"${messageText}"</p>
                    <p class="review-author">${issue.name || 'Client'}</p>
                    ${contact}
                    ${emailLine}
                    <p class="review-date">${new Date(issue.date || Date.now()).toLocaleDateString()}</p>
                    <div class="review-actions">
                        ${status !== 'Resolved' ? `<button class="btn-secondary resolve-issue-btn" data-id="${issue.id}">Mark Resolved</button>` : ''}
                        <button class="btn-danger delete-issue-btn" data-id="${issue.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        attachIssueActionListeners();
    }

    function attachIssueActionListeners() {
        document.querySelectorAll('.resolve-issue-btn').forEach(btn => {
            btn.onclick = () => {
                let messages = getReviewsData();
                const index = messages.findIndex(m => m.id === btn.dataset.id);
                if (index > -1) {
                    messages[index].status = 'Resolved';
                    saveReviewsData(messages);
                    loadIssues();
                }
            };
        });

        document.querySelectorAll('.delete-issue-btn').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Are you sure you want to delete this issue?')) {
                    let messages = getReviewsData().filter(m => m.id !== btn.dataset.id);
                    saveReviewsData(messages);
                    loadIssues();
                }
            };
        });
    }

    // --- Finance Page Functionality ---
    function getFinanceData() {
        try {
            return JSON.parse(localStorage.getItem('papsFinanceEntries') || '[]');
        } catch (e) {
            console.error('Error reading finance entries:', e);
            return [];
        }
    }

    function saveFinanceData(data) {
        localStorage.setItem('papsFinanceEntries', JSON.stringify(data));
        void syncCollection('finance', data);
        loadFinance();
    }

    function getFinanceStatusClass(status) {
        const normalized = (status || 'Awaiting Payment').toLowerCase().replace(/\s+/g, '-');
        if (normalized === 'paid') return 'status-confirmed';
        if (normalized === 'awaiting-payment' || normalized === 'partially-paid') return 'status-pending';
        return 'status-draft';
    }

    const financePaymentModal = document.getElementById('finance-payment-modal');
    const financePaymentForm = document.getElementById('finance-payment-form');

    function openFinancePaymentModal(bookingId) {
        const financeEntries = getFinanceData();
        const entry = financeEntries.find(item => item.bookingId === bookingId);
        if (!entry) return;

        document.getElementById('finance-payment-booking-id').value = bookingId;
        document.getElementById('finance-payment-client').value = entry.clientName;
        document.getElementById('finance-payment-amount-due').value = entry.amountDue;
        document.getElementById('finance-payment-amount-paid').value = Math.max(entry.amountDue - entry.balance, 0);
        document.getElementById('finance-payment-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('finance-payment-notes').value = entry.notes || '';
        financePaymentModal.style.display = 'flex';
    }

    function attachFinanceActionListeners() {
        document.querySelectorAll('.finance-record-payment-btn').forEach(btn => {
            btn.onclick = () => openFinancePaymentModal(btn.dataset.id);
        });
    }

    if (financePaymentModal) {
        document.getElementById('finance-payment-modal-close').onclick = () => financePaymentModal.style.display = 'none';
    }

    if (financePaymentForm) {
        financePaymentForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const bookingId = document.getElementById('finance-payment-booking-id').value;
            const amountPaid = parseFloat(document.getElementById('finance-payment-amount-paid').value);
            const paymentDate = document.getElementById('finance-payment-date').value;
            const paymentMethod = document.getElementById('finance-payment-method').value;
            const notes = document.getElementById('finance-payment-notes').value.trim();

            if (!bookingId || isNaN(amountPaid) || amountPaid <= 0) {
                alert('Please enter a valid amount received.');
                return;
            }

            const financeEntries = getFinanceData();
            const entryIndex = financeEntries.findIndex(entry => entry.bookingId === bookingId);
            if (entryIndex === -1) {
                alert('This booking has not been added to finance yet.');
                return;
            }

            const entry = financeEntries[entryIndex];
            entry.amountPaid = Number((entry.amountPaid + amountPaid).toFixed(2));
            entry.balance = Math.max(entry.amountDue - entry.amountPaid, 0);
            entry.paymentDate = paymentDate || entry.paymentDate;
            entry.paymentMethod = paymentMethod;
            entry.notes = notes || entry.notes;
            entry.status = entry.amountPaid >= entry.amountDue ? 'Paid' : 'Partially Paid';
            saveFinanceData(financeEntries);
            financePaymentModal.style.display = 'none';
            financePaymentForm.reset();
            const bookings = getBookingsData();
            const bookingIndex = bookings.findIndex(item => item.id === bookingId);
            if (bookingIndex > -1) {
                bookings[bookingIndex].status = entry.amountPaid >= entry.amountDue ? 'Paid' : 'Confirmed';
                saveBookingsData(bookings);
            }
        });
    }

    function loadFinance() {
        const financeEntries = getFinanceData();

        const totalRevenue = financeEntries
            .filter(entry => entry.status === 'Paid')
            .reduce((sum, entry) => sum + Number(entry.amountPaid || 0), 0);
        document.getElementById('finance-total-revenue').textContent = `GH₵${totalRevenue.toLocaleString()}`;

        const outstanding = financeEntries
            .filter(entry => entry.status !== 'Paid' && entry.status !== 'Cancelled')
            .reduce((sum, entry) => sum + Math.max(Number(entry.amountDue || 0) - Number(entry.amountPaid || 0), 0), 0);
        document.getElementById('finance-outstanding').textContent = `GH₵${outstanding.toLocaleString()}`;

        const awaitingPayment = financeEntries
            .filter(entry => entry.status !== 'Paid' && entry.status !== 'Cancelled')
            .reduce((sum, entry) => sum + Number(entry.amountDue || 0), 0);
        document.getElementById('finance-in-drafts').textContent = `GH₵${awaitingPayment.toLocaleString()}`;

        const transactionsTableBody = document.querySelector('#finance-transactions-table tbody');
        if (!transactionsTableBody) return;

        if (financeEntries.length === 0) {
            transactionsTableBody.innerHTML = '<tr><td colspan="8">No booking payments have been recorded yet.</td></tr>';
            return;
        }

        transactionsTableBody.innerHTML = financeEntries.map(entry => {
            const balance = Math.max(Number(entry.amountDue || 0) - Number(entry.amountPaid || 0), 0);
            const status = entry.status || 'Awaiting Payment';
            const actionText = status === 'Paid' ? 'View Payment' : 'Record Payment';
            return `
                <tr>
                    <td>${entry.bookingId}</td>
                    <td>${entry.clientName}</td>
                    <td>${entry.service}</td>
                    <td>GH₵${Number(entry.amountDue || 0).toLocaleString()}</td>
                    <td>GH₵${Number(entry.amountPaid || 0).toLocaleString()}</td>
                    <td>GH₵${balance.toLocaleString()}</td>
                    <td><span class="${getFinanceStatusClass(status)}">${status}</span></td>
                    <td><button class="btn-secondary finance-record-payment-btn" data-id="${entry.bookingId}">${actionText}</button></td>
                </tr>
            `;
        }).join('');

        attachFinanceActionListeners();
    }

    // --- Calendar Page Functionality ---
    let calendarDate = new Date();

    function loadCalendar() {
        showMonthView(calendarDate);
    }

    function showMonthView(date) {
        document.getElementById('month-view-container').style.display = 'block';
        document.getElementById('day-view-container').style.display = 'none';
        document.getElementById('calendar-back-btn').style.display = 'none';
        document.getElementById('calendar-view-title').textContent = 'Calendar';
        renderMonthGrid(date);
    }

    function showDayView(date) {
        document.getElementById('month-view-container').style.display = 'none';
        document.getElementById('day-view-container').style.display = 'block';
        document.getElementById('calendar-back-btn').style.display = 'inline-block';
        document.getElementById('calendar-view-title').textContent = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        renderDayDetails(date);
    }

    function getCalendarEventsData() {
        try {
            return JSON.parse(localStorage.getItem('papsCalendarEvents') || '[]');
        } catch (e) {
            console.error('Error reading calendar events:', e);
            return [];
        }
    }

    function saveCalendarEventsData(events) {
        try {
            localStorage.setItem('papsCalendarEvents', JSON.stringify(events));
        } catch (e) {
            console.error('Error saving calendar events:', e);
        }
        void syncCollection('calendar', events);
    }

    function renderMonthGrid(date) {
        const month = date.getMonth();
        const year = date.getFullYear();

        const monthYearEl = document.getElementById('calendar-month-year');
        const daysGridEl = document.getElementById('calendar-days-grid');

        if (!monthYearEl || !daysGridEl) return;

        monthYearEl.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        daysGridEl.innerHTML = '';

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const bookings = getBookingsData();
        const customEvents = getCalendarEventsData();
        const eventsByDate = {};

        // Only show CONFIRMED bookings on the calendar
        bookings.forEach(b => {
            if (b.date && (b.status === 'Confirmed' || b.status === 'Paid')) {
                const bookingDate = new Date(b.date).toISOString().split('T')[0];
                if (!eventsByDate[bookingDate]) {
                    eventsByDate[bookingDate] = [];
                }
                eventsByDate[bookingDate].push(b);
            }
        });

        customEvents.forEach(event => {
            if (event.date) {
                if (!eventsByDate[event.date]) {
                    eventsByDate[event.date] = [];
                }
                eventsByDate[event.date].push(event);
            }
        });

        // Add blank days for the start of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysGridEl.innerHTML += `<div class="calendar-day not-current-month"></div>`;
        }

        // Add days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDate = new Date(year, month, i);
            const dayDateString = dayDate.toISOString().split('T')[0];
            const dayEvents = eventsByDate[dayDateString] || [];
            const hasEvents = dayEvents.length > 0;

            let dayHtml = `<div class="calendar-day ${hasEvents ? 'has-events' : ''}" data-date="${dayDateString}">`;
            dayHtml += `<div class="day-number">${i}</div>`;

            if (hasEvents) {
                dayHtml += `<div class="event-dot"></div>`;
                // Show a small preview of booking count
                const bookingCount = dayEvents.filter(e => e.id && e.service).length;
                if (bookingCount > 0) {
                    dayHtml += `<div class="event-count">${bookingCount} booking${bookingCount > 1 ? 's' : ''}</div>`;
                }
            }

            dayHtml += `</div>`;
            daysGridEl.innerHTML += dayHtml;
        }

        // Add click listeners to days with events
        daysGridEl.querySelectorAll('.has-events').forEach(dayCell => {
            dayCell.addEventListener('click', () => {
                showDayView(new Date(dayCell.dataset.date + 'T00:00:00'));
            });
        });
    }

    function renderDayDetails(date) {
        const dayViewContainer = document.getElementById('day-view-container');
        const dayDateString = date.toISOString().split('T')[0];
        // Only show CONFIRMED/PAID bookings in the day view
        const bookings = getBookingsData().filter(b => b.date === dayDateString && (b.status === 'Confirmed' || b.status === 'Paid'));
        const customEvents = getCalendarEventsData().filter(event => event.date === dayDateString);
        const allEvents = [
            ...bookings.map(booking => ({
                type: 'booking',
                id: booking.id,
                title: booking.service,
                time: booking.time || 'Not specified',
                subtitle: `Client: ${booking.name}`,
                status: booking.status || 'Pending',
                colorClass: 'status-' + ((booking.status || 'Pending').toLowerCase()),
                booking: booking
            })),
            ...customEvents.map(event => ({
                type: 'event',
                id: event.id,
                title: event.title,
                time: event.time || 'All day',
                subtitle: event.notes || 'Manual event',
                status: 'Event',
                colorClass: 'status-pending'
            }))
        ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        if (allEvents.length === 0) {
            dayViewContainer.innerHTML = '<p>No confirmed bookings or events for this day.</p>';
            return;
        }

        dayViewContainer.innerHTML = allEvents.map(item => {
            if (item.type === 'booking') {
                const b = item.booking;
                const addonsText = b.addons && b.addons.length > 0
                    ? b.addons.map(a => a.name).join(', ')
                    : 'None';
                return `
                    <div class="day-view-event booking-detail-card">
                        <div class="day-view-event-header">
                            <strong>${b.service || 'Service'}</strong>
                            <span class="${item.colorClass}">${b.status || 'Confirmed'}</span>
                        </div>
                        <div class="day-view-event-details">
                            <p><strong>Booking ID:</strong> ${b.id || 'N/A'}</p>
                            <p><strong>Time:</strong> ${b.time || 'Not specified'}</p>
                            <p><strong>Client:</strong> ${b.name || 'N/A'}</p>
                            <p><strong>Email:</strong> ${b.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${b.phone || 'N/A'}</p>
                            <p><strong>Location:</strong> ${b.location || 'N/A'}</p>
                            <p><strong>Amount:</strong> GH₵${b.amount ? Number(b.amount).toLocaleString() : 'N/A'}</p>
                            <p><strong>Add-ons:</strong> ${addonsText}</p>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="day-view-event">
                    <strong>${item.title}</strong>
                    <p>Time: ${item.time}</p>
                    <p>${item.subtitle}</p>
                    <p>Status: <span class="${item.colorClass}">Event</span></p>
                    <button type="button" class="btn-secondary delete-calendar-event-btn" data-event-id="${item.id}">Delete</button>
                </div>
            `;
        }).join('');

        dayViewContainer.querySelectorAll('.delete-calendar-event-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const eventId = event.target.dataset.eventId;
                const events = getCalendarEventsData().filter(item => item.id !== eventId);
                saveCalendarEventsData(events);
                showDayView(date);
            });
        });
    }

    const prevMonthBtn = document.getElementById('calendar-prev-month');
    const nextMonthBtn = document.getElementById('calendar-next-month');
    const backToMonthBtn = document.getElementById('calendar-back-btn');
    const addCalendarEventBtn = document.getElementById('add-calendar-event-btn');
    const calendarEventModal = document.getElementById('calendar-event-modal');
    const calendarEventForm = document.getElementById('calendar-event-form');
    const calendarEventModalClose = document.getElementById('calendar-event-modal-close');

    function openCalendarEventModal(dateValue = '') {
        if (!calendarEventModal) return;
        calendarEventForm.reset();
        document.getElementById('calendar-event-id').value = '';
        document.getElementById('calendar-event-date').value = dateValue || new Date().toISOString().split('T')[0];
        calendarEventModal.style.display = 'block';
    }

    if (addCalendarEventBtn) {
        addCalendarEventBtn.addEventListener('click', () => {
            const activeDate = document.getElementById('day-view-container') && document.getElementById('day-view-container').style.display !== 'none'
                ? document.getElementById('calendar-view-title').dataset.dayDate || new Date().toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            openCalendarEventModal(activeDate);
        });
    }

    if (calendarEventModalClose) {
        calendarEventModalClose.addEventListener('click', () => {
            calendarEventModal.style.display = 'none';
        });
    }

    if (calendarEventForm) {
        calendarEventForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const id = document.getElementById('calendar-event-id').value || `calendar-event-${Date.now()}`;
            const title = document.getElementById('calendar-event-title').value.trim();
            const date = document.getElementById('calendar-event-date').value;
            const time = document.getElementById('calendar-event-time').value;
            const notes = document.getElementById('calendar-event-notes').value.trim();

            if (!title || !date) return;

            const events = getCalendarEventsData();
            const existingIndex = events.findIndex(item => item.id === id);
            const newEvent = { id, title, date, time, notes };

            if (existingIndex >= 0) {
                events[existingIndex] = newEvent;
            } else {
                events.push(newEvent);
            }

            saveCalendarEventsData(events);
            calendarEventModal.style.display = 'none';
            if (document.getElementById('day-view-container').style.display !== 'none') {
                showDayView(new Date(date + 'T00:00:00'));
            } else {
                renderMonthGrid(calendarDate);
            }
        });
    }

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderMonthGrid(calendarDate);
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderMonthGrid(calendarDate);
        });
    }
    if (backToMonthBtn) {
        backToMonthBtn.addEventListener('click', () => {
            showMonthView(calendarDate);
        });
    }

    let bookingsData = null; // Will be lazy-loaded from localStorage

    function getBookingsData() {
        // Return cached data if available
        if (bookingsData !== null) {
            return bookingsData;
        }

        // Try to load from localStorage first
        try {
            const stored = localStorage.getItem('papsBookings');
            if (stored) {
                const parsed = JSON.parse(stored);
                bookingsData = parsed;
                return parsed;
            }
        } catch (e) {
            console.error('Error reading bookings from localStorage:', e);
        }

        // Fallback default data
        const defaultBookings = [
            {
                id: 'PAP-ABC123',
                service: 'Premium Session',
                amount: 570,
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                date: '2024-09-15',
                time: '14:00',
                status: 'Confirmed'
            },
            {
                id: 'PAP-XYZ789',
                service: 'Standard Session',
                amount: 250,
                name: 'John Smith',
                email: 'john.smith@example.com',
                date: '2024-10-01',
                time: '10:00',
                status: 'Pending'
            }
        ];

        // Seed localStorage with defaults
        try {
            localStorage.setItem('papsBookings', JSON.stringify(defaultBookings));
        } catch (e) {
            console.error('Error seeding bookings to localStorage:', e);
        }
        
        bookingsData = defaultBookings;
        return defaultBookings;
    }

    // --- Rate Card Page Functionality ---
    const rateCardModal = document.getElementById('rate-card-modal');
    const rateCardContainer = document.getElementById('rate-card-container');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const rateCardForm = document.getElementById('rate-card-form');
    const itemTypeSelect = document.getElementById('item-type');

    function getRateCardData() { 
        try {
            const settings = JSON.parse(localStorage.getItem('papsPhotographySettings') || '{}');
            return settings.rateCard || [];
        } catch (e) {
            return [];
        }
    }

    function saveRateCardData(data) {
        try {
            const settings = JSON.parse(localStorage.getItem('papsPhotographySettings') || '{}');
            settings.rateCard = data;
            localStorage.setItem('papsPhotographySettings', JSON.stringify(settings));
            void fetch(`${API_BASE}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ rateCard: data })
            });
        } catch (e) {
            console.error('Error saving rate card data to localStorage:', e);
        }
        loadRateCard(); // Re-render the view
    }

    function loadRateCard() {
        if (!rateCardContainer) return;
        const data = getRateCardData();
        rateCardContainer.innerHTML = '';

        if (data.length === 0) {
            rateCardContainer.innerHTML = '<p>No service categories found. Click "Add Service Category" to get started.</p>';
        }

        data.forEach(category => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'rate-category-admin';
            categoryEl.innerHTML = `
                <div class="category-header">
                    <img src="${category.coverPhoto || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="Category Cover Photo" class="service-cover-photo-thumb">
                    <div>
                        <h3>${category.name}</h3>
                        <p>${category.description || ''}</p>
                    </div>
                    <div class="category-actions">
                        <button class="btn-secondary add-service-item-btn" data-category-id="${category.id}">Add Service</button>
                        <button class="btn-secondary edit-category-btn" data-category-id="${category.id}">Edit</button>
                        <button class="btn-danger delete-category-btn" data-category-id="${category.id}">Delete</button>
                    </div>
                </div>
                <div class="service-items-container">
                    ${(category.services || []).map(service => `
                        <div class="service-item-admin">
                            <div class="service-info">
                                <img src="${service.coverPhoto || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="Service Cover Photo" class="service-cover-photo-thumb">
                                <div style="flex-grow: 1;">
                                    <strong>${service.name}</strong> - <span>GH₵${service.price}</span>
                                    <p>${service.description || ''}</p>
                                </div>
                            </div>
                            <div class="service-actions">
                                <button class="btn-secondary edit-service-btn" data-category-id="${category.id}" data-service-id="${service.id}">Edit</button>
                                <button class="btn-danger delete-service-btn" data-category-id="${category.id}" data-service-id="${service.id}">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            rateCardContainer.appendChild(categoryEl);
        });

        attachRateCardEventListeners();
    }

    // Temporary state for add-ons in the modal
    let tempAddOns = [];
    let tempCoverPhoto = null;

    function openRateCardModal(config) {
        rateCardForm.reset();
        document.getElementById('edit-mode-id').value = config.id || '';
        document.getElementById('parent-category-id').value = config.parentId || '';
        
        itemTypeSelect.value = config.type;
        toggleModalFields(config.type);

        document.getElementById('rate-card-modal-title').textContent = config.title;
        document.getElementById('item-name').value = config.name || '';

        if (config.type === 'category') {
            document.getElementById('category-description').value = config.description || '';
            document.getElementById('item-terms').value = config.terms || '';
            tempAddOns = config.addOns ? [...config.addOns] : []; // Copy addons to temp state
            tempCoverPhoto = config.coverPhoto || null;
            document.getElementById('item-cover-photo').value = ''; // Clear file input
            const preview = document.getElementById('cover-photo-preview');
            if (tempCoverPhoto) {
                preview.src = tempCoverPhoto;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
                preview.src = '';
            }
            renderAddOnsInModal();
        } else {
            document.getElementById('item-price').value = config.price || '';
            document.getElementById('item-description').value = config.description || '';
            document.getElementById('item-details').value = (config.details || []).join('\n');
            tempCoverPhoto = config.coverPhoto || null;
            document.getElementById('item-cover-photo').value = ''; // Clear file input
            const preview = document.getElementById('cover-photo-preview');
            if (tempCoverPhoto) {
                preview.src = tempCoverPhoto;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
                preview.src = '';
            }
        }
        
        rateCardModal.style.display = 'flex';
    }

    function renderAddOnsInModal() {
        const listContainer = document.getElementById('item-addons-list');
        listContainer.innerHTML = '';
        if (tempAddOns.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; padding: 10px; color: var(--text-secondary);">No add-ons for this service.</p>';
            return;
        }
        tempAddOns.forEach((addon, index) => {
            const addonEl = document.createElement('div');
            addonEl.className = 'addon-item';
            addonEl.innerHTML = `
                <span>${addon.name} (+GH₵${addon.price})</span>
                <button type="button" class="btn-danger" data-index="${index}">Remove</button>
            `;
            listContainer.appendChild(addonEl);
        });

        // Attach event listeners to the new remove buttons
        listContainer.querySelectorAll('.btn-danger').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                tempAddOns.splice(indexToRemove, 1);
                renderAddOnsInModal();
            });
        });
    }


    function toggleModalFields(type) {
        document.getElementById('service-fields').style.display = type === 'service' ? 'block' : 'none';
        document.getElementById('category-fields').style.display = type === 'category' ? 'block' : 'none';
    }

    itemTypeSelect.addEventListener('change', () => toggleModalFields(itemTypeSelect.value));

    function attachRateCardEventListeners() {
        // Open Modal Buttons
        addCategoryBtn.onclick = () => openRateCardModal({ type: 'category', title: 'Add Service Category' });

        document.querySelectorAll('.add-service-item-btn').forEach(btn => {
            btn.onclick = () => openRateCardModal({ type: 'service', title: 'Add Service Item', parentId: btn.dataset.categoryId });
        });

        document.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.onclick = () => {
                const data = getRateCardData();
                const category = data.find(c => c.id === btn.dataset.categoryId);
                openRateCardModal({ type: 'category', title: 'Edit Service Category', ...category });
            };
        });

        document.querySelectorAll('.edit-service-btn').forEach(btn => {
            btn.onclick = () => {
                const data = getRateCardData();
                const category = data.find(c => c.id === btn.dataset.categoryId);
                const service = category.services.find(s => s.id === btn.dataset.serviceId);
                openRateCardModal({ type: 'service', title: 'Edit Service Item', parentId: category.id, ...service });
            };
        });

        // Delete Buttons
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.onclick = () => {
                if (!confirm('Are you sure you want to delete this entire category and all its services?')) return;
                let data = getRateCardData();
                data = data.filter(c => c.id !== btn.dataset.categoryId);
                saveRateCardData(data);
            };
        });

        document.querySelectorAll('.delete-service-btn').forEach(btn => {
            btn.onclick = () => {
                if (!confirm('Are you sure you want to delete this service?')) return;
                let data = getRateCardData();
                const category = data.find(c => c.id === btn.dataset.categoryId);
                if (category) {
                    category.services = category.services.filter(s => s.id !== btn.dataset.serviceId);
                }
                saveRateCardData(data);
            };
        });
    }

    // Modal Close
    document.getElementById('rate-card-modal-close').onclick = () => rateCardModal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == rateCardModal) rateCardModal.style.display = 'none';
        if (event.target == invoiceFormModal) invoiceFormModal.style.display = 'none';
        if (event.target == invoiceViewModal) invoiceViewModal.style.display = 'none';
        if (event.target == projectModal) projectModal.style.display = 'none';
        if (event.target == workModal) workModal.style.display = 'none';
        if (event.target == discountModal) discountModal.style.display = 'none';
    };

    // Form Submission
    rateCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let data = getRateCardData();
        const id = document.getElementById('edit-mode-id').value;
        const type = itemTypeSelect.value;

        if (type === 'category') {
            const categoryData = {
                id: id || `cat_${Date.now()}`,
                name: document.getElementById('item-name').value,
                description: document.getElementById('category-description').value,
                terms: document.getElementById('item-terms').value,
                coverPhoto: tempCoverPhoto,
                addOns: [...tempAddOns],
                services: id ? (data.find(c => c.id === id)?.services || []) : []
            };
            if (id) data = data.map(c => c.id === id ? categoryData : c);
            else data.push(categoryData);
        } else { // service
            const parentId = document.getElementById('parent-category-id').value;
            const serviceData = {
                id: id || `serv_${Date.now()}`,
                name: document.getElementById('item-name').value,
                price: parseFloat(document.getElementById('item-price').value),
                description: document.getElementById('item-description').value,
                details: document.getElementById('item-details').value.split('\n').filter(line => line.trim() !== ''),
            };
            const category = data.find(c => c.id === parentId);
            if (id) category.services = category.services.map(s => s.id === id ? serviceData : s);
            else category.services.push(serviceData);
        }

        saveRateCardData(data);
        rateCardModal.style.display = 'none';
    });

    // Add-on management in modal
    document.getElementById('add-addon-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-addon-name');
        const priceInput = document.getElementById('new-addon-price');
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);

        if (name && !isNaN(price) && price >= 0) {
            tempAddOns.push({ name, price });
            renderAddOnsInModal();
            nameInput.value = '';
            priceInput.value = '';
        }
    });

    // Cover Photo Preview
    document.getElementById('item-cover-photo').addEventListener('change', function(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('cover-photo-preview');
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                tempCoverPhoto = e.target.result; // Store base64 string
                preview.src = tempCoverPhoto;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // --- Portfolio Page Functionality ---
    const portfolioPage = document.getElementById('portfolio-page');
    const projectsContainer = document.getElementById('portfolio-projects-container');
    const worksContainer = document.getElementById('portfolio-works-container');
    const addProjectBtn = document.getElementById('add-project-btn');
    const backToProjectsBtn = document.getElementById('back-to-projects-btn');
    const portfolioTitle = document.getElementById('portfolio-title');

    // Modals and Forms
    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    const workModal = document.getElementById('work-modal');
    const workForm = document.getElementById('work-form');

    async function getPortfolioData() {
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

    async function savePortfolioData(data) {
        try {
            const response = await fetch(`${API_BASE}/api/portfolio`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.warn('Could not sync portfolio to backend:', e);
            return data;
        }
    }

    async function showProjectsView() {
        projectsContainer.style.display = 'grid';
        worksContainer.style.display = 'none';
        addProjectBtn.style.display = 'inline-block';
        backToProjectsBtn.style.display = 'none';
        portfolioTitle.textContent = 'Portfolio Projects';
        await loadProjects();
    }

    async function showWorksView(projectId) {
        projectsContainer.style.display = 'none';
        worksContainer.style.display = 'grid';
        addProjectBtn.style.display = 'none';
        backToProjectsBtn.style.display = 'inline-block';

        const data = await getPortfolioData();
        const project = data.find(p => p.id === projectId);
        portfolioTitle.textContent = project ? `Editing "${project.name}"` : 'Project Works';

        await loadWorks(projectId);
    }

    async function loadProjects() {
        const data = await getPortfolioData();
        projectsContainer.innerHTML = '';
        if (data.length === 0) {
            projectsContainer.innerHTML = '<p>No projects found. Click "Add New Project" to create one.</p>';
            return;
        }

        data.forEach(project => {
            const firstWorkImage = project.works && project.works.length > 0 ? project.works[0].imageUrl : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="project-card-thumbnail">
                    <img src="${firstWorkImage}" alt="Thumbnail">
                </div>
                <div class="project-card-info">
                    <h3>${project.name}</h3>
                </div>
                <div class="project-card-actions">
                    <button class="btn-primary manage-works-btn" data-id="${project.id}">Manage Images</button>
                    <button class="btn-secondary edit-project-btn" data-id="${project.id}">Edit</button>
                    <button class="btn-danger delete-project-btn" data-id="${project.id}">Delete</button>
                </div>
            `;
            projectsContainer.appendChild(card);
        });
        attachProjectEventListeners();
    }

    async function loadWorks(projectId) {
        const data = await getPortfolioData();
        const project = data.find(p => p.id === projectId);
        worksContainer.innerHTML = '';

        const addCard = document.createElement('div');
        addCard.className = 'project-card-thumbnail';
        addCard.style.cursor = 'pointer';
        addCard.innerHTML = '+ Add Image';
        addCard.onclick = () => openWorkModal({ parentId: projectId });
        worksContainer.appendChild(addCard);

        if (!project || !project.works || project.works.length === 0) return;

        project.works.forEach(work => {
            const workCard = document.createElement('div');
            workCard.className = 'work-card';
            workCard.innerHTML = `
                <img src="${work.imageUrl}" alt="${work.caption || 'Work'}">
                <div class="work-card-overlay">
                    <div class="work-actions">
                        <button class="btn-danger delete-work-btn" data-project-id="${projectId}" data-work-id="${work.id}">Delete</button>
                    </div>
                </div>
            `;
            worksContainer.appendChild(workCard);
        });
        attachWorkEventListeners();
    }

    function attachProjectEventListeners() {
        document.querySelectorAll('.manage-works-btn').forEach(b => b.onclick = async () => await showWorksView(b.dataset.id));
        document.querySelectorAll('.edit-project-btn').forEach(b => b.onclick = () => openProjectModal({ id: b.dataset.id }));
        document.querySelectorAll('.delete-project-btn').forEach(b => b.onclick = async () => {
            if (!confirm('Are you sure you want to delete this project and all its images?')) return;
            let data = await getPortfolioData();
            data = data.filter(p => p.id !== b.dataset.id);
            await savePortfolioData(data);
            await loadProjects();
        });
    }

    function attachWorkEventListeners() {
        document.querySelectorAll('.delete-work-btn').forEach(b => b.onclick = async () => {
            if (!confirm('Are you sure you want to delete this image?')) return;
            let data = await getPortfolioData();
            const project = data.find(p => p.id === b.dataset.projectId);
            if (project) {
                project.works = (project.works || []).filter(w => w.id !== b.dataset.workId);
                await savePortfolioData(data);
                await loadWorks(b.dataset.projectId);
            }
        });
    }

    addProjectBtn.onclick = () => openProjectModal({});
    backToProjectsBtn.onclick = async () => await showProjectsView();
    projectModal.querySelector('.close-btn').onclick = () => projectModal.style.display = 'none';

    async function openProjectModal({ id }) {
        projectForm.reset();
        document.getElementById('project-edit-id').value = id || '';
        const data = await getPortfolioData();
        if (id) {
            const project = data.find(p => p.id === id);
            document.getElementById('project-name').value = project ? project.name : '';
            document.getElementById('project-modal-title').textContent = 'Edit Project';
        } else {
            document.getElementById('project-modal-title').textContent = 'Add New Project';
        }
        projectModal.style.display = 'flex';
    }

    projectForm.addEventListener('submit', async e => {
        e.preventDefault();
        let data = await getPortfolioData();
        const id = document.getElementById('project-edit-id').value;
        const projectData = {
            id: id || `proj_${Date.now()}`,
            name: document.getElementById('project-name').value,
            works: id ? (data.find(p => p.id === id)?.works || []) : []
        };
        if (id) data = data.map(p => p.id === id ? projectData : p);
        else data.push(projectData);
        await savePortfolioData(data);
        projectModal.style.display = 'none';
        await loadProjects();
    });

    workModal.querySelector('.close-btn').onclick = () => workModal.style.display = 'none';

    function openWorkModal({ parentId }) {
        workForm.reset();
        document.getElementById('work-parent-project-id').value = parentId;
        workModal.style.display = 'flex';
    }

    workForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fileInput = document.getElementById('work-image-file');
        const files = fileInput.files;
        if (files.length === 0) return;

        const parentId = document.getElementById('work-parent-project-id').value;
        let data = await getPortfolioData();
        const project = data.find(p => p.id === parentId);

        if (!project) return;

        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageUrl = e.target.result;
                const workData = {
                    id: `work_${Date.now()}_${index}`,
                    imageUrl: imageUrl,
                    caption: file.name
                };
                project.works = project.works || [];
                project.works.push(workData);

                if (index === files.length - 1) {
                    savePortfolioData(data).then(async () => {
                        workModal.style.display = 'none';
                        await loadWorks(parentId);
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    });

    // --- Overview Page Functionality ---
    function loadOverview() {
        const bookings = getBookingsData();

        // Calculate Total Revenue from confirmed bookings
        const totalRevenue = bookings
            .filter(b => b.status === 'Confirmed')
            .reduce((sum, b) => sum + (b.amount || 0), 0);
        document.getElementById('overview-total-revenue').textContent = `GH₵${totalRevenue.toLocaleString()}`;

        // Calculate Pending Bookings
        const pendingBookings = bookings.filter(b => (b.status || 'Pending') === 'Pending').length;
        document.getElementById('overview-pending-bookings').textContent = pendingBookings;

        // Calculate Total Clients
        const clients = {};
        bookings.forEach(booking => {
            const key = (booking.email || booking.name || 'Unknown').toLowerCase();
            if (!clients[key]) {
                clients[key] = true;
            }
        });
        const totalClients = Object.keys(clients).length;
        document.getElementById('overview-total-clients').textContent = totalClients;

        // Populate Recent Bookings Table
        const recentBookingsTableBody = document.querySelector('#recent-bookings-table tbody');
        if (recentBookingsTableBody) {
            const recentBookings = [...bookings].reverse().slice(0, 5); // Get last 5 bookings
            if (recentBookings.length === 0) {
                recentBookingsTableBody.innerHTML = '<tr><td colspan="4">No recent activity.</td></tr>';
            } else {
                recentBookingsTableBody.innerHTML = recentBookings.map(booking => {
                    const statusClass = (booking.status || 'Pending').toLowerCase();
                    return `
                        <tr>
                            <td>${booking.name || 'N/A'}</td>
                            <td>${booking.service || 'N/A'}</td>
                            <td>${booking.date || 'N/A'}</td>
                            <td>${booking.time || ''}</td>
                            <td><span class="status-${statusClass}">${booking.status || 'Pending'}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    // --- Clients Page Functionality ---
    function loadClients() {
        const clientsTableBody = document.querySelector('#clients-table tbody');
        if (!clientsTableBody) return;

        const bookings = getBookingsData();
        const clientsMap = new Map();

        bookings.forEach(booking => {
            const name = booking.name || 'Unknown Client';
            const email = booking.email || 'No email provided';
            const phone = booking.phone || booking.mobile || 'No phone number';
            const key = (booking.email || '').trim().toLowerCase() || name.trim().toLowerCase();

            if (!clientsMap.has(key)) {
                clientsMap.set(key, {
                    name,
                    email,
                    phone,
                    totalBookings: 0,
                    totalSpent: 0
                });
            }

            const client = clientsMap.get(key);
            client.totalBookings += 1;
            client.totalSpent += Number(booking.amount || 0);
        });

        const clients = Array.from(clientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        if (clients.length === 0) {
            clientsTableBody.innerHTML = '<tr><td colspan="5">No client data found.</td></tr>';
            return;
        }

        clientsTableBody.innerHTML = clients.map(client => `
            <tr>
                <td>${client.name}</td>
                <td>${client.email}</td>
                <td>${client.phone}</td>
                <td>${client.totalBookings}</td>
                <td>GH₵${client.totalSpent.toLocaleString()}</td>
            </tr>
        `).join('');
    }

    // --- Settings Page Functionality ---
    async function loadSettings() {
        try {
            const response = await fetch(`${API_BASE}/api/settings`, { credentials: 'include' });
            if (!response.ok) return;
            const settings = await response.json();
            const personal = settings.personal || {};
            const business = settings.business || {};

            const fields = {
                'full-name': personal.name,
                email: personal.email,
                phone: personal.phone,
                website: personal.website,
                instagram: personal.socials?.instagram,
                twitter: personal.socials?.twitter,
                facebook: personal.socials?.facebook,
                'brand-name': business.brandName,
                'brand-tagline': business.tagline,
                'about-us': business.aboutUs
            };

            Object.entries(fields).forEach(([id, value]) => {
                const input = document.getElementById(id);
                if (input && value !== undefined && value !== null) input.value = value;
            });

            const profileImage = document.querySelector('#profile-picture-preview img');
            const logoImage = document.querySelector('#brand-logo-preview img');
            if (profileImage && personal.profilePic) profileImage.src = personal.profilePic;
            if (logoImage && business.brandLogo) logoImage.src = business.brandLogo;

            localStorage.setItem('papsPhotographySettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Could not load saved settings from backend:', error);
        }
    }

    // --- Invoice Form Modal Logic ---
    if (invoiceFormModal) {
        const form = document.getElementById('invoice-form');
        const lineItemsContainer = document.getElementById('invoice-line-items-container');
        
        document.getElementById('invoice-form-modal-close').onclick = () => invoiceFormModal.style.display = 'none';
        document.getElementById('add-line-item-btn').onclick = () => addLineItem();

        form.addEventListener('submit', e => {
            e.preventDefault();
            const invoiceData = {
                id: `INV-${Date.now()}`,
                clientName: document.getElementById('invoice-form-client-name').value,
                clientEmail: document.getElementById('invoice-form-client-email').value,
                date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
                items: [],
                total: 0,
                status: 'Draft',
                // embed brand/settings snapshot so public invoice shows correct branding
                brandName: localStorage.getItem('settings_brandName') || (JSON.parse(localStorage.getItem('papsPhotographySettings')||'{}').business || {}).brandName || 'Paps Photography',
                brandLogo: localStorage.getItem('settings_brandLogo') || (JSON.parse(localStorage.getItem('papsPhotographySettings')||'{}').business || {}).brandLogo || '',
                brandWebsite: (JSON.parse(localStorage.getItem('papsPhotographySettings')||'{}').personal || {}).website || '',
                brandContact: (JSON.parse(localStorage.getItem('papsPhotographySettings')||'{}').personal || {}).email || ''
            };

            lineItemsContainer.querySelectorAll('.line-item-row').forEach(row => {
                const description = row.querySelector('.item-description').value;
                const amount = parseFloat(row.querySelector('.item-amount').value);
                if (description && !isNaN(amount)) {
                    invoiceData.items.push({ description, amount });
                }
            });

            invoiceData.total = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);

            // Persist the draft invoice locally
            const all = getInvoicesData();
            all.push(invoiceData);
            saveInvoicesData(all);
            invoiceFormModal.style.display = 'none';

            // Render the invoice directly into the admin modal
            const previewModal = document.getElementById('invoice-preview-modal');
            const previewContainer = document.getElementById('invoice-preview-container');
            if (previewContainer && previewModal) {
                renderInvoicePreview(invoiceData, previewContainer);
                previewModal.style.display = 'flex';
            } else {
                console.warn('Invoice preview modal or container not found');
                alert('Invoice saved — preview unavailable (modal missing).');
            }
        });

        lineItemsContainer.addEventListener('input', updateInvoiceTotal);
        lineItemsContainer.addEventListener('click', e => {
            if (e.target.classList.contains('remove-line-item-btn')) {
                e.target.closest('.line-item-row').remove();
                updateInvoiceTotal();
            }
        });
    }

    // Invoice preview modal handlers
    const invoicePreviewModal = document.getElementById('invoice-preview-modal');
        if (invoicePreviewModal) {
                document.getElementById('invoice-preview-modal-close').onclick = () => {
                        const container = document.getElementById('invoice-preview-container');
                        if (container) container.innerHTML = '';
                        invoicePreviewModal.style.display = 'none';
                };
        }

        // Helper to render invoice markup into a container (uses same structure as invoice.html)
        function renderInvoicePreview(inv, container) {
                const escape = s => (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                const itemsHtml = (inv.items||[]).map(it=>{
                        const qty = it.quantity||1;
                        const unit = Number(it.unitPrice||it.amount||0).toFixed(2);
                        const discount = it.discount?escape(it.discount)+'%':'—';
                        const total = (qty * (Number(it.unitPrice||it.amount||0)) * (1 - (Number(it.discount||0)/100)) ).toFixed(2);
                        return `<tr><td>${escape(it.name||it.description||'')}</td><td>${escape(it.description||'')}</td><td>${qty}</td><td>GH₵ ${unit}</td><td>${discount}</td><td>GH₵ ${Number(total).toLocaleString()}</td></tr>`;
                }).join('');

                const subtotal = (inv.items||[]).reduce((s,it)=> s + ((it.quantity||1) * Number(it.unitPrice||it.amount||0)),0);
                const totalDiscount = (inv.items||[]).reduce((s,it)=> s + ((it.quantity||1) * Number(it.unitPrice||it.amount||0) * (Number(it.discount||0)/100)),0);
                const tax = inv.taxPercent ? ((subtotal - totalDiscount) * (Number(inv.taxPercent)/100)) : 0;
                const grand = subtotal - totalDiscount + tax;
                const amountPaid = Number(inv.amountPaid||0);
                const balance = Math.max(grand - amountPaid,0);

                const brandLogo = inv.brandLogo || localStorage.getItem('settings_brandLogo') || '';
                const brandName = inv.brandName || localStorage.getItem('settings_brandName') || 'Paps Photography';
                const brandWebsite = inv.brandWebsite || (JSON.parse(localStorage.getItem('papsPhotographySettings')||'{}').personal || {}).website || '';
                const brandContact = inv.brandContact || (JSON.parse(localStorage.getItem('papsPhotographySettings')||'{}').personal || {}).email || '';

                container.innerHTML = `
                        <article class="invoice-card">
                            <header class="inv-header">
                                <div class="brand">
                                    <img src="${brandLogo}" alt="Logo" class="brand-logo">
                                    <div class="brand-info">
                                        <h1 id="brand-name">${escape(brandName)}</h1>
                                        <div id="brand-contact">${escape(brandContact)}</div>
                                        <a id="brand-website" href="${escape(brandWebsite)}">${escape(brandWebsite)}</a>
                                    </div>
                                </div>
                                <div class="invoice-meta">
                                    <h2>INVOICE</h2>
                                    <div class="meta-row"><span>Invoice</span><strong>${escape(inv.id)}</strong></div>
                                    <div class="meta-row"><span>Issued</span><span>${escape(inv.date||'')}</span></div>
                                    <div class="meta-row"><span>Due</span><span>${escape(inv.dueDate||'')}</span></div>
                                    <div class="status-badge" id="invoice-status">${escape(inv.status||'Pending')}</div>
                                </div>
                            </header>
                            <section class="to-from" style="margin-top:18px;padding:0 28px 18px 28px;">
                                <div class="from"><h3>From</h3><p>${escape(brandName)}</p><p>${escape(brandContact)}</p></div>
                                <div class="to"><h3>Bill To</h3><p>${escape(inv.clientName||'Client')}</p><p>${escape(inv.clientEmail||'')}</p></div>
                            </section>
                            <section class="items" style="padding:0 28px;">
                                <table class="items-table"><thead><tr><th>Service</th><th>Description</th><th>Qty</th><th>Unit</th><th>Discount</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
                            </section>
                            <section class="totals" style="padding:18px 28px 28px 28px;">
                                <div class="totals-left"><h4>Notes / Terms</h4><div>${escape(inv.terms||'')}</div></div>
                                <div class="totals-right">
                                    <div class="tot-row"><span>Subtotal</span><span>GH₵ ${Number((subtotal - totalDiscount)).toFixed(2)}</span></div>
                                    <div class="tot-row"><span>Discount</span><span>GH₵ ${Number(totalDiscount).toFixed(2)}</span></div>
                                    <div class="tot-row"><span>Tax</span><span>GH₵ ${Number(tax).toFixed(2)}</span></div>
                                    <div class="tot-row"><span>Amount Paid</span><span>GH₵ ${Number(amountPaid).toFixed(2)}</span></div>
                                    <div class="grand-total"><span>Balance Due</span><strong>GH₵ ${Number(balance).toFixed(2)}</strong></div>
                                    <div class="grand-total"><span>Grand Total</span><strong>GH₵ ${Number(grand).toFixed(2)}</strong></div>
                                </div>
                            </section>
                            <section class="actions" style="padding:18px 28px 28px 28px;">
                                <button class="btn-primary" id="preview-pay-now">Pay Now</button>
                                <button class="btn-secondary" id="preview-download">Download PDF</button>
                                <button class="btn-secondary" id="preview-print">Print</button>
                                <a class="link-secondary" href="mailto:${escape(brandContact)}">Contact Photographer</a>
                            </section>
                        </article>
                `;

                // wire actions inside preview
                const payBtn = container.querySelector('#preview-pay-now');
                if (payBtn) payBtn.onclick = () => { if (inv.paymentUrl) window.open(inv.paymentUrl,'_blank'); else alert('No payment gateway configured.'); };
                const printBtn = container.querySelector('#preview-print');
                if (printBtn) printBtn.onclick = () => { window.print(); };
                const dlBtn = container.querySelector('#preview-download');
                if (dlBtn) dlBtn.onclick = () => { window.print(); };
        }

    function openInvoiceFormModal(config) {
        document.getElementById('invoice-form').reset();
        document.getElementById('invoice-line-items-container').innerHTML = '';
        addLineItem(); // Start with one item
        updateInvoiceTotal();
        invoiceFormModal.style.display = 'flex';
    }

    function addLineItem(item = { description: '', amount: '' }) {
        const row = document.createElement('div');
        row.className = 'line-item-row';
        row.innerHTML = `
            <input type="text" class="item-description" placeholder="Service Description" value="${item.description}" required>
            <input type="number" class="item-amount" placeholder="Amount" value="${item.amount}" required>
            <button type="button" class="btn-danger remove-line-item-btn">&times;</button>
        `;
        document.getElementById('invoice-line-items-container').appendChild(row);
    }

    function updateInvoiceTotal() {
        let total = 0;
        document.querySelectorAll('#invoice-line-items-container .line-item-row').forEach(row => {
            const amount = parseFloat(row.querySelector('.item-amount').value);
            if (!isNaN(amount)) total += amount;
        });
        document.getElementById('invoice-form-total').textContent = `GH₵ ${total.toFixed(2)}`;
    }

    // Global click to close dropdowns
    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
    });

    hydrateAdminData().then(() => loadPageContent('overview')); // Load persisted data before the default page
});