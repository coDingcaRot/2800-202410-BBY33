window.onload = function () {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('projectId')) {
        const selectedProjectId = searchParams.get('projectId');
        fetchAndShowTasksData(selectedProjectId);
    }
};

// listen to the top navbar dropdown menu and show project name on it
const projectListDiv = document.getElementById('projectListDropdown');
projectListDiv.addEventListener('change', function (event) {
    if (event.target.matches('input[name="listGroupRadios"]')) {
        const selectedProjectId = event.target.value;
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', selectedProjectId);
        history.pushState(null, '', url);
        console.log(url);

        // Fetch project name and update navbar brand
        fetch(`/getProjectName?projectId=${selectedProjectId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(project => {
                const navbarBrand = document.getElementById('navbarDropdown');
                if (project && project.projectName) {
                    navbarBrand.textContent = project.projectName;
                } else {
                    throw new Error('Project data not found');
                }
            })
            .catch(error => {
                console.error('Error fetching project data:', error);
            });

        // Fetch tasks and update calendar
        console.log(selectedProjectId);
        fetchAndShowTasksData(selectedProjectId);

    };
});

document.addEventListener('DOMContentLoaded', function () {
    // task form pop up after clicking the plus button on task page
    var addTaskButton = document.getElementById('add-task-btn');
    var taskForm = document.getElementById('task-form');
    var cancelBtn = document.getElementById('taskform-close-btn');
    var hiddenProjectIdInput = document.getElementById('taskform-project-id');
    var addMemberModal = document.getElementById('add-member-modal');
    var memberListDiv = document.getElementById('taskform-member-list');

    addTaskButton.addEventListener('click', function () {
        // Show the task form
        taskForm.classList.add('show');

        // Get the projectId from the URL query parameters
        var urlParams = new URLSearchParams(window.location.search);
        var projectId = urlParams.get('projectId');

        // Set the projectId as the value of the hidden input field
        hiddenProjectIdInput.value = projectId;
    });

    cancelBtn.addEventListener('click', function () {
        // Hide the task form
        taskForm.classList.remove('show');
        // Hide the add-member-modal
        addMemberModal.classList.remove('show');
        addMemberModal.style.display = 'none';
        // Clear the member list div
        memberListDiv.innerHTML = '';
    });

    // Calendar functions
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { // buttons for switching between views
            left: 'dayGridMonth,timeGridWeek',
            center: 'title',
            right: 'today prev,next'
        },
        views: {
            dayGridMonth: { // name of view
                titleFormat: { year: 'numeric', month: 'long' }
                // other view-specific options here
            }
        },

        eventClick: function (info) {
            var taskId = info.event._def.publicId;
            var myModal = new bootstrap.Modal(document.getElementById("deleteDivTask"));
            myModal.show();
            $('.cancelAction').on('click', function (e) {
                console.log("cancel");
                location.href = location.href;
            });
            $('#confirmDeleteTask').on('click', function (e) {
                e.preventDefault();
                $.ajax({
                    url: `/deleteTask/${taskId}`,
                    type: 'DELETE',
                    success: function () {
                        console.log("Deleted");
                        location.href = location.href;
                    }
                });
            });
        }
    });
    calendar.render();

});

// when reloading the page, show data on screen according to the URL query
function fetchAndShowTasksData(projectId) {
    Promise.all([
        fetch(`/getProjectTasks?projectId=${projectId}`).then(response => response.json()),
        fetch(`/getProjectName?projectId=${projectId}`).then(response => response.json()),
        console.log("test"),
    ])
        .then(([tasksData]) => {
            submit(tasksData, projectId);
        })
        .catch(error => console.error('Error fetching project data:', error));
}

function submit(tasksData, projectId) {
    //Settings variables of new task
    // Calendar functions
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { // buttons for switching between views
            left: 'dayGridMonth,timeGridWeek',
            center: 'title',
            right: 'today prev,next'
        },
        views: {
            dayGridMonth: { // name of view
                titleFormat: { year: 'numeric', month: 'long' }
                // other view-specific options here
            }
        },

        eventClick: function (info) {
            var taskId = info.event._def.publicId;
            var myModal = new bootstrap.Modal(document.getElementById("deleteDivTask"));
            myModal.show();
            $('.cancelAction').on('click', function (e) {
                console.log("cancel");
                location.href = location.href;
            });
            $('#confirmDeleteTask').on('click', function (e) {
                e.preventDefault();
                $.ajax({
                    url: `/deleteTask/${taskId}`,
                    type: 'DELETE',
                    success: function () {
                        console.log("Deleted");
                        location.href = location.href;
                    }
                });
            });
        }
    });

    for (var i = 0; i < tasksData.length; i++) {
        // var id = tasksData[i]._id;
        // var title = tasksData[i].title;
        console.log(title);
        let convertedTimeDate = convertToUserTimezone(tasksData[i]);

        convertedTimeDate.then(function (value) {
            let id = value.id;
            let title = value.title;
            let start = value.start;
            let end = value.end;
            calendar.addEvent({
                id: id,
                title: title,
                start: start,
                end: end,
                allDay: false
            })
        });
    }
    calendar.render();
}

// pop up add-member-modal after clicking plus button, adding selected members to taskform 
document.addEventListener('DOMContentLoaded', async function () {
    // to open the assign-to-members modal
    const addMemberBtn = document.getElementById('add-member-btn');
    const addMemberModal = document.getElementById('add-member-modal');
    // search bar inside assign-to-members modal 
    const searchBar = document.getElementById('member-search-filter');
    const memberListWrap = document.querySelector('.member-list-wrap');
    // get the project-id from the taskform
    const projectIdInput = document.getElementById('taskform-project-id');
    // after selecting members-to-assign add button
    const modalAddMemberButton = document.getElementById('modal-add-member-btn');
    // the div that insert the selected members in taskform
    const memberListDiv = document.getElementById('taskform-member-list');

    addMemberBtn.addEventListener('click', async function () {
        addMemberModal.classList.add('show');
        addMemberModal.style.display = 'block';
    });

    searchBar.addEventListener('click', async function (event) {
        // get all the members under specific project group
        try {
            const projectId = projectIdInput.value.trim();
            const response = await fetch(`/getProjectMembers?projectId=${projectId}`);
            if (response.ok) {
                const memberData = await response.json();

                renderMemberList(memberData);
            } else {
                console.error('Failed to fetch member data');
            }
        } catch (error) {
            console.error('Error fetching member data:', error);
        }
    });

    searchBar.addEventListener('input', async function (event) {
        // get the value from input of search bar convert to lower case
        const searchTerm = event.target.value.trim().toLowerCase();

        try {
            const projectId = projectIdInput.value.trim();
            const response = await fetch(`/getProjectMembers?projectId=${projectId}`);
            if (response.ok) {
                const memberData = await response.json();

                // filter matching members of list from the input
                const filteredMembers = memberData.filter(member => {
                    return member.username.toLowerCase().includes(searchTerm);
                });

                // filter rendered member list
                renderMemberList(filteredMembers);
            } else {
                console.error('Failed to fetch member data');
            }
        } catch (error) {
            console.error('Error fetching member data:', error);
        }
    });

    // render members into list
    function renderMemberList(memberData) {
        memberListWrap.innerHTML = '';

        // iterate through user list and put data into list li
        memberData.forEach(data => {
            const listItem = document.createElement('li');
            listItem.classList.add('member-list-group-item');
            listItem.innerHTML = `
                <label class="form-check-label" for="checkbox-${data._id}">${data.username} <span style="font-size: small">(${data.email})</span></label>
                <input class="form-check-input me-1" type="checkbox" value="${data._id}" id="checkbox-${data._id}">
            `;
            memberListWrap.appendChild(listItem);
        });
    }

    const closeButton = addMemberModal.querySelector('.btn-close');
    closeButton.addEventListener('click', function () {
        addMemberModal.classList.remove('show');
        addMemberModal.style.display = 'none';
        // Clear member list
        memberListWrap.innerHTML = '';
    });

    modalAddMemberButton.addEventListener('click', function () {
        // Clear existing member avatars
        memberListDiv.innerHTML = '';
        // Clear the selected members array
        let selectedMembers = [];
        // Get all checked checkboxes
        const checkboxes = document.querySelectorAll('.form-check-input:checked');
        checkboxes.forEach(checkbox => {
            // Create an avatar for each selected member
            const memberId = checkbox.value;
            selectedMembers.push(memberId); // Add memberId to selectedMembers array
            addMemberAvatar(memberId);
        });

        // Set the value of the hidden input field with the selected members
        const selectedMembersInput = document.getElementById('taskform-selected-member-list');
        selectedMembersInput.value = JSON.stringify(selectedMembers);

        // Close the modal when the button is clicked
        addMemberModal.classList.remove('show');
        addMemberModal.style.display = 'none';
    });

    async function addMemberAvatar(memberId) {
        try {
            const response = await fetch(`/getUserById/${memberId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user by ID');
            }
            const user = await response.json();
            if (user && user.img) {
                // Add the user's image to the member list
                memberListDiv.innerHTML += `<img src="${user.img}" alt="${user.username}" class="task-card-img">`;
            } else {
                // If no image is available, use the user's initial
                memberListDiv.innerHTML += `<div class="task-card-img">${user.username.charAt(0).toUpperCase()}</div>`;
            }
        } catch (error) {
            console.error('Error fetching user by ID:', error);
        }
    }

});

