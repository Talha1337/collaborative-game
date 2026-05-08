
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
let music1 = document.getElementById("music1");
let music2 = document.getElementById("music2");
music1.volume = 0.3;
music2.volume = 0.3;
let switchedMusic = false;


function fadeOut(audio, duration = 1000) {
    let step = 50;
    let volumeStep = audio.volume / (duration / step);

    let fade = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - volumeStep);

        if (audio.volume <= 0) {
            audio.pause();
            clearInterval(fade);
        }
    }, step);
}


function fadeIn(audio, duration = 1000) {

    audio.currentTime = 45;
    audio.play();

    let step = 50;
    let volumeStep = 1 / (duration / step);

    let fade = setInterval(() => {
        audio.volume = Math.min(0.3, audio.volume + volumeStep);

        if (audio.volume >= 0.3) {
            clearInterval(fade);
        }
    }, step);
}



function startGame() {
    // First, prompt for username and join the game
    if (!joinGame()) {
        return;  // If join failed, don't start the game
    }

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

    // Use the existing socket from logic.js (don't create a new one!)
    // socket is already initialized in logic.js as a global variable

    // Listen for game state updates from server
    socket.on("game_update", function(data) {
        bird.y = data.bird_y;
        bird.x = data.bird_x;
        bird.velocity_y = data.bird_velocity_y;
        pipeArray = data.pipes;
        score = data.score;
        gameOver = data.game_over;
        if (score >= 7 && !switchedMusic) {
            switchedMusic = true;

            fadeOut(music1, 1000);
            fadeIn(music2, 1000);
        }
        // Render the game
        render();
    });


    // Listen for spacebar to jump
    document.addEventListener("keydown", function(event) {
        if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyX") {
            socket.emit("player_jump");

            if (!audioStarted) {
            music1.play();
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
    // Calculate angle based on velocity
    // Velocity positive = falling (look down), negative = rising (look up)
    let angle = 0;
    if (bird.velocity_y !== undefined) {
        // Convert velocity to angle (in radians)
        // You can scale this factor to control sensitivity
        angle = Math.min(Math.max(bird.velocity_y * 0.05, -0.5), 0.5); // Clamp between -0.5 and 0.5 radians
    }

    // Save context state
    context.save();

    // Translate to bird center, rotate, then draw
    context.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    context.rotate(angle);
    context.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);

    // Restore context state
    context.restore();

    // Draw pipes

    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        if (i % 2 === 0) {
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
    context.fillText(score, 10, 45);
    if (score >= 3 && score < 5) {
        if (Math.floor(Date.now() / 300) % 2 === 0) {

            context.save();

            context.fillStyle = "yellow";
            context.font = "20px sans-serif";
            context.textAlign = "center";

            context.fillText("Surprise at 7!", board.width / 2, 100);

            context.restore();
        }
    }
    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }
}
window.startGame = startGame;