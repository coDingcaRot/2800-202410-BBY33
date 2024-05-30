// when reloading the page, show data on screen according to the URL query
function fetchAndShowTasksData(projectId) {
    Promise.all([
        fetch(`/getProjectTasks?projectId=${projectId}`).then(response => response.json()),
        fetch(`/getProjectName?projectId=${projectId}`).then(response => response.json())
    ])
    .then(([tasksData, project]) => {
        showTodo(tasksData, 'all'); // Default to 'all' tab when loading tasks
        const navbarBrand = document.getElementById('navbarDropdown');
        if (project && project.projectName) {
            navbarBrand.textContent = project.projectName;
        }
    })
    .catch(error => console.error('Error fetching project data:', error));
}

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (projectId) {
        fetchAndShowTasksData(projectId);
    }
});

const projectListDiv = document.getElementById('projectListDropdown');
projectListDiv.addEventListener('change', function(event) {
    if (event.target.matches('input[name="listGroupRadios"]')) {
        const selectedProjectId = event.target.value;
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', selectedProjectId);
        history.pushState(null, '', url);
        fetchAndShowTasksData(selectedProjectId); 
    }
});


// base object in luxon
let DateTime = luxon.DateTime;

// format the time
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);

    const hour12 = (hours > 12) ? hours - 12 : hours;
    const period = (hours >= 12) ? 'PM' : 'AM';

    const formattedTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;

    return formattedTime;
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthAbbreviation = months[parseInt(month) - 1];
    return `${monthAbbreviation} ${parseInt(day)}, ${year}`;
}

function combineDateTime(dateStr, timeStr) {
    const combinedDateTime = dateStr.replace(/Z$/, '').replace('T00:00', 'T' + timeStr);
    return combinedDateTime;
}

async function convertToUserTimezone(todo) {
    try {
        const response = await fetch('/getCurrentUserId');
        const data = await response.json();
        const userId = data.userId;

        const member = todo.taskMembers.find(member => member._id.toString() === userId);
        if (!member) {
            throw new Error('Member not found in taskMembers');
        }

        const memberTimezone = member.timezone;
        const taskOwnerTimezone = todo.taskOwner.timezone;

        // if current user has the same time zone as task owner return original data
        if (memberTimezone === taskOwnerTimezone) {
            console.log("No timezone conversion needed.");
            console.log("no convert:",todo.dueDate);
            return {
                startDate: formatDate(todo.startDate),
                startTime: formatTime(todo.startTime),
                dueDate: formatDate(todo.dueDate),
                dueTime: formatTime(todo.dueTime)
            };
        }

        // Convert start date time to user timezone
        const startDateTime = DateTime.fromISO(combineDateTime(todo.startDate, todo.startTime), { zone: taskOwnerTimezone }).setZone(memberTimezone);

        // Convert due date time to user timezone
        const dueDateTime = DateTime.fromISO(combineDateTime(todo.dueDate, todo.dueTime), { zone: taskOwnerTimezone }).setZone(memberTimezone);

        return {
            startDate: formatDate(startDateTime.toISO()),
            startTime: formatTime(startDateTime.toISOTime()),
            dueDate: formatDate(dueDateTime.toISO()),
            dueTime: formatTime(dueDateTime.toISOTime())
        };
    } catch (error) {
        console.error('Error converting to user timezone:', error);
        throw new Error('Error converting to user timezone');
    }
}


async function showTodo(tasksData, tabType) {
    let taskTag = "";
    if (tasksData && tasksData.length > 0) {
        for (const todo of tasksData) {
            const isChecked = localStorage.getItem(todo._id) === "true";
            if (
                (tabType === "all") || 
                (tabType === "pending" && !isChecked) || 
                (tabType === "completed" && isChecked)
            ) {
                let convertedTimeDate = convertToUserTimezone(todo);
                let formatdate = (await convertedTimeDate).dueDate;
                let formattime = (await convertedTimeDate).dueTime;
                let taskstatus = todo.status;
                try {
                    const taskMemberIds = todo.taskMembers.map(member => member._id);
                    const memberAvatarsHTML = await generateMemberAvatars(taskMemberIds);
                    taskTag += `<div class="task-card" id="task-item-${todo._id}">
                                    <div class="task-card-body">
                                        <div class="checkbox-wrapper">
                                        <input style="display: none;" type="checkbox" class="inp-cbx" id="${todo._id}" onchange="handleCheckboxChange('${todo._id}')" ${isChecked ? "checked" : ""}/>
                                            <label for="${todo._id}" class="cbx">
                                                <span>
                                                    <svg viewBox="0 0 12 9" height="9px" width="12px">
                                                    <polyline points="1 5 4 8 11 1"></polyline>
                                                    </svg>
                                                </span>
                                                    <span class="task-card-title">${todo.title}</span>
                                            </label>
                                            <button class="taskcard-delete-btn" id="taskcard-delete-btn">
                                                <svg viewBox="0 0 15 17.5" height="15.5" width="13" xmlns="http://www.w3.org/2000/svg" class="icon">
                                                <path transform="translate(-2.5 -1.25)" d="M15,18.75H5A1.251,1.251,0,0,1,3.75,17.5V5H2.5V3.75h15V5H16.25V17.5A1.251,1.251,0,0,1,15,18.75ZM5,5V17.5H15V5Zm7.5,10H11.25V7.5H12.5V15ZM8.75,15H7.5V7.5H8.75V15ZM12.5,2.5h-5V1.25h5V2.5Z" id="Fill"></path>
                                                </svg>
                                            </button>
                                        </div>
                                        <div class="task-card-member-wrapper">
                                            <div class="task-card-member">
                                                ${memberAvatarsHTML}
                                            </div>
                                        </div>
                                        <hr>
                                        <div class="task-card-due-wrapper">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" class="bi bi-clock" viewBox="0 0 16 16">
                                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
                                            </svg>
                                            <span class="due-date">${formatdate}</span>
                                            <span class="due-time">${formattime}</span>
                                            <span class="task-status">${taskstatus}</span>
                                        </div>
                                    </div>
                                </div>`;
                } catch (error) {
                    console.error('Error generating member avatars:', error);
                }
            }
        }
    }
    const taskBox = document.getElementById('task-card-container');
    taskBox.innerHTML = taskTag || `<span>You don't have any task here</span>`;
    taskBox.offsetHeight >= 300
        ? taskBox.classList.add("overflow")
        : taskBox.classList.remove("overflow");
}

