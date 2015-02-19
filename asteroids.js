function extend(ChildClass, ParentClass) {
  var parent = new ParentClass();
  ChildClass.prototype = parent;
  ChildClass.prototype.super = parent.constructor;
  ChildClass.prototype.constructor = ChildClass;
}
function random_position(canvas) {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height
  }
}
function copy_coords(coords) {
  return {
    x: coords.x,
    y: coords.y
  };
}
function middle(canvas) {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2
  }
}
function random_velocity(canvas) {
  return {
    x: (Math.random() - 0.5) * canvas.width * 0.005,
    y: (Math.random() - 0.5) * canvas.height * 0.005
  }
}
function random_angle() {
  return Math.random() * 2 * Math.PI;
}
function random_rotation() {
  return Math.random() * 2 * Math.PI * 0.01;
}
function distance_between(obj1, obj2) {
  return Math.sqrt(Math.pow(obj1.position.x - obj2.position.x,2) + Math.pow(obj1.position.y - obj2.position.y,2));
}
// THE GAME===========================

var fps = 20;//frames per second used at end of file

function Game(canvas) {
  this.canvas = canvas;
  this.c = this.canvas.getContext("2d");
  this.ship = new Ship(this, this.canvas);
  this.restart();
}
Game.prototype.restart = function() {
  this.asteroids = [];
  this.projectiles = [];
  this.objects = [];
  this.level = 1;
  this.reset_asteroids();
  this.ship.position = middle(this.canvas);
  this.ship.velocity = {x: 0, y: 0};
  this.ship.rotation_speed = 0;
  this.ship.angle = Math.PI;
  this.ship.life = 100;
  this.score = 0;
}
Game.prototype.reset_asteroids = function() {
  this.asteroids = [];
  for (var i=0;i<this.level;i++) {
    this.asteroids.push(new Asteroid(this, 2500, random_position(this.canvas), random_velocity(this.canvas), random_rotation()));
  }
}
Game.prototype.level_up = function() {
  this.level += 1;
  this.reset_asteroids();
}
Game.prototype.add_asteroid = function(asteroid) {
  this.asteroids.push(asteroid);
}
Game.prototype.update = function() {
  if(this.asteroids.length === 0) this.level_up();
  for (var i=0;i<this.objects.length;i++) {
    this.objects[i].update();
    if(this.objects[i].delete_me) this.objects.splice(i, 1);
  }
  for (var i=0;i<this.asteroids.length;i++) {
    if(this.asteroids[i].delete_me) {
      this.asteroids.splice(i, 1);
    } else {
      this.asteroids[i].update();      
    }
  }
  for (var i=0;i<this.projectiles.length;i++) {
    if(this.projectiles[i].delete_me) {
      this.projectiles.splice(i, 1);
    } else {
      this.projectiles[i].update();
    }
  }
  this.ship.update();
  this.detectCollisions();
  if(this.ship.life <=0) {
    this.restart();
  }
}
Game.prototype.refresh = function() {
  this.c.clearRect (0, 0, this.canvas.width, this.canvas.height);
  for (var i=0;i<this.projectiles.length;i++) {
    this.projectiles[i].refresh(this.c);
  }
  for (var i=0;i<this.asteroids.length;i++) {
    this.asteroids[i].refresh(this.c);
  }
  for (var i=0;i<this.objects.length;i++) {
    this.objects[i].refresh(this.c);
  }
  this.ship.refresh(this.c);
  this.c.save();
  this.c.fillStyle = 'white';
  this.c.strokeStyle = 'white';
  this.c.translate(this.canvas.width - 120, 20)
  this.c.beginPath();
  this.c.rect(0, 0, this.ship.life, 10);
  this.c.fill();
  this.c.rect(0, 0, 100, 10);
  this.c.stroke();
  this.c.restore();

  this.c.save();
  this.c.fillStyle = 'white';
  this.c.translate(20, 30)
  this.c.font = "14px Arial";
  this.c.fillText("level " + this.level,0,0);
  this.c.restore();

  this.c.save();
  this.c.fillStyle = 'white';
  this.c.translate(20, 50)
  this.c.font = "14px Arial";
  this.c.fillText("score: " + this.score,0,0);
  this.c.restore();

};
Game.prototype.detectCollisions = function() {
  var to_explodes = [];
  for(var i=0; i<this.asteroids.length; i++) {
    var asteroid = this.asteroids[i];
    for(var j=0; j<this.projectiles.length; j++) {
      var projectile = this.projectiles[j];
      var distance = distance_between(projectile, asteroid);
      if(!projectile.delete_me && distance < (asteroid.radius + projectile.radius)) {
        projectile.delete_me = true;
        to_explodes.push([asteroid, projectile.impact]);
      }      
    }
    var distance = distance_between(this.ship, asteroid);
    if(distance < asteroid.radius + this.ship.radius) {
      this.ship.life -=1;
    }
  }
  for(var i=0;i<to_explodes.length;i++) {
    to_explodes[i][0].explode(to_explodes[i][1]);
  }

}
Game.prototype.ApplyKey = function(e, value) {
    e = e || window.event;
    if (e.keyCode == '32') {// space bar
        this.ship.trigger = value;
    }
    if (e.keyCode == '38') {// up arrow
        this.ship.mainThruster = value;
    }
    else if (e.keyCode == '40') {// down arrow
        this.ship.retroThruster = value;        
    }
    else if (e.keyCode == '37') {//left arrow
        this.ship.leftBooster = value;
    }
    else if (e.keyCode == '39') {// right arrow
        this.ship.rightBooster = value;
    }
};
Game.prototype.keyDown = function(e) {
  this.ApplyKey(e, true);
};
Game.prototype.keyUp = function(e) {
  this.ApplyKey(e, false);
};


