
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    // --- TIME SLOT MANAGEMENT ---
    const availabilityGrid = document.querySelector('.availability-grid');

    if (availabilityGrid) {
        availabilityGrid.addEventListener('click', (e) => {
            // Add a new time slot
            if (e.target.classList.contains('add-slot-btn')) {
                const slotsContainer = e.target.closest('.day-container').querySelector('.time-slots');
                slotsContainer.appendChild(createTimeSlotElement());
            }
            // Remove a time slot
            if (e.target.classList.contains('remove-slot-btn')) {
                const timeSlot = e.target.closest('.time-slot');
                timeSlot.remove();
            }
        });

        // Enable/disable time slots based on toggle
        availabilityGrid.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const dayContainer = e.target.closest('.day-container');
                const timeSlotsDiv = dayContainer.querySelector('.time-slots');
                const isChecked = e.target.checked;
                
                // Disable or enable all inputs within the time slots
                timeSlotsDiv.querySelectorAll('input').forEach(input => {
                    input.disabled = !isChecked;
                });

                // Also toggle the 'add slot' button
                dayContainer.querySelector('.add-slot-btn').disabled = !isChecked;
            }
        });
    }

    /**
     * Creates a new time slot input group.
     * @returns {HTMLElement} The time slot element.
     */
    function createTimeSlotElement() {
        const div = document.createElement('div');
        div.className = 'time-slot';
        div.innerHTML = `
            <input type="time" class="time-from">
            <span>-</span>
            <input type="time" class="time-to">
            <button type="button" class="remove-slot-btn" aria-label="Remove time slot">&times;</button>
        `;
        return div;
    }

    // --- IMAGE PREVIEW ---
    const profilePicInput = document.getElementById('profile-picture-upload');
    const profilePicPreview = document.getElementById('profile-picture-preview');
    const brandLogoInput = document.getElementById('brand-logo-upload');
    const brandLogoPreview = document.getElementById('brand-logo-preview');

    async function loadSavedSettings() {
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

            const profileImage = profilePicPreview?.querySelector('img');
            const logoImage = brandLogoPreview?.querySelector('img');
            if (profileImage && personal.profilePic) profileImage.src = personal.profilePic;
            if (logoImage && business.brandLogo) logoImage.src = business.brandLogo;
            localStorage.setItem('papsPhotographySettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Could not load saved settings from backend:', error);
        }
    }

    void loadSavedSettings();

    if (profilePicInput && profilePicPreview) {
        profilePicInput.addEventListener('change', () => {
            displayImagePreview(profilePicInput, profilePicPreview.querySelector('img'));
        });
    }

    if (brandLogoInput && brandLogoPreview) {
        brandLogoInput.addEventListener('change', () => {
            displayImagePreview(brandLogoInput, brandLogoPreview.querySelector('img'));
        });
    }
    
    /**
     * Reads an image file from an input and displays it in an <img> tag.
     * @param {HTMLInputElement} input - The file input element.
     * @param {HTMLImageElement} previewImg - The img element for the preview.
     */
    function displayImagePreview(input, previewImg) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // --- FORM SUBMISSION ---
    const settingsForm = document.getElementById('settings-form');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');

    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', async () => {
            if (!window.confirm('Reset all settings to the default values?')) return;

            resetSettingsBtn.disabled = true;
            try {
                const response = await fetch(`${API_BASE}/api/settings/reset`, {
                    method: 'POST',
                    credentials: 'include'
                });
                if (!response.ok) throw new Error(`Server returned ${response.status}`);

                const settings = await response.json();
                localStorage.setItem('papsPhotographySettings', JSON.stringify(settings));
                localStorage.setItem('settings_brandName', settings.business?.brandName || '');
                localStorage.setItem('settings_brandLogo', settings.business?.brandLogo || '');
                localStorage.setItem('settings_profilePic', settings.personal?.profilePic || '');
                window.alert('Settings have been reset. The client console will use the default values.');
                window.location.reload();
            } catch (error) {
                console.error('Failed to reset settings:', error);
                window.alert('Settings could not be reset. Please try again.');
                resetSettingsBtn.disabled = false;
            }
        });
    }

    // --- ADMIN ACCOUNT & SECURITY ---
    const accountSecurityForm = document.getElementById('account-security-form');
    const accountMessage = document.getElementById('account-message');

    // Load the current admin username into the account form
    async function loadAdminUser() {
        try {
            const response = await fetch(`${API_BASE}/api/admin/user`, { credentials: 'include' });
            if (!response.ok) return;
            const data = await response.json();
            const currentUsernameInput = document.getElementById('admin-current-username');
            const newUsernameInput = document.getElementById('admin-new-username');
            if (currentUsernameInput) currentUsernameInput.value = data.username || '';
            if (newUsernameInput) newUsernameInput.value = data.username || '';
        } catch (error) {
            console.warn('Could not load admin user:', error);
        }
    }

    if (accountSecurityForm) {
        accountSecurityForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newUsername = document.getElementById('admin-new-username').value.trim();
            const currentPassword = document.getElementById('admin-current-password').value;
            const newPassword = document.getElementById('admin-new-password').value;
            const confirmPassword = document.getElementById('admin-confirm-password').value;

            if (!newUsername) {
                accountMessage.textContent = 'Username cannot be empty.';
                accountMessage.className = 'account-message account-message-error';
                return;
            }
            if (newPassword && newPassword !== confirmPassword) {
                accountMessage.textContent = 'New passwords do not match.';
                accountMessage.className = 'account-message account-message-error';
                return;
            }
            if (newPassword && newPassword.length < 4) {
                accountMessage.textContent = 'New password must be at least 4 characters.';
                accountMessage.className = 'account-message account-message-error';
                return;
            }

            accountMessage.textContent = 'Updating...';
            accountMessage.className = 'account-message';

            try {
                const response = await fetch(`${API_BASE}/api/admin/user`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        currentPassword,
                        newUsername,
                        newPassword
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('adminUsername', data.username || newUsername);
                    document.getElementById('admin-current-username').value = data.username || newUsername;
                    document.getElementById('admin-new-username').value = data.username || newUsername;
                    document.getElementById('admin-current-password').value = '';
                    document.getElementById('admin-new-password').value = '';
                    document.getElementById('admin-confirm-password').value = '';
                    accountMessage.textContent = 'Login details updated successfully.';
                    accountMessage.className = 'account-message account-message-success';
                } else {
                    accountMessage.textContent = data.error || 'Could not update login details.';
                    accountMessage.className = 'account-message account-message-error';
                }
            } catch (error) {
                console.error('Failed to update admin credentials:', error);
                accountMessage.textContent = 'Could not reach the server. Please try again.';
                accountMessage.className = 'account-message account-message-error';
            }
        });
    }

    // --- RESET ALL DATA (DANGER ZONE) ---
    const resetAllDataBtn = document.getElementById('reset-all-data-btn');
    const resetAllMessage = document.getElementById('reset-all-message');

    if (resetAllDataBtn) {
        resetAllDataBtn.addEventListener('click', async () => {
            const confirmed = window.confirm(
                'WARNING: This will permanently delete ALL data (bookings, portfolio projects, messages, invoices, finance records, calendar events) and restore factory-default settings. This cannot be undone. Continue?'
            );
            if (!confirmed) return;

            resetAllDataBtn.disabled = true;
            resetAllMessage.textContent = 'Resetting all data...';
            resetAllMessage.className = 'account-message';

            try {
                const response = await fetch(`${API_BASE}/api/data/reset`, {
                    method: 'POST',
                    credentials: 'include'
                });
                if (!response.ok) throw new Error(`Server returned ${response.status}`);

                const data = await response.json();

                // Clear all locally cached data so the next load picks up fresh defaults
                ['papsBookings', 'papsClientMessages', 'papsInvoices', 'papsFinanceEntries',
                 'papsCalendarEvents', 'papsPhotographySettings', 'papsReviews',
                 'settings_brandName', 'settings_brandLogo', 'settings_profilePic'
                ].forEach(key => localStorage.removeItem(key));

                const settings = data.settings || {};
                localStorage.setItem('papsPhotographySettings', JSON.stringify(settings));

                resetAllMessage.textContent = data.message || 'All data has been reset to factory defaults.';
                resetAllMessage.className = 'account-message account-message-success';
                window.alert('All data has been reset. The page will now reload.');
                window.location.reload();
            } catch (error) {
                console.error('Failed to reset all data:', error);
                resetAllMessage.textContent = 'Could not reset all data. Please try again.';
                resetAllMessage.className = 'account-message account-message-error';
                resetAllDataBtn.disabled = false;
            }
        });
    }

    loadAdminUser();

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(settingsForm);

            // Handle file to Base64 conversion
            const profilePicFile = profilePicInput ? profilePicInput.files[0] : null;
            const brandLogoFile = brandLogoInput ? brandLogoInput.files[0] : null;

            const profilePicBase64 = profilePicFile ? await toBase64(profilePicFile) : null;
            const brandLogoBase64 = brandLogoFile ? await toBase64(brandLogoFile) : null;

            const existingSettings = JSON.parse(localStorage.getItem('papsPhotographySettings') || '{}');

            const settingsData = {
                ...existingSettings,
                personal: {
                    ...(existingSettings.personal || {}),
                    name: formData.get('full-name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    website: formData.get('website'),
                    socials: {
                        ...(existingSettings.personal?.socials || {}),
                        instagram: formData.get('instagram'),
                        twitter: formData.get('twitter'),
                        facebook: formData.get('facebook'),
                    },
                    profilePic: profilePicBase64 || localStorage.getItem('settings_profilePic') || (existingSettings.personal?.profilePic || ''),
                },
                business: {
                    ...(existingSettings.business || {}),
                    brandName: formData.get('brand-name'),
                    tagline: formData.get('brand-tagline'),
                    aboutUs: formData.get('about-us'),
                    brandLogo: brandLogoBase64 || localStorage.getItem('settings_brandLogo') || (existingSettings.business?.brandLogo || ''),
                },
                availability: getAvailabilityData(),
            };

            // Save all settings to localStorage without losing the rate card or cover photos
            localStorage.setItem('papsPhotographySettings', JSON.stringify(settingsData));
            
            // For simplicity, also saving logo and name separately for easy access
            if (settingsData.business.brandName) {
                localStorage.setItem('settings_brandName', settingsData.business.brandName);
            }
            if (brandLogoBase64) {
                localStorage.setItem('settings_brandLogo', brandLogoBase64);
            }
             if (profilePicBase64) {
                localStorage.setItem('settings_profilePic', profilePicBase64);
            }

            try {
                const response = await fetch(`${API_BASE}/api/settings`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(settingsData)
                });

                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }

                const serverSettings = await response.json();

                localStorage.setItem('papsPhotographySettings', JSON.stringify(serverSettings));
                if (serverSettings.business?.brandName) {
                    localStorage.setItem('settings_brandName', serverSettings.business.brandName);
                }
                if (serverSettings.business?.brandLogo) {
                    localStorage.setItem('settings_brandLogo', serverSettings.business.brandLogo);
                }
                if (serverSettings.personal?.profilePic) {
                    localStorage.setItem('settings_profilePic', serverSettings.personal.profilePic);
                }

                console.log('Saved settings to backend:', serverSettings);
                alert('Settings have been saved to the backend and localStorage.');
                return;
            } catch (error) {
                console.error('Failed to save settings to backend:', error);
                alert('Settings were saved locally, but the backend sync failed.');
            }


            console.log('Collected Settings Data:', settingsData);
            alert('Settings have been saved to localStorage.');
        });
    }

    /**
     * Converts a file to a Base64 encoded string.
     * @param {File} file - The file to convert.
     * @returns {Promise<string>} A promise that resolves with the Base64 string.
     */
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

     /**
     * Gathers availability data from the form.
     * @returns {Object} Availability data structured by day.
     */
    function getAvailabilityData() {
        const availability = {};
        const dayElements = document.querySelectorAll('.day-container');
        dayElements.forEach(dayEl => {
            const dayName = dayEl.dataset.day;
            const isAvailable = dayEl.querySelector('.availability-toggle').checked;
            const slots = [];
            if (isAvailable) {
                dayEl.querySelectorAll('.time-slot').forEach(slotEl => {
                    const from = slotEl.querySelector('.time-from').value;
                    const to = slotEl.querySelector('.time-to').value;
                    if (from && to) {
                        slots.push({ from, to });
                    }
                });
            }
            availability[dayName] = {
                isAvailable,
                slots
            };
        });
        return availability;
    }
});
