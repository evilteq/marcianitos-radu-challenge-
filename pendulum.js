let mainCanvas,
    myVideo,
    ctx,
    bg,
    colliders = [],
    state = "startMenu",
    saucer,
    bigMama,
    bigMamaSvgOk,
    bigMamaSvgNok,
    miniAsteroid = [],
    t,
    dt,
    score,
    lastSpawn;
const saucerStartLifePoints = 5,
    bigMamaStartLifePoints = 100;

function animate() {
    switch (state) {
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
    let aY = (a instanceof BigMama) ? a.pos.y + 110 : a.pos.y;
    let bY = (b instanceof BigMama) ? b.pos.y + 110 : b.pos.y;

    if (a.radius && b.radius) {
        return Math.pow(a.pos.x - b.pos.x, 2) + Math.pow(aY - bY, 2) < Math.pow(a.radius + b.radius, 2);
    } else {
        console.error("collide function not supported");
    }
}

function drawHealthBar(x, y, width, height, percent) {
    ctx.fillStyle = "grey";
    ctx.fillRect(x, y, width, height);
    if (percent > 0.70) {
        ctx.fillStyle = "green";
    } else if (percent > 0.30) {
        ctx.fillStyle = "yellow";
    } else {
        ctx.fillStyle = "red";
    }

    ctx.fillRect(x + 1, y + 1, width * percent - 2, height - 2);
}

function game() {
    //draw the video so we can get the pixel data
    ctx.drawImage(myVideo, 0, 0, mainCanvas.width, mainCanvas.height);
    let newt = myVideo.currentTime;
    dt = newt - t;
    t = newt;

    //get position of the ball
    const locs = getMarkedLocations(ctx, [56, 150, 215]);
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

    bigMama.update(dt);
    bigMama.draw();

    // move all the bullets and the enemies, remove all those whoe goes out of screen or have died
    colliders.forEach((collider, i, object) => {
        collider.update(dt);
        if ((collider.pos.y < 0) || (collider.pos.y > mainCanvas.height) || (collider.pos.x < 0) || (collider.pos.x > mainCanvas.width)) {
            object.splice(i, 1);
        }
        if (collider.state === "exploding" && t - collider.deathTime > 0.25) {
            object.splice(i, 1);
        }
    });

    for (let i = 0; i < colliders.length; i++) {
        for (let j = i + 1; j < colliders.length; j++) {
            if (colliders[i].state == "alive" && colliders[j].state == "alive" && collide(colliders[i], colliders[j])) {
                colliders[i].state = "exploding";
                colliders[j].state = "exploding";
                colliders[i].deathTime = t;
                colliders[j].deathTime = t;
            }
        }
    }

    colliders.forEach((collider, i, object) => {
        if (collider.state === "alive") {
            if ((collider instanceof Asteroid) && collide(collider, saucer)) {
                if (collider instanceof BigMama) {
                    saucer.hit(saucerStartLifePoints);
                } else {
                    saucer.hit();
                }
                collider.state = "exploding";
            }
            if (collide(collider, bigMama)) {
                if (collider instanceof Bullet) {
                    bigMama.hit();
                }                
                collider.state = "exploding";
            }
        }
    });

    if ((saucer.lifePoints <= 0) || (bigMama.lifePoints <= 0)) {
        state = "gameOver";
        return;
    }

    drawHealthBar(80, 10, 100, 20, saucer.lifePoints / saucerStartLifePoints);
    drawHealthBar(mainCanvas.width - 190, 10, 100, 20, bigMama.lifePoints / bigMamaStartLifePoints);

    colliders.forEach((collider) => {
        collider.draw();
    });

    if (true) {
    if (lastSpawn > 0.3) {
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
        this.radius = 45;
        this.bb = new v2D(this.width, this.width * marcianito.height / marcianito.width);
        this.lifePoints = saucerStartLifePoints;
    }

    draw() {
        let left = this.pos.x - this.bb.x / 2;
        if (left < 0) {
            left = 0;
        }
        if (left + this.bb.x > mainCanvas.width) {
            left = mainCanvas.width - this.bb.x;
        }

        ctx.drawImage(marcianito, left, this.pos.y - this.bb.y / 2 - 20, this.bb.x, this.bb.y);
    }

    fire(to) {
        const from = new v2D(this.pos.x, this.pos.y - 70);
        let v = new v2D(to.x - from.x, to.y - from.y);
        v.setMagnitude(200);
        colliders.push(new Bullet(from, v));
    }
    hit(i = 1) {
        this.lifePoints -= i;
        if (this.lifePoints <= 0) {
            gameOver();
        }
    }
}

class StraightMover {
    constructor(pos, v, radius = 3) {
        this.pos = pos;
        this.v = v;
        this.radius = radius;
        this.state = "alive";
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
        if (this.state === "exploding") {
            ctx.fillStyle = "rgba(200, 200, 0, 0.8)";
        } else {
            ctx.fillStyle = "red";
        }
        ctx.fill(p);
    }
}

class Asteroid extends StraightMover {
    constructor(pos, v, radius = 10) {
        super(pos, v, radius);
        this.fragments = [];
        this.miniAsteroidIndex = Math.floor(Math.random() * 3);
    }
    explode() {
        for (let i = 0; i <= 75; i++) {
            let dx = (Math.random() - 0.5) * (Math.random() * 6);
            let dy = (Math.random() - 0.5) * (Math.random() * 6);
            let radius = Math.random() * this.radius / 4;
            let fragment = new AsteroidFragment(this.pos.x, this.pos.y, radius, dx, dy);
            this.fragments.push(fragment);
        }
    }
    draw() {
        switch (this.state) {
            case "exploding":
                if (this.fragments.length === 0) {
                    this.explode();
                }
                this.fragments.forEach((fragment, i) => {
                    if (fragment.alpha <= 0) {
                        this.fragments.splice(i, 1);
                    } else {
                        fragment.update();
                    }
                })
                if (this.fragments.length === 0) {
                    this.state = 'exploded';
                }
                break;
            case 'exploded':
                break;
            default:
                ctx.drawImage(miniAsteroid[this.miniAsteroidIndex], this.pos.x - this.radius, this.pos.y - this.radius, this.radius * 2, this.radius * 2);
        }
    }
}
class AsteroidFragment {
    constructor(x, y, radius, dx, dy) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = dx;
        this.dy = dy;
        this.alpha = 1;
        this.colour = {r: 255, g: 165, b: 0}
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#' + this.colour.r.toString(16).padStart(2, '0')
            + this.colour.g.toString(16).padStart(2, '0')
            + this.colour.b.toString(16).padStart(2, '0');

        /* Begins or reset the path for
           the arc created */
        ctx.beginPath();

        /* Some curve is created*/
        ctx.arc(this.x, this.y, this.radius,
            0, Math.PI * 2, false);

        ctx.fill();

        /* Restore the recent canvas context*/
        ctx.restore();
    }
    update() {
        this.draw();
        this.alpha -= 0.02;
        this.x += this.dx;
        this.y += this.dy;
        this.colour.g -= 8;
        if (this.colour.g < 0) {
            this.colour.g = 0;
        }
    }
}

class BigMama extends Asteroid {
    constructor(pos, v, radius) {
        super(pos, v, radius);
        this.bb = new v2D(this.radius * 2, this.radius * 2 * bigMamaSvgOk.height / bigMamaSvgOk.width);
        this.lifePoints = bigMamaStartLifePoints;
    }

    draw() {
        ctx.drawImage(bigMamaSvgOk, this.pos.x - this.radius, this.pos.y - this.radius, this.bb.x, this.bb.y);
        //drawCircle(ctx, this.pos.x, this.pos.y + 110, 60, "green");
    }

    hit() {
        this.lifePoints--;
        if (this.lifePoints <= 0) {
            gameOver();
        }
    }
}

drawCircle = (ctx, x, y, radius, color) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}


