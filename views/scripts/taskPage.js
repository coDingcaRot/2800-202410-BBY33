// format time got from mongodb
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(":");
    let formattedTime = "";
    let meridiem = "";

    // convert 24 format to 12
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
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const [year, month, day] = dateStr.split("-");

    const formattedDate = `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;

    return formattedDate;
}

function showTodo(filter) {
    let taskTag = "";
    if (todos) {
        todos.forEach((todo) => {
            let formatdate = formatDate(todo.dueDate);
            let formattime = formatTime(todo.dueTime);
            let completed = todo.status == "completed" ? "checked" : "";
            if (filter == todo.status || filter == "all") {
                taskTag += `<div class="col-xl-12 task">
                            <div class="task-list-box" id="landing-task">
                                <div id="task-item-${todo._id}"> 
                                    <div class="card task-box rounded-3">
                                        <div class="card-body">
                                            <div class="row align-items-center">
                                                <div class="col-xl-6 col-sm-5">
                                                    <div class="checklist form-check font-size-15">
                                                        <div class="task-info">
                                                            <input onchange="updateStatus(this)" type="checkbox" class="form-check-input" id="${todo._id}" ${completed}>
                                                            <label class="form-check-label ms-1 task-title ${completed}" for="${todo._id}">${todo.title}</label>
                                                        </div>
                                                        <div class="due-date-time">
                                                            <span class="due-date">${formatdate}</span>
                                                            <span class="due-time">${formattime}</span>
                                                        </div>
                                                    </div>
                                                </div>  <!-- end col -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            }
        });
    }
    taskBox.innerHTML = taskTag || `<span>You don't have any task here</span>`;
    taskBox.offsetHeight >= 300
        ? taskBox.classList.add("overflow")
        : taskBox.classList.remove("overflow");
}

// format time got from mongodb
async function fetchTasksFromServer() {
    try {
        const response = await fetch('/getAllTasks');
        if (!response.ok) {
            throw new Error('Failed to fetch tasks from server');
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Tasks data is not an array');
        }
        todos = data; // assign data get from server to variable todos
        showTodo("all"); // after getting the data, call showTo function to render windows
    } catch (error) {
        console.error('Error fetching tasks from server:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Select the Add Task button
    var addTaskButton = document.getElementById('add-task-btn');
    
    // Add event listener to the Add Task button
    addTaskButton.addEventListener('click', function() {
        // Redirect to taskform.html
        window.location.href = '/taskform';
    });
});

window.addEventListener('DOMContentLoaded', () => {
    fetchTasksFromServer();
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
