function addTeamMember() {
    const teamDiv = document.getElementById('team');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter team member name';
    teamDiv.appendChild(input);
}
