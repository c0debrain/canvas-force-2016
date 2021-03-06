// Crossbrowser requestAnimationFrame
var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
if (!isMobile.any()) {
		canvas.width  = 320;
		canvas.height = 480;
		canvas.style.border = "1px solid #000";
}
document.body.appendChild(canvas);


var lastTime;
function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000.0;


  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
}

resources.load([
  'img/ship_sprite1.png',
  'img/bullet.png',
  'img/sand-texture4.jpg',
  'img/tank1.png',
  'img/explosions2.png',
  'img/missile.png',
  'img/missile_burst.png'
]);
resources.onReady(displayStart);

function displayStart () {
  terrainPattern = ctx.createPattern(resources.get('img/sand-texture4.jpg'), 'repeat');
  ctx.fillStyle = terrainPattern;
  ctx.fillRect(0,0,canvas.width, canvas.height);
  document.getElementById("start").className = "";
  document.getElementById("start").addEventListener('click', function (e) {
    init();
    document.getElementById("start").className = "hidden";
    document.getElementById("scorecard").className = "group container";
  });
}



function init() {
  var scores = ajax.getScores(addToTable);

  terrainPattern = ctx.createPattern(resources.get('img/sand-texture4.jpg'), 'repeat');

  document.getElementById('play-again').addEventListener('click', function () {
    $("#sendScore").removeClass("hidden");
    window.location.reload();
  });
  reset();

  window.intervalId = setInterval(
    function () {
       generateEnemy("tank");
    },
    1500
  );

  lastTime = Date.now();
  main();
}

// Sprite options hash contains: url, pos, size, speed, frames, dir, once
// dir is a vector of dx, dy
var player = {
  life: 40,
  pos: [20, 20],
  lastFire: Date.now(),
  sprite: new Sprite({
    url: 'img/ship_sprite1.png',
    pos: [0, 0],
    size: [49, 42],
    fakeSize: [25, 25],
    speed: 10,
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    once: true
  })
};

function resetPlayer() {
  lifeEl.className = "";
  player.life = 80;
  player.sprite.done = false;
  player.sprite._index = 0;
}

function generateEnemy (type) {
  if (enemies.length < 5) {
    if (type === "tank") {

      var position = getRandomPos([40, -10], [290, -10]);
      while (enemyConflict(position, type)) {
        position = getRandomPos([40, 40], [290, 100]);
      }

      var tank = ({
        type: "tank",
        life: 40,
        pos: position,
        lastFire: -2000,
        sprite: new Sprite({
          url: 'img/tank1.png',
          pos: [49, 0],
          size: [49, 90],
          speed: 10,
          frames: [0],
          once: true,
          enemyPos: player.pos,
          dependentSprite: new Sprite({
            url: 'img/tank1.png',
            pos: [0, 0],
            size: [49, 90],
            speed: 0,
            frames: [0],
            once: true,
            offset: [-27, -25]
          })
        })
      });
      enemies.push(tank);
    }
  }
}

function enemyConflict(position, type) {
  var size1;
  if (type === "tank") {
    size1 = [49, 90];
  }
  // debugger
  var value = enemies.some(function (el) {
    return boxCollides(position, size1, el.pos, el.sprite.size);
  }, this);
  return value;
}

function getRandomPos(bound1, bound2) {
  var x = (Math.random() * (bound2[0] - bound1[0])) + bound1[0];
  var y = (Math.random() * (bound2[1] - bound1[1])) + bound1[1];

  return [x, y];
}

var bullets = [],
    enemies = [],
    enemyPos = [],
    explosions = [];

var gameTime = 0,
    isGameOver;

var score = 0,
    scoreEl = document.getElementById('score');

var life = 100,
    lifeEl = document.getElementById('life');

var playerSpeed = 200,
    enemySpeed = -80,
    bulletSpeed = 400;

function update (dt) {
  gameTime += dt;

  handleInput(dt);
  updateEntities(dt);

  scoreEl.innerHTML = score;
  lifeEl.innerHTML = player.life;

  if (player.life <= 40) {
    lifeEl.setAttribute("class", "red");
  }
}

