document.addEventListener('DOMContentLoaded', (event) => {
    const titleElement = document.getElementById('sidebarLabel');
    titleElement.addEventListener('click', () => {
        window.location.href = '/easterEgg';
    });
});

