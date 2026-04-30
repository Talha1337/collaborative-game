from flask import Flask, render_template, request
from flask_socketio import SocketIO, send, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = "your_secret_key"

socketio = SocketIO(app)

# Dictionary to store users and their assigned rooms
users = {}
click_count = 0
cursor_positions = {}  # Dictionary to store cursor positions by session


@app.route("/")
def index():
    return render_template("index.html")


# Handle new user joining
@socketio.on("join")
def handle_join(username):
    users[request.sid] = username
    join_room(username)
    emit("message", f"{username} joined the chat", room=username)
    # Send current click count to the new user
    emit("click", {"username": username, "count": click_count}, room=username)


# Handle user messages
@socketio.on("message")
def handle_message(data):
    username = users.get(request.sid, "Anonymous")  # Get the user's name
    emit("message", f"{username}: {data}", broadcast=True)  # Send to everyone


# Handle disconnects
@socketio.on("disconnect")
def handle_disconnect():
    username = users.pop(request.sid, "Anonymous")
    emit("message", f"{username} left the chat", broadcast=True)


@socketio.on("click")
def handle_click():
    print("click received")
    global click_count
    click_count += 1
    username = users.get(request.sid, "Anonymous")
    emit("click", {"username": username, "count": click_count}, broadcast=True)


# Handle cursor position updates
@socketio.on("cursor_move")
def handle_cursor_move(data):
    username = users.get(request.sid, "Anonymous")
    cursor_positions[request.sid] = {
        "username": username,
        "x": data["x"],
        "y": data["y"],
    }
    emit(
        "cursor_move",
        {"username": username, "x": data["x"], "y": data["y"]},
        broadcast=True,
    )


if __name__ == "__main__":
    socketio.run(app, debug=True)
