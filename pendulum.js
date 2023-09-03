let mainCanvas,
    myVideo, 
    ctx,
    bg,
    colliders = [],
    state = "startMenu",
    saucer,
    t,
    dt,
    score,
    lastSpawn;

function animate() {
    switch(state) {
        case "startMenu":
            startMenu();
            break;
        case "game":
            game();
            break;
        case "gameOver":
            break;
        default:
            console.log("unknown state");
    }
    requestAnimationFrame(animate);
}

function collide(a, b) {
    return Math.pow(a.pos.x - b.pos.x, 2) + Math.pow(a.pos.y - b.pos.y, 2) < Math.pow(a.radius + b.radius, 2);
}

function game() {
    //draw the video so we can get the pixel data
    ctx.drawImage(myVideo, 0, 0, mainCanvas.width, mainCanvas.height);
    let newt = myVideo.currentTime;
    dt = newt - t;
    t = newt;

    //get position of the ball
    const locs = getMarkedLocations(ctx, [56,150,215]);
    const center = average(locs);

    //we dont need the video anymore
    ctx.drawImage(bg, 0, 0, mainCanvas.width, mainCanvas.height);

    //move the saucer and paint it
    if (center[0]) {
        saucer.pos.x = center[0];
    }
    if (center[1]) {
        saucer.pos.y = center[1];
    }
    saucer.draw();

    // move all the bullets and the enemies
    colliders.forEach((collider, i, object) => {
        collider.update(dt);
        if ((collider.pos.y < 0) || (collider.pos.y > mainCanvas.height) || (collider.pos.x < 0) || (collider.pos.x > mainCanvas.width)) {  
            object.splice(i, 1);
        }
        if (collider.state === "exploding" && t - collider.deathTime > 0.5) {
            object.splice(i, 1);
        }
    });

    for (let i = 0; i < colliders.length; i++) {
        for (let j = i + 1; j < colliders.length; j++) {
            if (collide(colliders[i], colliders[j])) {
                colliders[i].state = "exploding";
                colliders[j].state = "exploding";
                colliders[i].deathTime = t;
                colliders[j].deathTime = t;
            }
        }
    }

    colliders.forEach((collider) => {
        collider.draw();
    });

    if (lastSpawn > 0.3)  {
        lastSpawn = 0;
        colliders.push(new Asteroid(
            new v2D(Math.random() * mainCanvas.width, 0),
            new v2D(Math.random() * 200 - 100, Math.random() * 300),
            Math.random() * 20 + 1));
    } else {
        if (dt) {
            lastSpawn += dt;
        }
    }
}


class v2D {
  constructor(x, y) {
    this.x = x;
    this.y = y; 
  }
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  setMagnitude(m) {
    const mag = this.magnitude();
    this.x *= m / mag;
    this.y *= m / mag;
  }
}

class Saucer {
   constructor() {
        this.pos = new v2D();
        this.v = new v2D();
        this.width = 80;
        this.bb = new v2D(this.width, this.width * marcianito.height / marcianito.width);
   }

   draw() {
        let left = this.pos.x - this.bb.x / 2;
        if (left < 0) {
            left = 0;
        }
        if (left + this.bb.x > mainCanvas.width) {
            left = mainCanvas.width - this.bb.x;
        }

        ctx.drawImage(marcianito, left, this.pos.y - this.bb.y /2 - 20, this.bb.x, this.bb.y);
   }

   fire(to) {
        const from = new v2D(this.pos.x, this.pos.y - 70);
        let v = new v2D(to.x - from.x, to.y - from.y);
        v.setMagnitude(200);
        colliders.push(new Bullet(from, v));
   }
}

class StraightMover {
    constructor(pos, v, radius = 3) {
        this.pos = pos;
        this.v = v;
        this.radius = radius;
    }

    update(dt) {
        this.pos.x += this.v.x * dt;
        this.pos.y += this.v.y * dt;
    }
}

class Bullet extends StraightMover {
    constructor(pos, v, radius = 3) {
        super(pos, v, radius);
    }
    draw() {
        let p = new Path2D();
        p.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill(p);
    }
}

class Asteroid extends StraightMover {
    constructor(pos, v, radius = 10) {
        super(pos, v, radius);
        this.state = "alive";
    }
    draw() {
        let p = new Path2D();
        p.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
        if (this.state === "exploding") {
            ctx.fillStyle = "yellow";
        } else {
            ctx.fillStyle = "brown";
        }
        
        ctx.fill(p);
    }
}


function gameOver() {
    console.log("game over");
    state = "gameOver";
}

function isReadyToStart() {
    return (marcianito.complete && bg.complete && myVideo.readyState === 4);
}

function startMenu() {
    ctx.drawImage(bg, 0, 0, mainCanvas.width, mainCanvas.height);
    
    ctx.font = "50px 'Press Start 2P'";
    if (isReadyToStart()) {
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Destroy all asteroids before", mainCanvas.width / 2 , mainCanvas.height / 3 + 30 );
        ctx.fillText("the big mama destroys you!", mainCanvas.width / 2 , mainCanvas.height / 3 + 60);

        ctx.font = "24px 'Press Start 2P'";
        ctx.fillStyle = "red";
        ctx.fillText("Start", mainCanvas.width / 2 , mainCanvas.height * 2 / 3 - 30);
    } else {
        ctx.fillStyle = "grey";
        ctx.textAlign = "center";
        ctx.fillText("Loading", mainCanvas.width / 2 , mainCanvas.height / 2);
    }
}

function startGame() {
    console.log("start game");
    state = "game";
    saucer = new Saucer();
    score = 0;
    lastSpawn = 0;
    try {
        myVideo.currentTime = 5.44;
        myVideo.play();
    } catch (err) {
        console.log(err);
    }
}

function canvasClick(event) {
    console.log(event);
    switch(state) {
        case "startMenu":
            if (isReadyToStart()) {
                startGame();
            }
            break;
        case "game":
            saucer.fire(new v2D(event.x, event.y));
            break;
        case "gameOver":
            console.error("game over state should not be clickable");
            break;
        default:
            console.log("unknown state");
    }
}

function main() {
    mainCanvas = document.getElementById("mainCanvas");
    mainCanvas.willReadFrequently = true;
    ctx = mainCanvas.getContext("2d");

    mainCanvas.addEventListener("click", canvasClick);

    myVideo =  document.createElement("video");
    myVideo.muted = true;
    //myVideo.crossOrigin = "anonymous";
    myVideo.src = "footage.mp4";
    myVideo.onended = gameOver;

    myVideo.onloadeddata = function () {
        mainCanvas.width = myVideo.videoWidth;
        mainCanvas.height = myVideo.videoHeight;
    };

    bg = new Image();
    bg.src = "BACKGROUND_MARCIANITOS.svg";

    marcianito = new Image();
    marcianito.src = "MARCIANITO-01.svg";

    window.requestAnimationFrame(animate);
}