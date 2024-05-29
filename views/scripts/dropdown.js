/**** INITIAL DROP DPOWN CODE ****/
// fetch('/getUserProjectList')
//     .then(response => response.json())
//     .then(data => {
//         const projectListDiv = document.getElementById('projectListDropdown');
//         projectListDiv.innerHTML = '';

//         data.forEach(project => {
//             console.log(project);
//             const listItem = document.createElement('li');
//             listItem.innerHTML = `
//                 <label class="list-group-item d-flex gap-2">
//                     <input class="form-check-input flex-shrink-0" type="radio" name="listGroupRadios" id="${project.id}" value="${project.id}">
//                     <span>${project.name}</span>
//                 </label>`;
//             projectListDiv.appendChild(listItem);
//         });
//     })
//     .catch(error => console.error('Error fetching project names:', error));=

document.addEventListener('DOMContentLoaded', () => {
    // Function to get query parameter by name
    function getQueryParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Function to update the footer links based on the stored project ID
    function updateFooterLinks() {
        const projectId = localStorage.getItem('selectedProjectId') || 'default';
        document.getElementById('taskLink').href = `/taskPage?projectId=${projectId}`;
        document.getElementById('calendarLink').href = `/calendarPage?projectId=${projectId}`;
        document.getElementById('timelineLink').href = `/timelinePage?projectId=${projectId}`;
    }

    // Check if there's a projectId in the URL and set it in localStorage
    const initialProjectId = getQueryParameter('projectId');
    if (initialProjectId) {
        localStorage.setItem('selectedProjectId', initialProjectId);
    }

    // Call the function to set the links on page load
    updateFooterLinks();

    // Fetch project list and handle project selection
    fetch('/getUserProjectList')
        .then(response => response.json())
        .then(data => {
            const projectListDiv = document.getElementById('projectListDropdown');
            projectListDiv.innerHTML = '';

            data.forEach(project => {
                console.log(project);
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <label class="list-group-item d-flex gap-2">
                        <input class="form-check-input flex-shrink-0" type="radio" name="listGroupRadios" id="${project.id}" value="${project.id}">
                        <span>${project.name}</span>
                    </label>`;
                projectListDiv.appendChild(listItem);
            });

            // Add event listener to update selected project ID
            document.querySelectorAll('input[name="listGroupRadios"]').forEach(radio => {
                radio.addEventListener('change', (event) => {
                    const selectedProjectId = event.target.value;
                    localStorage.setItem('selectedProjectId', selectedProjectId);
                    updateFooterLinks();
                });
            });
        })
        .catch(error => console.error('Error fetching project names:', error));
});