document.addEventListener('DOMContentLoaded', function () {   
    const filters = document.querySelectorAll(".filters span");

    filters.forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelector("span.active").classList.remove("active");
            btn.classList.add("active");
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('projectId'); 
            const tabType = btn.textContent.trim().toLowerCase();
            fetch(`/getProjectTasks?projectId=${projectId}`)
                .then(response => response.json())
                .then(tasksData => showTodo(tasksData, tabType))
                .catch(error => console.error('Error fetching project tasks:', error));
        });
    });
});


// get user's profile picture 
async function generateMemberAvatars(members) {
    let memberAvatarsHTML = '';
    for (const memberId of members) {
        const user = await getUserById(memberId);
        if (user) {
            if (user.img) {
                memberAvatarsHTML += `<img src="${user.image}" alt="${user.username}" class="task-card-img">`;
            } else {
                memberAvatarsHTML += `<div class="task-card-img">${user.username.charAt(0).toUpperCase()}</div>`;
            }
        }
    }
    return memberAvatarsHTML;
}

async function getUserById(userId) {
    try {
        const response = await fetch(`/getUserById/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user by ID');
        }
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        return null;
    }
}


function handleCheckboxChange(taskId) {
    const checkbox = document.getElementById(taskId);
    const isChecked = checkbox.checked;

    // Save checkbox state to local storage
    localStorage.setItem(taskId, isChecked);

    const url = isChecked ? `/updateCompletedMembers/${taskId}` : `/removeUserFromCompletedMembers/${taskId}`;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(isChecked ? 'Failed to update completed members' : 'Failed to remove user from completed members');
        }
        // add other actions if needed
    })
    .catch(error => {
        console.error(`Error ${isChecked ? 'updating' : 'removing'} completed members:`, error);
    });
}

// handle the task-card delete button
document.addEventListener('click', async function(event) {
    if (event.target.matches('.taskcard-delete-btn')) {
        const taskId = event.target.closest('.task-card').id.replace('task-item-', '');
        try {
            const response = await fetch(`/deleteTask/${taskId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                const deletedTask = document.getElementById(`task-item-${taskId}`);
                deletedTask.remove(); 
            } else {
                console.error('Failed to delete task:', response.statusText);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }
});


// task form pop up after clicking the plus button on task page
document.addEventListener('DOMContentLoaded', function () {
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
});

// date time picker shows up after reminder switch is checked and if reminder checked store the datetime to database
document.addEventListener('DOMContentLoaded', function() {
    var reminderCheckbox = document.getElementById('reminder-checkbox');
    var reminderDatetime = document.getElementById('reminder-datetime');

    reminderCheckbox.addEventListener('change', function() {
        if (reminderCheckbox.checked) {
            reminderDatetime.style.display = 'block';
        } else {
            reminderDatetime.style.display = 'none';
        }
    });

    // Add event listener to the form submission
    var taskForm = document.getElementById('task-form');
    taskForm.addEventListener('submit', function(event) {
        // If the reminder checkbox is checked, set the value of the reminder datetime input
        if (reminderCheckbox.checked) {
            reminderDatetime.value = new Date().toISOString().slice(0, 16); // Set the value to the current datetime
        }
    });
});


// pop up add-member-modal after clicking plus button, adding selected members to taskform 
document.addEventListener('DOMContentLoaded', async function() {
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

    addMemberBtn.addEventListener('click', async function() {
        addMemberModal.classList.add('show');
        addMemberModal.style.display = 'block';
    });

    searchBar.addEventListener('click', async function(event) {
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

    searchBar.addEventListener('input', async function(event) {
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
    closeButton.addEventListener('click', function() {
        addMemberModal.classList.remove('show');
        addMemberModal.style.display = 'none';
        // Clear member list
        memberListWrap.innerHTML = '';
    });

    modalAddMemberButton.addEventListener('click', function() {
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


document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (projectId) {
        loadTasks('all'); // Load all tasks by default

        // Set up the event listeners for the filter spans
        document.getElementById('all').addEventListener('click', () => {
            setActiveFilter('all');
            loadTasks('all');
        });

        document.getElementById('pending').addEventListener('click', () => {
            setActiveFilter('pending');
            loadTasks('pending');
        });

        document.getElementById('completed').addEventListener('click', () => {
            setActiveFilter('completed');
            loadTasks('completed');
        });
    }
});

function setActiveFilter(filter) {
    document.querySelectorAll('.filters span').forEach(span => {
        span.classList.remove('active');
    });
    document.getElementById(filter).classList.add('active');
}

function loadTasks(filter) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    fetch(`/getProjectTasks?projectId=${projectId}&filter=${filter}`)
        .then(response => response.json())
        .then(tasksData => {
            showTodo(tasksData);
        })
        .catch(error => console.error('Error fetching tasks:', error));
}