function gameOver() {
    console.log("game over");
    ctx.drawImage(bg, 0, 0, mainCanvas.width, mainCanvas.height);
    ctx.font = "16px 'Press Start 2P'";
    if (bigMama.lifePoints > 0) {
        ctx.drawImage(bigMamaSvgOk, mainCanvas.width / 2 - 75, 40, 150, 150 * bigMamaSvgOk.height / bigMamaSvgOk.width);

        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("You lost!", mainCanvas.width / 2, 2 * mainCanvas.height / 3 + 60);
        ctx.fillText("Big Mama destroys you!", mainCanvas.width / 2, 2 * mainCanvas.height / 3 + 90);
    } else {
        ctx.drawImage(marcianito, 50, 40, 230, 230 * marcianito.height / marcianito.width);
        ctx.drawImage(bigMamaSvgNok, 300, 40, 150, 150 * bigMamaSvgNok.height / bigMamaSvgNok.width);

        ctx.font = "24px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("You win!", mainCanvas.width / 2, 2 * mainCanvas.height / 3 + 80);
    }
}

function isReadyToStart() {
    return (marcianito.complete && bg.complete && bigMamaSvgOk.complete && bigMamaSvgNok.complete && myVideo.readyState === 4);
}

function startMenu() {
    ctx.drawImage(bg, 0, 0, mainCanvas.width, mainCanvas.height);

    ctx.font = "50px 'Press Start 2P'";
    if (isReadyToStart()) {
        ctx.font = "15px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Beware of little asteroids and", mainCanvas.width / 2, mainCanvas.height / 3 + 30);
        ctx.fillText("destroy the big mama before you", mainCanvas.width / 2, mainCanvas.height / 3 + 60);
        ctx.fillText("stop and she gets to you!", mainCanvas.width / 2, mainCanvas.height / 3 + 90);

        ctx.font = "24px 'Press Start 2P'";
        ctx.fillStyle = "red";
        ctx.fillText("Start", mainCanvas.width / 2, mainCanvas.height * 2 / 3 - 30);
    } else {
        ctx.fillStyle = "grey";
        ctx.textAlign = "center";
        ctx.fillText("Loading", mainCanvas.width / 2, mainCanvas.height / 2);
    }
}