async function convertToUserTimezone(tasksData) {
    const response = await fetch('/getCurrentUserId');
    const data = await response.json();
    const userId = data.userId;
    let tasksOwnerTimezone = tasksData.taskOwner.timezone;
    for (taskMember of tasksData.taskMembers) {
        if (taskMember._id === userId) {
            memberTimezone = taskMember.timezone;
        }
    }

    let DateTime = luxon.DateTime;

    try {
        // if current user has the same time zone as task owner return original data
        if (memberTimezone === tasksOwnerTimezone) {
            console.log("No timezone conversion needed.");
            console.log("no convert:", tasksData.dueDate);
            // Convert start date time to user timezone
            const startDateTime = DateTime.fromISO(combineDateTime(tasksData.startDate, tasksData.startTime), { zone: tasksOwnerTimezone }).setZone(memberTimezone);

            // Convert due date time to user timezone
            const dueDateTime = DateTime.fromISO(combineDateTime(tasksData.dueDate, tasksData.dueTime), { zone: tasksOwnerTimezone }).setZone(memberTimezone);

            let start = startDateTime.toFormat("yyyy-MM-dd'T'HH:mm");
            let end = dueDateTime.toFormat("yyyy-MM-dd'T'HH:mm");

            return {
                id: tasksData._id,
                title: tasksData.title,
                start: start,
                end: end
            };
        }

        function combineDateTime(dateStr, timeStr) {
            const combinedDateTime = dateStr.replace(/Z$/, '').replace('T00:00', 'T' + timeStr);
            return combinedDateTime;
        }

        // Convert start date time to user timezone
        const startDateTime = DateTime.fromISO(combineDateTime(tasksData.startDate, tasksData.startTime), { zone: tasksOwnerTimezone }).setZone(memberTimezone);

        // Convert due date time to user timezone
        const dueDateTime = DateTime.fromISO(combineDateTime(tasksData.dueDate, tasksData.dueTime), { zone: tasksOwnerTimezone }).setZone(memberTimezone);

        let start = startDateTime.toFormat("yyyy-MM-dd'T'HH:mm");
        let end = dueDateTime.toFormat("yyyy-MM-dd'T'HH:mm");

        return {
            id: tasksData._id,
            title: tasksData.title,
            start: start,
            end: end
        };
    } catch (error) {
        console.error('Error converting to user timezone:', error);
        throw new Error('Error converting to user timezone');
    }
};