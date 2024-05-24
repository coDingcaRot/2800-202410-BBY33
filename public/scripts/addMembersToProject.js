const User = require("../modules/user.js")

async function addUserToProject(){
    try{
        console.log(`addUserToProject() called: `)
        // console.log(`addUserToProject() function start`);
        // // Get the member email from the input field
        // var memberList = [];
        // const memberEmail = $('#memberEmailInput').val().trim();
        
        // // Check if the email is not empty
        // if (memberEmail) {
        //     // Find the user in the database
        //     const member = await User.findOne({ email: memberEmail });
            
        //     // If user is found, add to the member list
        //     if (member) {
        //         // Append the member to the list
        //         memberList.push(member);
        //         showUserAdded(member);
        //     } else {
        //         throw new Error("Member doesn't exist");
        //     }
        // } else {
        //     throw new Error("Field is empty")
        // }

        // console.log(`addUserToProject() function end`);

        // console.log(`\nmemberList updated: ${memberList}`);
    }catch(error){
        const errorMessage = error.message;
        console.log(errorMessage);
    }
}


function showUserAdded(member, memberList){
    $('#membersList').append(`
        <li class="list-group-item">
            (${member.email})
            <button type="button" class="btn btn-danger btn-sm float-end" onclick="deleteUser(this, memberList)">Delete</button>
            <input type="hidden" name="members[]" value="${member._id}">
        </li>`
    );
}

function deleteUser(member, memberList){
    memberList.remove(member)
    // Some other code to delete from appended div
}