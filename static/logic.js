
// Debug logging utility
const DEBUG = false; // Set to true to enable console logging
function debug(...args) {
    if (DEBUG) console.log(...args);
}

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

// Set up all socket event listeners after socket is ready
function setupSocketListeners() {
    debug("Setting up socket listeners");
    if (!socket) return;
    debug("Socket ID in setupSocketListeners:", socket.id);

    // Listen for current player updates
    socket.on("current_player", function(data) {
        debug("current_player event received:", data);
        var gameContainer = document.querySelector(".game-container");
        var isMyTurn = (data.current_player_sid === socket.id);
        debug("Current player SID:", data.current_player_sid, "My SID:", socket.id, "Is my turn?", isMyTurn);
        if (isMyTurn) {
            gameContainer.style.backgroundColor = "#ff4444";  // Red for active player
            gameContainer.style.boxShadow = "0 0 20px rgba(255, 68, 68, 0.8)";  // Glow effect
        } else {
            gameContainer.style.backgroundColor = "transparent";
            gameContainer.style.boxShadow = "none";
        }
    });

    // Listen for messages from server
    socket.on("message", function(data) {
        var messages = document.getElementById("messages");
        var messageElement = document.createElement("p");
        messageElement.textContent = `[${data.timestamp}] ${data.username}: ${data.message}`;
        messages.appendChild(messageElement);
        if (data.user_id === socket.id) {
            messageElement.style.fontWeight = "bold";
            messageElement.style.borderLeft = "3px solid #4a90e2";
        } else {
            messageElement.classList.add("other-message");
        }
        messages.scrollTop = messages.scrollHeight;
    });

    // Listen for cursor position updates from other users
    socket.on("cursor_move", function(data) {
        if (data.username === username) return;

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

        userCursors[data.username].style.left = data.x + "px";
        userCursors[data.username].style.top = data.y + "px";
    });
}

// Call setupSocketListeners after socket is initialized
var setupAttempts = 0;
var setupInterval = setInterval(function() {

    if (socket) {
        setupUserListListener();
        setupSocketListeners();
        clearInterval(setupInterval);
    }

    setupAttempts++;
    if (setupAttempts > 50) {
        clearInterval(setupInterval);
    }
}, 100);

debug("Setup interval started");


document.addEventListener("keydown", function(event) {
    if (socket && (event.code === "Space")) {
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

window.connection = socket;