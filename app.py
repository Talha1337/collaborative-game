from flask import Flask, render_template, request
from flask_socketio import SocketIO, send, emit, join_room, leave_room
import threading
import time
import random
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = "your_secret_key"

socketio = SocketIO(app)

# Dictionary to store users and their assigned rooms
users = {}
click_count = 0
cursor_positions = {}  # Dictionary to store cursor positions by session


# Game state
class GameState:
    def __init__(self):
        self.bird_y = 320  # boardHeight/2
        self.bird_x = 45  # boardWidth/8
        self.velocity_y = 0
        self.gravity = 0.4
        self.pipes = []
        self.score = 0
        self.game_over = False
        self.last_pipe_time = time.time()
        self.pipe_interval = 2.5
        self.board_width = 360
        self.board_height = 640
        self.pipe_width = 64
        self.pipe_height = 256
        self.velocity_x = -2
        self.players_jumped = set()  # Track which players jumped this frame


game_state = GameState()
game_loop_thread = None
game_loop_running = False


@app.route("/")
def index():
    return render_template("index.html")


def game_loop():
    """Main game loop that updates physics and broadcasts state"""
    global game_state
    while game_loop_running:
        if not game_state.game_over and len(users) > 0:
            # Update bird physics
            game_state.velocity_y += game_state.gravity
            game_state.bird_y += game_state.velocity_y

            # Check if bird hit ground
            if game_state.bird_y > game_state.board_height:
                game_state.game_over = True

            # Spawn pipes
            current_time = time.time()
            if current_time - game_state.last_pipe_time > game_state.pipe_interval:
                spawn_pipe()
                game_state.last_pipe_time = current_time

            # Update pipes
            for pipe in game_state.pipes[:]:
                pipe["x"] += game_state.velocity_x

                # Check if bird passed pipe
                if (
                    not pipe.get("passed")
                    and game_state.bird_x > pipe["x"] + game_state.pipe_width
                ):
                    game_state.score += 0.5
                    pipe["passed"] = True

                # Check collision
                if detect_collision(game_state.bird_x, game_state.bird_y, 34, 24, pipe):
                    game_state.game_over = True

            # Remove off-screen pipes
            game_state.pipes = [
                p for p in game_state.pipes if p["x"] > -game_state.pipe_width
            ]

            # Clear jumped state for next frame
            game_state.players_jumped.clear()

        # Broadcast game state to all players
        socketio.emit(
            "game_update",
            {
                "bird_y": game_state.bird_y,
                "bird_x": game_state.bird_x,
                "bird_velocity_y": game_state.velocity_y,
                "pipes": game_state.pipes,
                "score": int(game_state.score),
                "game_over": game_state.game_over,
            },
        )

        time.sleep(0.02)  # ~50 FPS


def spawn_pipe():
    """Spawn a new pipe"""
    opening_space = game_state.board_height / 4

    # Random position for the opening gap (where the bird can fly through)
    gap_position = random.randint(80, int(game_state.board_height - opening_space - 80))

    # Top pipe: extends from top of screen to gap_position
    top_pipe = {
        "x": game_state.board_width,
        "y": -500,  # Start far above the screen
        "width": game_state.pipe_width,
        "height": gap_position + 500,  # Extend down to the gap
        "passed": False,
    }
    game_state.pipes.append(top_pipe)

    # Bottom pipe: starts after the opening and extends to bottom of screen
    bottom_pipe = {
        "x": game_state.board_width,
        "y": gap_position + opening_space,
        "width": game_state.pipe_width,
        "height": game_state.board_height - (gap_position + opening_space) + 500,
        "passed": False,
    }
    game_state.pipes.append(bottom_pipe)


def detect_collision(bird_x, bird_y, bird_width, bird_height, pipe):
    """Detect collision between bird and pipe"""
    return (
        bird_x < pipe["x"] + pipe["width"]
        and bird_x + bird_width > pipe["x"]
        and bird_y < pipe["y"] + pipe["height"]
        and bird_y + bird_height > pipe["y"]
    )


# Handle new user joining
@socketio.on("join")
def handle_join(username):
    global game_loop_thread, game_loop_running
    users[request.sid] = username
    join_room(username)
    date_time = datetime.now().strftime("%H:%M:%S")
    data = {
        "username": "System",
        "message": f"{username} joined the chat",
        "timestamp": date_time,
        "user_id": request.sid,
    }
    emit("message", data, broadcast=True)
    # Send current click count to the new user
    emit("click", {"username": username, "count": click_count}, room=username)

    # Start game loop if not already running
    if not game_loop_running and len(users) > 0:
        game_loop_running = True
        game_loop_thread = threading.Thread(target=game_loop, daemon=True)
        game_loop_thread.start()


# Handle user messages
@socketio.on("message")
def handle_message(data):
    global users
    date_time = datetime.now().strftime("%H:%M:%S")
    username = users.get(request.sid, "Anonymous")  # Get the user's name
    print(users)
    print(f"Received message from {request.sid}: {data}")
    data = {
        "username": username,
        "message": data,
        "timestamp": date_time,
        "user_id": request.sid,
    }
    emit("message", data, broadcast=True)  # Send to everyone


# Handle disconnects
@socketio.on("disconnect")
def handle_disconnect():
    global game_loop_running
    username = users.pop(request.sid, "Anonymous")
    date_time = datetime.now().strftime("%H:%M:%S")
    data = {
        "username": "System",
        "message": f"{username} left the chat",
        "timestamp": date_time,
        "user_id": request.sid,
    }
    emit("message", data, broadcast=True)

    # Stop game loop if no users left
    if len(users) == 0:
        game_loop_running = False


# Handle player jump action
@socketio.on("player_jump")
def handle_player_jump():
    global game_state
    if not game_state.game_over:
        game_state.velocity_y = -6
    else:
        # Reset game
        game_state.bird_y = 320
        game_state.velocity_y = 0
        game_state.pipes = []
        game_state.score = 0
        game_state.game_over = False


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
    socketio.run(app, port=8080, debug=True)