// Generic MASS===========================

function Mass(canvas, mass, position, velocity, rotation_speed) {
  this.canvas = canvas;
  this.mass = mass;
  this.position = position;
  this.velocity = velocity;
  this.angle = Math.PI;
  this.rotation_speed = rotation_speed;
  this.delete_me = false;
}

Mass.prototype.apply_force = function(angle, magnitude) {
  //sohcahtoa
  var force = {
    x: Math.sin(angle) * magnitude,
    y: Math.cos(angle) * magnitude
  }
  // f = ma
  this.velocity.x += force.x / this.mass;
  this.velocity.y += force.y / this.mass;
}

Mass.prototype.apply_torque = function(torque) {
  // f = ma
  this.rotation_speed += torque / this.mass;
}


Mass.prototype.update = function() {
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;
  if (this.position.x > this.canvas.width) {
    this.position.x -= this.canvas.width;    
  } else if (this.position.x < 0) {
    this.position.x += this.canvas.width;
  }
  if (this.position.y > this.canvas.height) {
    this.position.y -= this.canvas.height;    
  } else if (this.position.y < 0) {
    this.position.y += this.canvas.height;
  }
  this.angle += this.rotation_speed;
  if(this.angle > 2 * Math.PI) {
    this.angle -= 2 * Math.PI;
  }
  if(this.angle < 0) {
    this.angle += 2 * Math.PI;
  }
}

Mass.prototype.refresh = function(c) {
  c.beginPath();
    c.arc(this.position.x, this.position.y, 5, 0, 2 * Math.PI, false);
  c.lineWidth = 2;
  c.strokeStyle = '#007300';
  c.stroke();
}

// ASTEROIDS===========================

Asteroid = function(game, mass, position, velocity, rotation_speed) {
  this.super(game.canvas, mass, position, velocity, rotation_speed);
  this.game = game;
  this.density = 0.3 + Math.random() * 0.2;
  this.area = this.mass / this.density;
  //r = sqrt(area/PI)
  this.radius = Math.pow(this.area / Math.PI, 1/2);
  this.bumpiness = 0.25 + Math.random() * 0.5;
  this.randoms = [];
  var vertices = (5 + Math.random() * 10).toFixed()
  for(var i=0; i<vertices; i++) {
    this.randoms.push(this.radius * (1 - this.bumpiness) + this.radius * this.bumpiness * Math.random());
  }
}
extend(Asteroid, Mass);


Asteroid.prototype.refresh = function(c) {
  var angle = Math.PI * 2 / this.randoms.length;
  c.save();
  c.translate(this.position.x, this.position.y);
  c.rotate(this.angle);
  c.beginPath();
  c.moveTo(0, this.randoms[this.randoms.length - 1]);
  for (var i=0;i<this.randoms.length;i++) {
    c.rotate(angle);
    c.lineTo(0, this.randoms[i]);
  }
  c.lineWidth = 2;
  c.strokeStyle = '#00a300';
  c.fillStyle = '#00a300';
  c.font = "10px Arial";
  c.fillText(this.mass.toString(), -5, 0);
  c.stroke();
  c.restore();
}
Asteroid.prototype.update = function() {
  if(this.mass < 100) this.delete_me = true;
  Mass.prototype.update.apply(this, arguments);
}
Asteroid.prototype.explode = function(impact) {
  this.delete_me = true;
  var new_mass = (this.mass - impact) / 2;
  if(new_mass >= 100) {
    var new_vel = copy_coords(this.velocity);
    new_vel.x *= 0.95;
    new_vel.y *= 0.95;
    var a1 = new Asteroid(this.game, new_mass, copy_coords(this.position), new_vel, this.rotation_speed);
    var a2 = new Asteroid(this.game, new_mass, copy_coords(this.position), copy_coords(new_vel), this.rotation_speed);
    a1.density = this.density;
    a2.density = this.density;
    var split_angle1 = random_angle();
    var split_angle2 = (split_angle1 + Math.PI) % (Math.PI * 2);
    a1.apply_force(split_angle1, impact);
    a2.apply_force(split_angle2, impact);
    a1.apply_torque(impact/10);
    a2.apply_torque(-impact/10);
    this.game.add_asteroid(a1);
    this.game.add_asteroid(a2);
    this.game.score += impact;
  } else {
    this.game.score += this.mass;
  }
};


