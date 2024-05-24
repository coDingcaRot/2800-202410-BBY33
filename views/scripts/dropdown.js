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
    })
    .catch(error => console.error('Error fetching project names:', error));