function startGame() {
    console.log("start game");
    saucer = new Saucer();
    bigMama = new BigMama(new v2D(mainCanvas.width / 2, 60), new v2D(0, 3), 50);
    state = "game";
    colliders = [];
    score = 0;
    lastSpawn = 0;
    t = 0;
    dt = 0;
    try {
        myVideo.currentTime = 0;
        myVideo.play();
    } catch (err) {
        console.log(err);
    }
}

function canvasClick(event) {
    console.log(event);
    switch (state) {
        case "startMenu":
            if (isReadyToStart()) {
                startGame();
            }
            break;
        case "game":
            saucer.fire(new v2D(event.x, event.y));
            break;
        case "gameOver":
            startGame();
            break;
        default:
            console.log("unknown state");
    }
}

function main() {
    mainCanvas = document.getElementById("mainCanvas");
    ctx = mainCanvas.getContext("2d", { willReadFrequently: true });

    mainCanvas.addEventListener("click", canvasClick);

    myVideo = document.createElement("video");
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

    bigMamaSvgOk = new Image();
    bigMamaSvgOk.src = "BIG_MAMA_OK.svg";

    bigMamaSvgNok = new Image();
    bigMamaSvgNok.src = "BIG_MAMA_NOK.svg";

    miniAsteroid[0] = new Image();
    miniAsteroid[0].src = "MINIASTEROIDE_01.svg";
    miniAsteroid[1] = new Image();
    miniAsteroid[1].src = "MINIASTEROIDE_02.svg";
    miniAsteroid[2] = new Image();
    miniAsteroid[2].src = "MINIASTEROIDE_03.svg";

    window.requestAnimationFrame(animate);
}