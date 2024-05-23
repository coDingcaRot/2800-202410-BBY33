// when reloading the page, show data on screen according to the URL query
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (projectId) {
        Promise.all([
            fetch(`/getProjectTasks?projectId=${projectId}`).then(response => response.json()),
            fetch(`/getProjectName?projectId=${projectId}`).then(response => response.json())
        ])
        .then(([tasksData, project]) => {
            showTodo(tasksData);
            const navbarBrand = document.getElementById('navbarDropdown');
            if (project && project.projectName) {
                navbarBrand.textContent = project.projectName;
            }
        })
        .catch(error => console.error('Error fetching project data:', error));
    }
});

const projectListDiv = document.getElementById('projectListDropdown');
projectListDiv.addEventListener('change', function(event) {
    if (event.target.matches('input[name="listGroupRadios"]')) {
        const selectedProjectId = event.target.value;
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', selectedProjectId);
        history.pushState(null, '', url);

        Promise.all([
            fetch(`/getProjectTasks?projectId=${selectedProjectId}`).then(response => response.json()),
            fetch(`/getProjectName?projectId=${selectedProjectId}`).then(response => response.json())
        ])
        .then(([tasksData, project]) => {
            showTodo(tasksData);
            const navbarBrand = document.getElementById('navbarDropdown');
            if (project && project.projectName) {
                navbarBrand.textContent = project.projectName;
            }
        })
        .catch(error => console.error('Error fetching project data:', error));

    }
});



// format time got from mongodb
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(":");
    let formattedTime = "";
    let meridiem = "";

    // convert 24 forma t to 12
    let hour = parseInt(hours);
    if (hour >= 12) {
        meridiem = "pm";
        if (hour > 12) {
            hour -= 12;
        }
    } else {
        meridiem = "am";
        if (hour === 0) {
            hour = 12;
        }
    }

    // add 0 to minute
    let minute = parseInt(minutes);
    if (minute < 10) {
        minute = "0" + minute;
    }

    formattedTime = `${hour}:${minute} ${meridiem}`;

    return formattedTime;
} 

function formatDate(dateStr) {
    if (typeof dateStr !== 'string') {
        console.error('formatDate: input is not a string', dateStr);
        return ''; 
    }

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateStr.match(datePattern)) {
        console.error('formatDate: input does not match YYYY-MM-DD format', dateStr);
        return '';  
    }

    const [year, month, day] = dateStr.split("-");
    const formattedDate = `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;

    return formattedDate;
}


async function showTodo(tasksData) {
    let taskTag = "";
    if (tasksData && tasksData.length > 0) {
        for (const todo of tasksData) {
            let formatdate = formatDate(todo.dueDate);
            let formattime = formatTime(todo.dueTime);
            let taskstatus = todo.status;
            try {
                const memberAvatarsHTML = await generateMemberAvatars(todo.taskMembers);
                const isChecked = localStorage.getItem(todo._id) === "true"; // Check local storage for checkbox state
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
                                        <span>${todo.title}</span>
                                        </label>
                                    </div>
                                    <div class="task-card-member-wrapper">
                                        <div class="task-card-member">
                                            ${memberAvatarsHTML}
                                        </div>
                                        <div class="member-complete">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-circle" viewBox="0 0 16 16">
                                                <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0"/>
                                                <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z"/>
                                            </svg>
                                            <span id="member-complete-count">3/7</span>
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
    const taskBox = document.getElementById('task-card-container');
    taskBox.innerHTML = taskTag || `<span>You don't have any task here</span>`;
    taskBox.offsetHeight >= 300
        ? taskBox.classList.add("overflow")
        : taskBox.classList.remove("overflow");
}

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

// async function handleCheckboxChange(taskId) {
//     try {
//         const response = await fetch(`/updateCompletedMembers/${taskId}`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             }
//         });

//         if (!response.ok) {
//             throw new Error('Failed to update completed members');
//         }

//     } catch (error) {
//         console.error('Error updating completed members:', error);
//     }
// }
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



// pop up add-member-modal after clicking plus button 
document.addEventListener('DOMContentLoaded', async function() {
    const addMemberBtn = document.getElementById('add-member-btn');
    const addMemberModal = document.getElementById('add-member-modal');
    const memberListWrap = document.querySelector('.member-list-wrap');
    const projectIdInput = document.getElementById('taskform-project-id');
    const modalAddMemberButton = document.getElementById('modal-add-member-btn');
    const memberListDiv = document.getElementById('taskform-member-list');

    let selectedMembers = [];

    addMemberBtn.addEventListener('click', async function() {
        addMemberModal.classList.add('show');
        addMemberModal.style.display = 'block';
    
        const projectId = projectIdInput.value.trim(); // Get the project ID from the hidden input field
    
        // Send a request to the server to get the list of project members
        try {
            const response = await fetch(`/getProjectMembers?projectId=${projectId}`);
            if (response.ok) {
                const userData = await response.json();
                // Clear existing member list
                memberListWrap.innerHTML = '';
                // Add each username and email to the member list
                userData.forEach(data => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('member-list-group-item');
                    listItem.innerHTML = `
                        <input class="form-check-input me-1" type="checkbox" value="${data._id}" id="checkbox-${data._id}">
                        <label class="form-check-label" for="checkbox-${data._id}">${data.username} (${data.email})</label>
                    `;
                    memberListWrap.appendChild(listItem);
                });
            } else {
                console.error('Failed to fetch project members');
            }
        } catch (error) {
            console.error('Error fetching project members:', error);
        }
    });

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
        selectedMembers = [];
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





const filters = document.querySelectorAll(".filters span"),
taskBox = document.querySelector(".task-card-container");

filters.forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelector("span.active").classList.remove("active");
        btn.classList.add("active");
        showTodo(btn.id);
    });
});

function showMenu(selectedTask) {
    let menuDiv = selectedTask.parentElement.lastElementChild;
    menuDiv.classList.add("show");
    document.addEventListener("click", (e) => {
        if (e.target.tagName != "I" || e.target != selectedTask) {
            menuDiv.classList.remove("show");
        }
    });
}



// let todos = []
// async function handleCheckboxChange(todoId) {
//     const todo = todos.find(todo => todo._id === todoId);
//     if (!todo) {
//         return;
//     }

//     todo.status = todo.status === "completed" ? "pending" : "completed";

//     try {
//         const response = await fetch(`/updateTaskStatus/${todoId}`, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ status: todo.status })
//         });
//         if (!response.ok) {
//             throw new Error('Failed to update task status');
//         }
//     } catch (error) {
//         console.error('Error updating task status:', error);
//     }

//     const filter = document.querySelector('.filters .active').id;
//     showTodo(todos, filter);
// }
