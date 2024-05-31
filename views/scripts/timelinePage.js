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
            if(projectId){
                const response = await fetch(`/getProjectName?projectId=${projectId}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const project = await response.json();
                return project.projectName;
            } else {
                console.log("projectId is null");
                return "Choose a project";
            }
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

    // Functions to update timeline when projectId changes in drop down menu
    async function updateTimelineOnProjectChange(projectId) {
        if (projectId) {
            // update members with different selected projectId
            renderProjectMembersTimeline(projectId);
            // update chart data with different selected projectId
            renderChart(projectId);
        } else {
            console.log('Project ID not found in URL');
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
                console.log('Error fetching project data:', error);
            });

            // Update timeline based on selected project ID
            updateTimelineOnProjectChange(selectedProjectId);

        }
    });

    // Initial render based on the current project ID in the URL
    const initialProjectId = getProjectIdFromURL();
    try {
        const projectName = await getProjectName(initialProjectId);
        const navbarBrand = document.getElementById('navbarDropdown');
        navbarBrand.textContent = projectName;
    } catch (error) {
        console.log('Error setting initial project name:', error);
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
                startDate: taskOwnerStartDateTime.toFormat('MMM/dd/yyyy'),
                startTime: taskOwnerStartDateTime.toFormat('h:mm a'),
                dueDate: taskOwnerDueDateTime.toFormat('MMM/dd/yyyy'), 
                dueTime: taskOwnerDueDateTime.toFormat('h:mm a')
            };
        }

        const startMemberDateTime = taskOwnerStartDateTime.setZone(memberTimezone);
        const dueMemberDateTime = taskOwnerDueDateTime.setZone(memberTimezone);

        return {
            username: member.username,
            startDate: startMemberDateTime.toFormat('MMM/dd/yyyy'),
            startTime: startMemberDateTime.toFormat('h:mm a'),
            dueDate: dueMemberDateTime.toFormat('MMM/dd/yyyy'), 
            dueTime: dueMemberDateTime.toFormat('h:mm a')
        };
    });

    return taskMembers;
}

/**
 * Displays timeline to user
 * 
 * @author Jonathaniel Alipes, Joyce Huang
 * @param {*} projectId 
 */
// timeline chart function
async function renderChart(projectId) {
    var chartData = [];
    try {
        const response = await fetch(`/timelineData?projectId=${projectId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const taskData = await response.json();
        
        taskData.forEach(async task =>{
            chartData.push(task);
        })
    } catch (error) {
        console.error('Error fetching chart data:', error);
    }

    // clear the chart
    document.getElementById('timeline-container').innerHTML = '';

    // create a data tree
    var treeData = anychart.data.tree(chartData, "as-tree");

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

    //Event listener for clicks
    /* listen to the rowClick event and redirect to another page */
    chart.listen("rowClick", async function (e) {
        var item_id = await e.item.get("id");

        const response = await fetch(`/getOneTaskDetails?taskId=${item_id}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const taskDetail = await response.json();
        console.log(taskDetail);
        const convertDateTime = convertMemberTimezone(taskDetail);

        var modalTitle = document.getElementById('timelineModalTitle');
        var modalBody = document.querySelector('#timelineModal .timeline-modal-body');
        modalTitle.innerHTML = `${taskDetail.title}`;

        let tableHTML = `
        <div>Description: ${taskDetail.description}</div>
        <table class="timeline-modal-tb">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Start</th>
                    <th>Due</th>
                </tr>
            </thead>
            <tbody>
        `;

        convertDateTime.forEach(member => {
        tableHTML += `
            <tr>
                <td>${member.username}</td>
                <td>${member.startDate} ${member.startTime}</td>
                <td>${member.dueDate} ${member.dueTime}</td>
            </tr>
            `;
        });

        tableHTML += `
            </tbody>
        </table>
        `;

        modalBody.innerHTML = tableHTML;
    
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
}