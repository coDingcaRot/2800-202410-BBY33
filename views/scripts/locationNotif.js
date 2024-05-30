document.addEventListener('DOMContentLoaded', function () {

    // Get the user's local time based on their timezone
    const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });
    document.getElementById('local-time').textContent = localTime;

    //Create and show modal
    const userInfoModal = new bootstrap.Modal(document.getElementById('user-info-modal'));
    userInfoModal.show();
      
});
