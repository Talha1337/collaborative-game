
//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 34;
let birdHeight = 24;
let birdX = boardWidth/8;
let birdY = boardHeight/2;
let birdImg;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 256;

let topPipeImg;
let bottomPipeImg;

//game state
let gameOver = false;
let score = 0;
let audioStarted = false;
let audio = document.getElementById('audio_play').querySelector('audio');
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    //load images
    birdImg = new Image();
    birdImg.src = "./static/flappybird.png";
    birdImg.onload = function() {
        context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./static/toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./static/bottompipe.png";

    // Initialize Socket.IO
    socket = io();

    // Listen for game state updates from server
    socket.on("game_update", function(data) {
        bird.y = data.bird_y;
        bird.x = data.bird_x;
        pipeArray = data.pipes;
        score = data.score;
        gameOver = data.game_over;

        // Render the game
        render();
    });


    // Listen for spacebar to jump
    document.addEventListener("keydown", function(event) {
        if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyX") {
            socket.emit("player_jump");

            if (!audioStarted) {

            audio.play();
            audioStarted = true;
        }
        }
    });

    requestAnimationFrame(render);
}

function render() {
    requestAnimationFrame(render);

    context.clearRect(0, 0, board.width, board.height);

    // Draw bird
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    // Draw pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        if (pipe.y < 0) {
            // Top pipe
            context.drawImage(topPipeImg, pipe.x, pipe.y, pipe.width, pipe.height);
        } else {
            // Bottom pipe
            context.drawImage(bottomPipeImg, pipe.x, pipe.y, pipe.width, pipe.height);
        }
    }

    // Draw score
    context.fillStyle = "white";
    context.font = "45px sans-serif";
    context.fillText(score, 5, 45);

    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }
}
window.startGame = startGame;