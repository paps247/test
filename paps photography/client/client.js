
const showBookingBtn = document.getElementById('show-booking');
const bookingInterface = document.getElementById('booking-interface');
const categoryHeaders = document.querySelectorAll('.category-header');

showBookingBtn.addEventListener('click', () => {
    bookingInterface.style.display = 'block';
    showBookingBtn.style.display = 'none';
});

categoryHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const details = header.nextElementSibling;
        details.style.display = details.style.display === 'block' ? 'none' : 'block';
    });
});
