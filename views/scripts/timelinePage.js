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
                usernameSpan.textContent = member.username;

                const locationSpan = document.createElement('span');
                locationSpan.textContent = member.location;

                const output = document.createElement('output');
                output.textContent = "time";

                timezoneDiv.appendChild(usernameSpan);
                timezoneDiv.appendChild(locationSpan);
                timezoneDiv.appendChild(output);

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
            const output = location.querySelector("output");
            const timezone = location.getAttribute("data-timezone");
        
            // current time with .now
            const now = luxon.DateTime.now().setZone(timezone);
            output.innerHTML = now.toFormat("(ccc) MM-dd-yyyy, HH:mm:ss");

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



const urlParams = new URLSearchParams(window.location.search);
projectId = urlParams.get('projectId');
fetch(`/getProjectTaskDetails?projectId=${projectId}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data); 
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });


let DateTime = luxon.DateTime;






anychart.onDocumentReady(function () {
    // The data used in this sample can be obtained from the CDN
    // https://cdn.anychart.com/samples/gantt-charts/activity-oriented-chart/data.js
    anychart.data.loadJsonFile(
      'https://cdn.anychart.com/samples/gantt-charts/activity-oriented-chart/data.json',
      function (data) {
        // create data tree
        var treeData = anychart.data.tree(data, 'as-table');

        // create project gantt chart
        var chart = anychart.ganttProject();

        chart.height(700);
        // set data for the chart
        chart.data(treeData);

        // set start splitter position settings
        chart.splitterPosition(370);

        // get chart data grid link to set column settings
        var dataGrid = chart.dataGrid();

        // set first column settings
        dataGrid
          .column(0)
          .title('#')
          .width(30)
          .labels({ hAlign: 'center' });

        // set second column settings
        dataGrid.column(1).labels().hAlign('left').width(180);

        // set third column settings
        dataGrid
          .column(2)
          .title('Start Time')
          .width(70)
          .labels()
          .hAlign('right')
          .format(function () {
            var date = new Date(this.actualStart);
            var month = date.getUTCMonth() + 1;
            var strMonth = month > 9 ? month : '0' + month;
            var utcDate = date.getUTCDate();
            var strDate = utcDate > 9 ? utcDate : '0' + utcDate;
            return date.getUTCFullYear() + '.' + strMonth + '.' + strDate;
          });

        // set fourth column settings
        dataGrid
          .column(3)
          .title('End Time')
          .width(80)
          .labels()
          .hAlign('right')
          .format(function () {
            var date = new Date(this.actualEnd);
            var month = date.getUTCMonth() + 1;
            var strMonth = month > 9 ? month : '0' + month;
            var utcDate = date.getUTCDate();
            var strDate = utcDate > 9 ? utcDate : '0' + utcDate;
            return date.getUTCFullYear() + '.' + strMonth + '.' + strDate;
          });

        // set container id for the chart
        chart.container('timeline-container');

        // initiate chart drawing
        chart.draw();

        // zoom chart to specified date
        chart.zoomTo(951350400000, 954201600000);
      }
    );
  });