function handleInput(dt) {
  if (!isGameOver) {
    if(input.isDown('DOWN') || input.isDown('s')) {
      player.pos[1] += playerSpeed * dt;
    }

    if(input.isDown('UP') || input.isDown('w')) {
      player.pos[1] -= playerSpeed * dt;
    }

    if(input.isDown('LEFT') || input.isDown('a')) {
      player.pos[0] -= playerSpeed * dt;
    }

    if(input.isDown('RIGHT') || input.isDown('d')) {
      player.pos[0] += playerSpeed * dt;
    }

    if(input.isDown('SPACE') &&
    !isGameOver &&
    Date.now() - player.lastFire > 200) {
      var x = player.pos[0] + 21;
      var y = player.pos[1] - 14;
      bullets.push({
        type: player,
        pos: [x, y],
        dir: [0, 1],
        speed: 500,
        sprite: new Sprite({
          url: 'img/bullet.png',
          pos: [0, 0],
          size: [9, 22]
        })
      });

      player.lastFire = Date.now();
    }
  }
}

function updateEntities(dt) {
  // update the player first
  player.sprite.update(dt);

  var i;
  // update bullets
  for (i = 0; i < bullets.length; i++) {
    // debugger
    var bullet = bullets[i];

    bullet.pos[0] -= bullet.speed * dt * bullet.dir[0];
    bullet.pos[1] -= bullet.speed * dt * bullet.dir[1];

    if (outOfBounds(bullet)) {
      bullet.remove = true;
    }
  }

  // update enemy position
  for (i = 0; i < enemies.length; i++) {
    var enemy = enemies[i];
    if (enemy.remove) { continue; }
    enemy.pos[1] -= enemySpeed * dt;
    enemy.sprite.update(dt);
    enemy.sprite.rotation = getRotation(enemy);

    var angle = enemy.sprite.rotation;
    bulletDir = [Math.sin(angle), -Math.cos(angle)];
    if (!isGameOver &&
    Date.now() - enemy.lastFire > 2000) {
      var x = enemy.pos[0] + (Math.sin(angle));
      var y = enemy.pos[1] - (Math.cos(angle));

      bullets.push({
        type: "enemy",
        pos: [x, y],
        dir: bulletDir,
        speed: 800,
        sprite: new Sprite({
          url: 'img/missile_burst.png',
          pos: [0, 0],
          size: [23, 32],
          rotation: angle,
          flip: true
        })
      });

      enemy.lastFire = Date.now();
    }

    if (outOfBounds(enemy)) {
      enemy.remove = true;
    }

    if (enemy.life <= 0) {
      score += 100;
      enemy.remove = true;
    }
  }

  // update explosions!
  for (i = 0; i < explosions.length; i++) {
    explosions[i].sprite.update(dt);

    if (outOfBounds(explosions[i])) {
      explosions[i].remove = true;
    }

    if (explosions[i].sprite.done && explosions[i].sprite.removeWhenDone) {
      explosions[i].remove = true;
    }
  }

  removeEntities();
}

function getRotation(enemy) {
  pos1 = enemy.pos;
  pos2 = player.pos;

  dx = pos2[0] + 30 - pos1[0];
  dy = pos2[1] + 30 - pos1[1];

  var deg = Math.atan(- dx / dy);

  if (dy < 0) {
    deg += Math.PI;
  }
  return deg;
}

function removeEntities() {
  var i;
  var list = [bullets, enemies, explosions];

  for (i = 0; i < list.length; i++) {
    var item = list[i];
    for (var j = 0; j < item.length; j++) {
      if (item[j].remove === true) {
        list[i].splice(j, 1);
        j--;
      }
    }
  }
}

function outOfBounds(sprite) {
  if (sprite.pos[1] < -50 ||
      sprite.pos[1] > canvas.height + 20 ||
      sprite.pos[0] > canvas.width + 20 ||
      sprite.pos[0] < -50
    ) {
    return true;
  }
  return false;
}

function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
    return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
}

