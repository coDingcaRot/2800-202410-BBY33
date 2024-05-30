document.addEventListener('DOMContentLoaded', function () {
    // Check if the modal has been shown before by looking for 'modalShown' in sessionStorage
    if (!sessionStorage.getItem('modalShown')) {

        // Get the user's local time based on their timezone
        const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });
        document.getElementById('local-time').textContent = localTime;

        //Create and show modal
        const userInfoModal = new bootstrap.Modal(document.getElementById('user-info-modal'));
        userInfoModal.show();
        
        // Set 'modalShown' in sessionStorage to prevent the modal from showing again
        sessionStorage.setItem('modalShown', 'true');
    } else {
        console.log("Modal has been shown before");
    }
});
