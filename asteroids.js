(function(window, undefined) {

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
  return { x: coords.x, y: coords.y };
}
function middle(canvas) {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2
  }
}
function random_velocity(canvas) {
  //cross canvas in about 10s
  return {
    x: (Math.random() - 0.5) * canvas.width * 0.1,
    y: (Math.random() - 0.5) * canvas.height * 0.1
  }
}
function random_angle() {
  return Math.random() * 2 * Math.PI;
}
function random_rotation() {
  return (0.5 - Math.random()) * Math.PI * 0.5;
}
function distance_between(obj1, obj2) {
  return Math.sqrt(Math.pow(obj1.position.x - obj2.position.x,2) + Math.pow(obj1.position.y - obj2.position.y,2));
}
function compare(a,b) {
  if (a.score === b.score) return 0;
  if (a.score > b.score) {
    return -1;
  } else {
    return 1;
  }
}
// THE GAME===========================

function Game(canvas) {
  this.version = 0.3;
  this.canvas = canvas;
  this.c = this.canvas.getContext("2d");
  this.load_scores();
  this.ship = new Ship(this, this.canvas);
  this.waiting = true;
  this.speed = 1;
  this.muted = true;
}
Game.prototype.restart = function() {
  this.waiting = false;
  this.asteroids = [];
  this.projectiles = [];
  this.powerups = [];
  this.objects = [];
  this.level = 1;
  this.reset_asteroids();
  this.ship.reset();
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
Game.prototype.update = function(elapsed) {
  elapsed *= this.speed;
  if (this.waiting) return;
  if(this.asteroids.length === 0) this.level_up();
  for (var i = 0; i < this.objects.length; i++) {
    if(this.objects[i].delete_me) {
      this.objects.splice(i, 1);
    } else {
      this.objects[i].update(elapsed);
    }
  }
  for (var i = 0; i < this.asteroids.length; i++) {
    if(this.asteroids[i].delete_me) {
      this.asteroids.splice(i, 1);
    } else {
      this.asteroids[i].update(elapsed);
    }
  }
  for (var i = 0; i < this.projectiles.length; i++) {
    if(this.projectiles[i].delete_me) {
      this.projectiles.splice(i, 1);
    } else {
      this.projectiles[i].update(elapsed);
    }
  }
  this.ship.update(elapsed);
  this.detectCollisions(elapsed);
  if(this.ship.life <= 0) {
    if (this.scores.length < 10 || this.score > this.scores[this.scores.length-1]['score']) this.save_score();
    this.waiting = true;
  }
  if (Math.random() > 0.999) {
    var possible = "AFMWLR"; //Ammo, Friction, Manouverability, Weapon, Life, Rate
    var bonus = possible.charAt(Math.floor(Math.random() * possible.length));
    this.powerups.push(new PowerUp(this, bonus));
  }
}
Game.prototype.save_score = function() {
  this.load_scores();
  var name = window.prompt('Please enter your name');
  if (name !== null && name !== "") {
    this.scores.push({
      name: name,
      score: this.score
    })
    this.scores = this.scores.sort(compare);
    this.scores = this.scores.slice(0, 10);
  }
  this.save_scores();
}
Game.prototype.load_scores = function() {
  if(typeof(Storage) !== "undefined") {
    var local_data = JSON.parse(localStorage.getItem("asteroids")) || {};
    var version = local_data.version || 0.1;
    if(version < this.version) {
      alert("New version installed, clearing scores.");
      this.scores = [];
      this.save_scores();
    } else {
      this.scores = local_data['scores'] || [];
    }
  } else {
    this.scores = [];
  }
}
Game.prototype.save_scores = function() {
  if(typeof(Storage) !== "undefined") {
    var local_data = JSON.parse(localStorage.getItem("asteroids")) || {};
    local_data['scores'] = this.scores;
    local_data['version'] = this.version;
    localStorage.setItem("asteroids", JSON.stringify(local_data));
  }
}

Game.prototype.refresh = function() {
  this.c.clearRect (0, 0, this.canvas.width, this.canvas.height);

  this.c.save();
  this.c.translate(this.canvas.width - 35, this.canvas.height - 10)
  this.c.font = "14px Arial";
  this.c.fillStyle = 'white';
  this.c.fillText("v" + this.version,0,0);
  this.c.restore();

  if (this.waiting) {
    this.c.save();
    this.c.fillStyle = 'white';
    this.c.font = "bold 16px Arial";
    this.c.translate(0, 100)
    this.c.fillText('Name',100,0);
    this.c.fillText('Score',this.canvas.width - 150,0);
    this.c.font = "16px Arial";
    this.c.translate(0, 15)
    for (var i=0;i<Math.min(this.scores.length, 10);i++) {
      this.c.translate(0, 15)
      this.c.fillText(i + 1,100,0);
      this.c.fillText(this.scores[i]['name'],140,0);
      this.c.fillText(this.scores[i]['score'],this.canvas.width - 150,0);
      this.c.translate(0, 15)
    }
    this.c.translate(0, 50)
    this.c.fillText('press space to start',180,0);
    this.c.restore();
    return;
  }

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

  this.c.save();
  this.c.fillStyle = 'white';
  this.c.strokeStyle = 'white';
  this.c.translate(20, 70)
  this.c.font = "14px Arial";
  this.c.fillText("ammo: ",0,0);
  this.c.beginPath();
  this.c.rect(50, -10, this.ship.ammo * 100 / this.ship.max_ammo, 10);
  this.c.fill();
  this.c.rect(50, -10, 100, 10);
  this.c.stroke();
  this.c.restore();


};
Game.prototype.detectCollisions = function(elapsed) {
  for(var i=0; i<this.asteroids.length; i++) {
    var asteroid = this.asteroids[i];
    for(var j=0; j<this.projectiles.length; j++) {
      var projectile = this.projectiles[j];
      if(projectile.delete_me) continue;
      var distance = distance_between(projectile, asteroid);
      if(distance < (asteroid.radius() + projectile.radius())) {
        projectile.delete_me = true;
        asteroid.explode(projectile);
      }
    }
    var distance = distance_between(this.ship, asteroid);
    if(distance < asteroid.radius() + this.ship.radius()) {
      this.ship.life -=1;
    }
  }
  for(var i=0; i<this.powerups.length; i++) {
    var powerup = this.powerups[i];
    if (powerup.delete_me) continue;
    var distance = distance_between(this.ship, powerup);
    if(distance < powerup.radius() + this.ship.radius()) {
      this.ship.powerup(powerup.bonus);
      powerup.delete_me = true;
    }
  }
}
Game.prototype.ApplyKey = function(e, value) {
    e = e || window.event;
    if (e.keyCode == '32') {// space bar
        if(this.waiting) {
          this.restart();
        } else {
          this.ship.trigger = value;
        }
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

function Mass(canvas, mass, density, position, velocity, rotation_speed) {
  this.canvas = canvas;
  this.mass = mass;
  this.density = density;
  this.position = position;
  this.velocity = velocity;
  this.angle = Math.PI;
  this.rotation_speed = rotation_speed;
  this.delete_me = false;
}

Mass.prototype.radius = function() {
  this.area = this.mass / this.density;
  //r = sqrt(area/PI)
  return Math.pow(this.area / Math.PI, 1/2);
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

Mass.prototype.update = function(elapsed) {
  this.position.x += this.velocity.x * elapsed;
  this.position.y += this.velocity.y * elapsed;
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
  this.angle += this.rotation_speed * elapsed;
  if(this.angle > 2 * Math.PI) {
    this.angle -= 2 * Math.PI;
  }
  if(this.angle < 0) {
    this.angle += 2 * Math.PI;
  }
}

Mass.prototype.refresh = function(c) {
  c.beginPath();
  c.arc(this.position.x, this.position.y, this.radius(), 0, 2 * Math.PI, false);
  c.lineWidth = 2;
  c.strokeStyle = '#007300';
  c.stroke();
}

// ASTEROIDS===========================

Asteroid = function(game, mass, position, velocity, rotation_speed) {
  this.super(game.canvas, mass, 0.3 + Math.random() * 0.2, position, velocity, rotation_speed);
  this.game = game;
  this.explosion = new Audio('Explosion.mp3');
  this.bumpiness = 0.25 + Math.random() * 0.5;
  this.randoms = [];
  var radius = this.radius();
  var vertices = (5 + Math.random() * 10).toFixed()
  for(var i=0; i<vertices; i++) {
    this.randoms.push(radius * (1 - this.bumpiness) + radius * this.bumpiness * Math.random());
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
Asteroid.prototype.update = function(elapsed) {
  if(this.mass < 100) this.delete_me = true;//TODO: remove this?
  Mass.prototype.update.apply(this, arguments);
}
Asteroid.prototype.explode = function(projectile) {
  if(!this.game.muted) {
    this.explosion.pause();
    this.explosion.currentTime=0;
    this.explosion.play();
  }

  this.delete_me = true;
  var mass_taken = projectile.impact;
  var new_mass = Math.ceil((this.mass - mass_taken) / 2);
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
    a1.apply_force(split_angle1, projectile.force);
    a2.apply_force(split_angle2, projectile.force);
    a1.apply_torque(projectile.force/10);
    a2.apply_torque(-projectile.force/10);
    this.game.add_asteroid(a1);
    this.game.add_asteroid(a2);
  } else {
    mass_taken = this.mass;
  }
  this.game.score += mass_taken;
  do {
    var p_mass = Math.min(mass_taken, projectile.impact * 0.25 * Math.random());
    var p = new Particle(this.game, p_mass, this.density, this.position, this.velocity, 10);
    var angle = random_angle();
    p.apply_force(angle, projectile.force * (1 + Math.random()));
    mass_taken -= p_mass;
  } while (mass_taken > 0)
};


// THE SHIP===========================

Ship = function(game) {
  this.super(game.canvas, 10, 0.1, {x: game.canvas.width / 2, y: game.canvas.height / 2}, {x: 0, y: 0}, 0)
  this.game = game;
  this.laser = new Audio('short_laser.mp3');
  this.reset();
}
extend(Ship, Mass);
Ship.prototype.reset = function() {

  this.max_life = 100;
  this.life = this.max_life;

  //position and movement
  this.position = middle(this.canvas);
  this.velocity = {x: 0, y: 0};
  this.rotation_speed = 0;
  this.angle = Math.PI;

  //basic movement stuff
  this.power = 750;
  this.torque = 60;
  this.friction = 0.001;
  this.turning_friction = 1.2;

  //weapon
  this.shooting_power = 25;
  this.projectile_mass = 0.25;
  this.projectile_life = 5;
  this.projectile_impact = 100;

  //ammo
  this.max_ammo = 50;
  this.ammo = this.max_ammo;
  this.reload_time = 1.5;
  this.reload_in = 0;
  this.shoot_time = 0.5;
  this.shoot_in = 0;

  this.thrust_spread = 0.25;
  this.particle_time = 0.01;
  this.particle_in = 0;

  this.mainThruster = false;
  this.leftBooster = false;
  this.rightBooster = false;
  this.retroThruster = false;
  this.trigger = false;

}
Ship.prototype.refresh = function(c) {
  var unit = this.radius();
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
  c.fillStyle = '#000000';
  c.fill();
  c.stroke();
  c.restore();
}
Ship.prototype.apply_friction = function(elapsed) {
  //Fd = ½ρv²ACd 
  //drag = v * v * this.friction
  this.velocity.x += ((this.velocity.x > 0) ? -1 : 1) * elapsed * this.friction * this.velocity.x * this.velocity.x;
  this.velocity.y += ((this.velocity.y > 0) ? -1 : 1) * elapsed * this.friction * this.velocity.y * this.velocity.y;
  this.rotation_speed += ((this.rotation_speed > 0) ? -1 : 1) * elapsed * this.turning_friction * this.rotation_speed * this.rotation_speed; //retard the rotation for gameplay reasons    
}
Ship.prototype.update = function(elapsed) {
  this.apply_torque(this.torque * (this.leftBooster - this.rightBooster) * elapsed);
  var force_magnitude = this.power * (this.mainThruster - this.retroThruster) * elapsed;
  this.apply_force(this.angle, force_magnitude);
  if (force_magnitude && this.particle_in <= 0) {
    var p = new Particle(this.game, Math.random() * 2, 0.05, this.position, this.velocity, 0.5);
    var angle = (this.angle + Math.PI + (Math.random() - 0.5) * Math.PI * this.thrust_spread) % (Math.PI * 2);
    p.apply_force(angle, force_magnitude);
    this.particle_in = this.particle_time;
  }
  if(this.reload_in === 0) {
    this.ammo = Math.min(this.ammo + 1, this.max_ammo);
    this.reload_in = this.reload_time;
  }
  if (this.trigger && this.ammo > 0 && this.shoot_in === 0) {

    var projectile = new Projectile(this);
    if(!this.game.muted) {
      this.laser.pause();
      this.laser.currentTime=0;
      this.laser.play();      
    }
    projectile.apply_force(this.angle, this.shooting_power);
    this.apply_force(this.angle - Math.PI, this.shooting_power);
    this.game.projectiles.push(projectile);
    this.ammo--;
    this.shoot_in = this.shoot_time;
  }
  if(this.reload_in > 0) this.reload_in -= Math.min(elapsed, this.reload_in);
  if(this.shoot_in > 0) this.shoot_in -= Math.min(elapsed, this.shoot_in);
  if(this.particle_in > 0) this.particle_in -= elapsed;
  this.apply_friction(elapsed);
  Mass.prototype.update.apply(this, arguments);
}
Ship.prototype.launch_position = function() {
  var r = this.radius();
  return {
    x: this.position.x + Math.sin(this.angle) * r * 2,
    y: this.position.y + Math.cos(this.angle) * r * 2
  };
}
Ship.prototype.powerup = function(bonus) {
//  console.log("bonus: " + bonus);
  switch (bonus) {
    case "W":  //weapon
      this.shooting_power += 1;
      this.projectile_impact += 2;
      break;
    case "M":  //manouverability
      this.power *= 1.1;
      this.torque *= 1.1;
      break;
    case "A":  //ammo
      this.max_ammo += 10;
      this.ammo += 10;
      break;
    case "F":  //friction
      this.friction *= 0.999;
      this.turning_friction *= 0.999;
    case "L":  //life
      this.life += this.max_life / 4;
      this.life = Math.min(this.max_life, this.life);
    case "R":  //rate
      this.shoot_time *= 0.9;
      this.reload_time *= 0.9;
  }
}


// PROJECTILES===========================

Projectile = function(ship) {
  this.super(ship.canvas, ship.projectile_mass, 0.05, ship.launch_position(), {x: ship.velocity.x, y: ship.velocity.y}, 0)
  this.impact = ship.projectile_impact;
  this.life = ship.projectile_life;
  this.force = 1000 + Math.random() * 2000;
}
extend(Projectile, Mass);
Projectile.prototype.update = function(elapsed) {
  this.life -= Math.min(elapsed, this.life);
  if (this.life <= 0) {
    this.delete_me = true;
  }
  Mass.prototype.update.apply(this, arguments);
}

// PARTICLES===========================

Particle = function(game, mass, density, position, velocity, decay) {
  this.super(game.canvas, mass, density, copy_coords(position), copy_coords(velocity), 0)
  this.decay = decay;
  game.objects.push(this);
  var r = Math.floor(Math.pow(Math.random(), 3) * 255).toString(16);
  r = (r.length == 1) ? "0" + r : r;
  this.colour = '#ff' + r + "00";
  this.rotation_speed = random_rotation() * 2;
  this.angle = 0;
}
extend(Particle, Mass);

Particle.prototype.update = function(elapsed) {
  this.mass -= this.decay * elapsed;
  if (this.mass <= 0) {
    this.delete_me = true;
  }
  this.angle += this.rotation_speed * elapsed;
  Mass.prototype.update.apply(this, arguments);
}
Particle.prototype.refresh = function(c) {
  var radius = this.radius();
  c.save();
  c.translate(this.position.x, this.position.y);
  c.rotate(-this.angle);
  c.fillStyle = this.colour;
  c.strokeStyle = this.colour;
  c.lineWidth = 1;
  c.beginPath();
  for(var i = 0; i < 3; i++) {
    var r = radius * (0.5 + Math.random());
    c.rotate(2 * Math.PI / 3);
    c.moveTo(r, r);
    c.lineTo(-r, -r);
  }
  c.stroke();
  c.restore();
}

var PowerUp = function(game, bonus) {
  this.super(game.canvas, 100, 0.5, random_position(game.canvas), random_velocity(game.canvas));
  this.bonus = bonus;
  this.life = 20;
  game.objects.push(this);
}
extend(PowerUp, Mass);
PowerUp.prototype.update = function(elapsed) {
  this.life -= Math.min(elapsed, this.life);
  if (this.life <= 0) {
    this.delete_me = true;
  }
  Mass.prototype.update.apply(this, arguments);
}
PowerUp.prototype.refresh = function(c) {
  c.save();
  c.translate(this.position.x, this.position.y);
  c.beginPath();
  c.arc(0,0, this.radius(),0,2*Math.PI);
  c.fillStyle = '#00a300';
  c.fill();
  c.font = "bold 12px Arial";
  c.fillStyle = '#000000';
  c.fillText(this.bonus, -4, 4);
  c.stroke();
  c.restore();
}

window.Asteroids = Game;
}(this));
