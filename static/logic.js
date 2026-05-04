
        var socket = io();
        var username = prompt("Enter your name:");  // Ask for username
        socket.emit("join", username);  // Notify server of new user
        var userCursors = {};  // Store cursor elements for each user

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

        window.connection = socket