// THE SHIP===========================

Ship = function(game) {
  this.super(game.canvas, 1000, {x: game.canvas.width / 2, y: game.canvas.height / 2}, {x: 0, y: 0}, 0)
  this.game = game;

  this.mainThruster = false;
  this.leftBooster = false;
  this.rightBooster = false;
  this.retroThruster = false;
  this.trigger = false;

  this.life = 100;
  this.radius = 5;

  this.power = 70;
  this.torque = 2.5;
  this.friction = 0.995;

  this.shooting_power = 200;
  this.reload_time = 15;
  this.reload_in = 0;
  this.projectile_mass = 100;
  this.projectile_life = 200;
  this.projectile_impact = 100;
}
extend(Ship, Mass);
Ship.prototype.refresh = function(c) {
  var unit = this.radius;
  c.save();
  c.translate(this.position.x, this.position.y);
  c.rotate(-this.angle);
  c.beginPath();
  c.moveTo(0, 2*unit);
  c.rotate(Math.PI * 2 / 3);
  c.lineTo(0, 1*unit);
  c.rotate(Math.PI * 2 / 3);
  c.lineTo(0, 1*unit);
  c.rotate(Math.PI * 2 / 3);
  c.lineTo(0, 2*unit);
  c.lineWidth = 2;
  c.strokeStyle = '#00a300';
  c.stroke();
  c.restore();
}
Ship.prototype.apply_friction = function() {
  this.rotation_speed *= this.friction; //retard the rotation for gameplay reasons
  this.velocity.x *= this.friction; //retard the speed for gameplay reasons
  this.velocity.y *= this.friction; //retard the speed for gameplay reasons
}
Ship.prototype.update = function() {
  this.apply_torque(this.torque * (this.leftBooster - this.rightBooster));
  var force_magnitude = this.power * (this.mainThruster - this.retroThruster);
  this.apply_force(this.angle, force_magnitude);
  if (this.trigger && this.reload_in === 0) {
    var projectile = new Projectile(this);
    projectile.apply_force(this.angle, this.shooting_power);
    this.apply_force(this.angle - Math.PI, this.shooting_power);
    this.game.projectiles.push(projectile);
    this.reload_in = this.reload_time;
  }
  if(this.reload_in > 0) this.reload_in -= 1;
  this.apply_friction();
  Mass.prototype.update.apply(this, arguments);
}
Ship.prototype.launch_position = function() {
  return {
    x: this.position.x + this.velocity.x + Math.sin(this.angle) * this.radius * 2,
    y: this.position.y + this.velocity.y + Math.cos(this.angle) * this.radius * 2
  };
}


// PROJECTILES===========================

Projectile = function(ship) {
  this.super(ship.canvas, ship.projectile_mass, ship.launch_position(), {x: ship.velocity.x, y: ship.velocity.y}, 0)
  this.impact = ship.projectile_impact;
  this.life = ship.projectile_life;
  this.radius = 1;
}
extend(Projectile, Mass);
Projectile.prototype.update = function() {
  this.life -= 1;
  if (this.life <= 0) {
    this.delete_me = true;
  }
  Mass.prototype.update.apply(this, arguments);  
}
Projectile.prototype.refresh = function(c) {
  c.save();
  c.translate(this.position.x, this.position.y);
  c.beginPath();
  c.arc(0,0,Math.min(this.life / 100, 2),0,2*Math.PI);
  c.lineWidth = 1;
  c.strokeStyle = '#00a300';
  c.stroke();
  c.restore();
}


// PARTICLES===========================

Particle = function(game, position, velocity) {
  this.super(game.canvas, game.particle_mass(), position, velocity, 0)
  this.life = game.particle_life;
  game.objects.push(this);
}
extend(Particle, Mass);
Particle.prototype.update = function() {
  this.life -= 1;
  if (this.life <= 0) {
    this.delete_me = true;
  }
  Mass.prototype.update.apply(this, arguments);  
}
Particle.prototype.refresh = function(c) {
  c.save();
  c.translate(this.position.x, this.position.y);
  c.beginPath();
  c.arc(0,0,Math.min(this.life / 100, 2),0,2*Math.PI);
  c.lineWidth = 1;
  c.fillStyle = '#dd3300';
  c.fill();
  c.restore();
}


var canvas = document.getElementById("asteroids");
var game = new Game(canvas);
var framerate = 1000 / fps;//milliseconds between frames


window.onkeydown = game.keyDown.bind(game);
window.onkeyup = game.keyUp.bind(game);

var previous;
function step(timestamp) {
  if (!previous) previous = timestamp;
  var progress = timestamp - previous;
  game.update();
  if (progress >= framerate) {
    game.refresh();
    previous = timestamp;
  }
  window.requestAnimationFrame(step);
}
window.requestAnimationFrame(step);