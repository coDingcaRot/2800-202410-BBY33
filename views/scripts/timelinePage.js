document.addEventListener('DOMContentLoaded', async function() {
    function getProjectIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('projectId');
    }

    async function renderProjectMembersTimeline(projectId) {
        try {
            const members = await getProjectMembersInfo(projectId);
            
            const timezoneContainer = document.querySelector('.timezone-container');
            timezoneContainer.innerHTML = '';

            members.forEach(member => {
                const timezoneDiv = document.createElement('div');
                timezoneDiv.classList.add('timezone');
                timezoneDiv.setAttribute('data-timezone', member.timezone);

                const usernameSpan = document.createElement('span');
                usernameSpan.classList.add('userspan');
                usernameSpan.textContent = member.username + " ";

                const locationSpan = document.createElement('span');
                locationSpan.classList.add('locationspan');
                locationSpan.textContent = member.location;

                const outputTime = document.createElement('output');
                outputTime.classList.add('output-time');
                outputTime.textContent = "time";

                const outputDate = document.createElement('output');
                outputDate.classList.add('output-date');
                outputDate.textContent = "date";

                timezoneDiv.appendChild(usernameSpan);
                timezoneDiv.appendChild(locationSpan);
                timezoneDiv.appendChild(outputTime);
                timezoneDiv.appendChild(outputDate);

                timezoneContainer.appendChild(timezoneDiv);
            });

            // render the update time after fetching the data
            await updateTimes();
            setInterval(function(){
                updateTimes();
            }, 1000)

        } catch (error) {
            console.error('Error rendering project members:', error);
        }
    }

    // get the members info of projectId
    async function getProjectMembersInfo(projectId) {
        try {
            const response = await fetch(`/getProjectMembersInfo?projectId=${projectId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch project members');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Error fetching project members: ' + error.message);
        }
    }

    // get project's name through projectId
    async function getProjectName(projectId) {
        try {
            const response = await fetch(`/getProjectName?projectId=${projectId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const project = await response.json();
            return project.projectName;
        } catch (error) {
            throw new Error('Error fetching project name: ' + error.message);
        }
    }

    // update local time using luxon
    const updateTimes = async function () {
        const locations = document.querySelectorAll(".timezone");
        await Promise.all(Array.from(locations).map(async (location) => {
            const outputDate = location.querySelector("output.output-date");
            const outputTime = location.querySelector("output.output-time");
            const timezone = location.getAttribute("data-timezone");
        
            // current time with .now
            const now = luxon.DateTime.now().setZone(timezone);
            outputDate.innerHTML = now.toFormat("ccc, MMM dd");
            outputTime.innerHTML = now.toFormat("h:mm a");

            const hour = parseInt(now.toFormat("H"));
            if(hour >= 9 && hour < 18){
                location.classList.add("open");
            }
        }));
    }

    // Function to update timeline when project changes
    async function updateTimelineOnProjectChange(projectId) {
        if (projectId) {
            renderProjectMembersTimeline(projectId);
        } else {
            console.error('Project ID not found in URL');
        }
    }

    // listen to the top navbar dropdown menu and show project name on it
    const projectListDiv = document.getElementById('projectListDropdown');
    projectListDiv.addEventListener('change', function(event) {
        if (event.target.matches('input[name="listGroupRadios"]')) {
            const selectedProjectId = event.target.value;
            const url = new URL(window.location.href);
            url.searchParams.set('projectId', selectedProjectId);
            history.pushState(null, '', url);

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

            // Update timeline based on selected project ID
            updateTimelineOnProjectChange(selectedProjectId);
        }
    });

    // Check for project ID changes in the URL
    window.addEventListener('popstate', async function() {
        const projectId = getProjectIdFromURL();
        try {
            const projectName = await getProjectName(projectId);
            const navbarBrand = document.getElementById('navbarDropdown');
            navbarBrand.textContent = projectName;
            updateTimelineOnProjectChange(projectId);
        } catch (error) {
            console.error('Error updating project name:', error);
        }
    });

    // Initial render based on the current project ID in the URL
    const initialProjectId = getProjectIdFromURL();
    try {
        const projectName = await getProjectName(initialProjectId);
        const navbarBrand = document.getElementById('navbarDropdown');
        navbarBrand.textContent = projectName;
    } catch (error) {
        console.error('Error setting initial project name:', error);
    }
    updateTimelineOnProjectChange(initialProjectId);

});





// base object in luxon
let DateTime = luxon.DateTime;

function combineDateTime(dateStr, timeStr) {
    const combinedDateTime = dateStr.replace(/Z$/, '').replace('T00:00', 'T' + timeStr);
    return combinedDateTime;
}

function convertMemberTimezone(taskDetail){
    const taskOwnerTimezone = taskDetail.taskOwner.timezone;
    const taskOwnerStartDateTime = DateTime.fromISO(combineDateTime(taskDetail.startDate, taskDetail.startTime)).setZone(taskOwnerTimezone);
    const taskOwnerDueDateTime = DateTime.fromISO(combineDateTime(taskDetail.dueDate, taskDetail.dueTime)).setZone(taskOwnerTimezone);

    const taskMembers = taskDetail.taskMembers.map(member => {
        const memberTimezone = member.timezone;

        if (memberTimezone === taskOwnerTimezone) {
            return {
                username: member.username,
                startDate: taskOwnerStartDateTime.toFormat('EEE, MMM dd'),
                startTime: taskOwnerStartDateTime.toFormat('h:mm a'),
                dueDate: taskOwnerDueDateTime.toFormat('EEE, MMM dd'), 
                dueTime: taskOwnerDueDateTime.toFormat('h:mm a')
            };
        }

        const startMemberDateTime = taskOwnerStartDateTime.setZone(memberTimezone);
        const dueMemberDateTime = taskOwnerDueDateTime.setZone(memberTimezone);

        return {
            username: member.username,
            startDate: startMemberDateTime.toFormat('EEE, MMM dd'),
            startTime: startMemberDateTime.toFormat('h:mm a'),
            dueDate: dueMemberDateTime.toFormat('EEE, MMM dd'), 
            dueTime: dueMemberDateTime.toFormat('h:mm a')
        };
    });

    return taskMembers;
}


// anychart section
anychart.onDocumentReady(async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    console.log(`projectId: ${projectId}`);
    //Fetch data 
    var data = []
    try {
        const response = await fetch(`/timelineData?projectId=${projectId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const r = await response.json();
        console.log(r)
        var taskData = r;
        taskData.forEach(async task => {
            data.push(task);
        })
            
    } catch (error) {
        console.error('Error fetching timeline data:', error);
    }


    // create a data tree
    var treeData = anychart.data.tree(data, "as-tree");

    // create a chart
    var chart = anychart.ganttProject();

    // var timeline = chart.timeline();

    //left side data grid column
    var dataGrid = chart.dataGrid();
    column0 = dataGrid.column(0);
    column1 = dataGrid.column(1);

    column0.width(10); //sets # width
    column1.width(50); //sets "Tasks" column width
    column1.title().text("Task");

    //timeline customization scaling timeline
    // var timeline = chart.getTimeline();
    // var periodLabels = timeline.periods().labels();
    // var labels = timeline.labels();

    // console.log(`labels: ${labels}`)
    // periodLabels.enabled(true);
    // timeline.scale().zoomLevels([
    //     {unit: "month", count: 1},
    //     {unit: "quarter", count: 1}
    // ]);

    //Event listener for clicks
    /* listen to the rowClick event and redirect to another page */
    chart.listen("rowClick", async function (e) {
        var itemName = await e.item.get("name");  // Assuming the item has a "name" attribute
        var item_id = await e.item.get("id");
        // console.log(`itemName: ${itemName}`)
        // console.log(`item_id: ${item_id}`)

        const response = await fetch(`/getOneTaskDetails?taskId=${item_id}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const taskDetail = await response.json();
        console.log(taskDetail);
        const convertDateTime = convertMemberTimezone(taskDetail);

        var modalTitle = document.getElementById('timelineModalTitle');
        var modalBody = document.querySelector('#timelineModal .modal-body');
        modalTitle.innerHTML = `${taskDetail.title}`;

        modalBody.innerHTML = `
        <span>Description: ${taskDetail.description}</span>
      `;

      convertDateTime.forEach(member => {
        modalBody.innerHTML += `
            <div>${member.username}</div>
            <div>
                <span>${member.startDate} - ${member.dueDate}</span>
                <span>${member.startTime} - ${member.dueTime}</span>
            </div>
            `;
      })
    
      var myModal = new bootstrap.Modal(document.getElementById('timelineModal'));
      myModal.show();
    });
        
    //set the splitter so theres no gaps //only side view though
    chart.splitterPosition("20%");

    // set the data
    chart.data(treeData);

    // set the container id
    chart.container("timeline-container");

    // initiate drawing the chart
    chart.draw();

    // fit elements to the width of the timeline
    chart.fitAll();
});