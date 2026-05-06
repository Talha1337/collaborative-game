
// Initialize socket but don't join yet
var socket = null;
var username = null;
var userCursors = {};
var gameStarted = false;

// Initialize socket when page loads
function initSocket() {
    if (!socket) {
        socket = io();
        socket.on('connect', function() {
            console.log('Connected to server');
        });
        socket.on('connect_error', function(error) {
            console.error('Connection error:', error);
            alert('Connection error. Please refresh the page.');
        });
    }
}

// Call this from startGame() to prompt for username and join
function joinGame() {
    if (!username) {
        username = prompt("Enter your name:");
        if (!username || username.trim() === "") {
            alert("Please enter a valid name to join the game!");
            username = null;
            return false;
        }
    }
    
    if (socket && socket.connected) {
        socket.emit("join", username);
        gameStarted = true;
        return true;
    } else {
        alert("Not connected to server. Please refresh the page and try again.");
        return false;
    }
}

// Initialize socket on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocket);
} else {
    initSocket();
}

// Set up socket listener for user list (after socket exists)
function setupUserListListener() {
    if (!socket) return;
    socket.on("users_list", function(data) {
        var usersList = document.getElementById("usersList");
        usersList.innerHTML = "";
        data.users.forEach(function(user) {
            var userItem = document.createElement("div");
            userItem.className = "user-item";
            userItem.textContent = user;
            if (user === username) {
                userItem.style.borderLeftColor = "#52c41a";
                userItem.style.fontWeight = "bold";
                userItem.textContent += " (you)";
            }
            usersList.appendChild(userItem);
        });
    });
}

// Set up listener once socket is ready
var listenerSetupAttempts = 0;
var listenerSetupInterval = setInterval(function() {
    if (socket || listenerSetupAttempts > 20) {
        setupUserListListener();
        clearInterval(listenerSetupInterval);
    }
    listenerSetupAttempts++;
}, 100);
// Listen for user list updates
socket.on("users_list", function(data) {
    var usersList = document.getElementById("usersList");
    usersList.innerHTML = "";  // Clear current list
    data.users.forEach(function(user) {
        var userItem = document.createElement("div");
        userItem.className = "user-item";
        userItem.textContent = user;
        if (user === username) {
            userItem.style.borderLeftColor = "#52c41a";  // Green for current user
            userItem.style.fontWeight = "bold";
            userItem.textContent += " (you)";
        }
        usersList.appendChild(userItem);
    });
});

// Listen for messages from server
socket.on("message", function(data) {
    var messages = document.getElementById("messages");
    // Create a new message element with timestamp, username, and message
    var messageElement = document.createElement("p");
    messageElement.textContent = `[${data.timestamp}] ${data.username}: ${data.message}`;
    messages.appendChild(messageElement);
    if (data.user_id === socket.id) {
        messageElement.style.fontWeight = "bold";
        messageElement.style.borderLeft = "3px solid #4a90e2"; // Highlight own messages
    }
    else {
        messageElement.classList.add("other-message");  // Style for other users' messages
    }
        messages.scrollTop = messages.scrollHeight;  // Auto-scroll to bottom


});
socket.on("click", function(data) {
    document.getElementById("clicks").textContent = data.count;
});

// Track mouse movement and send to server
document.addEventListener("mousemove", function(event) {
    socket.emit("cursor_move", {x: event.clientX, y: event.clientY});
    document.getElementById("myPosition").textContent = `Your cursor: (${event.clientX}, ${event.clientY})`;
});

// Listen for cursor position updates from other users
socket.on("cursor_move", function(data) {
    if (data.username === username) return;  // Don't show own cursor from broadcast

    // Create or update cursor element
    if (!userCursors[data.username]) {
        var cursorDiv = document.createElement("div");
        cursorDiv.className = "user-cursor";
        cursorDiv.style.backgroundColor = getColorForUsername(data.username);
        var label = document.createElement("div");
        label.className = "cursor-label";
        label.textContent = data.username;
        cursorDiv.appendChild(label);
        document.body.appendChild(cursorDiv);
        userCursors[data.username] = cursorDiv;
    }

    // Update cursor position
    userCursors[data.username].style.left = data.x + "px";
    userCursors[data.username].style.top = data.y + "px";
});

// Generate consistent color for each username
function getColorForUsername(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    var color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + ("000000" + color).slice(-6);
}

// Listen for clicks anywhere on the page
document.addEventListener("click", function() {
    socket.emit("click");
});

// Listen for spacebar press
document.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
        socket.emit("click");
    }
});

// Function to send messages
function sendMessage() {
    var msgInput = document.getElementById("msg");
    var message = msgInput.value;
    if (message.trim() !== "") {
        socket.send(message);
        msgInput.value = "";
    }
}

function onClick() {
    socket.emit("click");  // Just notify server, don't increment locally
}

window.connection = socket;