function checkCollisions () {
  checkPlayerBounds();

  for(var i=0; i<enemies.length; i++) {
    var pos = [enemies[i].pos[0] - 30, enemies[i].pos[1] - 30];
    var size = enemies[i].sprite.size;

    for(var j=0; j<bullets.length; j++) {
      var pos2 = bullets[j].pos;
      var size2 = bullets[j].sprite.size;

      // Bullet - player collision
      if (bullets[j].type === "enemy") {
        fakePlayerX = player.pos[0] + 20;
        fakePlayerY = player.pos[1] + 10;
        var playerPos = [fakePlayerX, fakePlayerY];
        var fakePlayerSx = player.sprite.size[0] / 2;
        var fakePlayerSy = player.sprite.size[1] / 2 - 7;
        fakePlayerSize = [fakePlayerSx, fakePlayerSy];
        if(boxCollides(playerPos, fakePlayerSize, pos2, size2)) {
          player.life -= 20;
          if (player.life <= 0) {
            gameOver();
          }
          explosions.push({
            pos: player.pos,
            sprite: new Sprite({
              url: 'img/explosions2.png',
              pos: [-4, 0],
              size: [63.5, 61],
              speed: 16,
              frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
              dir: null,
              once: true,
              removeWhenDone: true
            })
          });
          bullets[j].remove = true;
          removeEntities();
          break;
        }

      }

      // After that check, go to next bullet if this ones and enemy
      if (bullets[j].type === "enemy") { continue; }

      // Bullet-enemy collision
      if(boxCollides(pos, size, pos2, size2)) {
        enemies[i].life -= 20;

        explosions.push({
          pos: pos,
          sprite: new Sprite({
            url: 'img/explosions2.png',
            pos: [-4, 0],
            size: [63.5, 61],
            speed: 16,
            frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            dir: null,
            once: true,
            removeWhenDone: true
          })
        });

        // Remove the bullet and stop this iteration
        // bullets.splice(j, 1);
        bullets[j].remove = true;
        removeEntities();
        break;
      }
    }

    // Tank-enemy collision
    if(boxCollides(pos, size, player.pos, player.sprite.size)) {
      gameOver();
      explosions.push({
        pos: player.pos,
        sprite: new Sprite({
          url: 'img/explosions2.png',
          pos: [-4, 0],
          size: [63.5, 61],
          speed: 16,
          frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          dir: null,
          once: true,
          removeWhenDone: true
        })
      });
    }
  }
}

function checkPlayerBounds () {
  if(player.pos[0] < 0) {
    player.pos[0] = 0;
  }
  else if(player.pos[0] > canvas.width - player.sprite.size[0]) {
    player.pos[0] = canvas.width - player.sprite.size[0];
  }

  if(player.pos[1] < 0) {
    player.pos[1] = 0;
  }
  else if(player.pos[1] > canvas.height - player.sprite.size[1]) {
    player.pos[1] = canvas.height - player.sprite.size[1];
  }
}

var offset_y = 0;

function render () {
  offset_y += 3;
  ctx.translate(0, offset_y);

  ctx.fillStyle = terrainPattern;
  ctx.fillRect(0, -offset_y, canvas.width, canvas.height);

  ctx.translate(0, -offset_y);

  if(!isGameOver) {
    renderEntity(player);
  }
  checkCollisions();

  renderEntities(bullets);
  renderEntities(enemies);
  renderEntities(explosions);
}

function renderEntities(list) {
  for (var i = 0; i < list.length; i++) {
    renderEntity(list[i]);
  }
}

function renderEntity(entity) {
  ctx.save();
  ctx.translate(entity.pos[0], entity.pos[1]);

  entity.sprite.render(ctx);
  ctx.restore();
}

// Game over
function gameOver() {
  document.getElementById('game-over').style.display = 'block';
  document.getElementById('game-over-overlay').style.display = 'block';
  isGameOver = true;
  window.clearInterval(intervalId);
}

// Reset game to original state
function reset() {

  if (window.intervalId) {
    window.clearInterval(intervalId);
    window.intervalId = setInterval(
      function () {
        generateEnemy("tank");
      },
      1500
    );
  }


  document.getElementById('game-over').style.display = 'none';
  document.getElementById('game-over-overlay').style.display = 'none';
  isGameOver = false;
  gameTime = 0;
  score = 0;

  enemies = [];
  bullets = [];
  resetPlayer();
  player.pos = [canvas.width/2 - 21, canvas.height - 80];
}
