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
function random_velocity(canvas) {
	return {
		x: (Math.random() - 0.5) * canvas.width * 0.01,
		y: (Math.random() - 0.5) * canvas.height * 0.01
	}
}
function random_rotation() {
	return Math.random() * 2 * Math.PI * 0.01;
}

// THE GAME===========================

function Game(canvas) {
	this.canvas = canvas;
	this.c = this.canvas.getContext("2d");
	this.objects = [];
	this.n_asteroids = 5;
	this.add_asteroids(this.n_asteroids);
	this.ship = new Ship(this, this.canvas);
	this.objects.push(this.ship);
}

Game.prototype.add_asteroids = function(n) {
	for (var i=0;i<n;i++) {
		this.objects.push(new Asteroid(this.canvas, 2000, random_position(this.canvas), random_velocity(this.canvas), random_rotation()));
	}
}
Game.prototype.update = function() {
	for (var i=0;i<this.objects.length;i++) {
		this.objects[i].update();
		if(this.objects[i].delete_me) this.objects.splice(i, 1);
	}
}
Game.prototype.refresh = function() {
	this.c.clearRect ( 0 , 0 , this.canvas.width, this.canvas.height );
	for (var i=0;i<this.objects.length;i++) {
		this.objects[i].refresh(this.c);
	}
};
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

Asteroid = function(canvas, mass, position, velocity, rotation_speed) {
	this.super(canvas, mass, position, velocity, rotation_speed);
	this.density = 0.2 + Math.random() * 0.1;
	this.volume = this.mass / this.density;
	this.radius = Math.pow(this.volume / (4/3)*Math.PI, 1/3); //assumes unit density i.e. mass === volume
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
	c.stroke();
	c.restore();
}

// THE SHIP===========================

Ship = function(game) {
	this.super(game.canvas, 1000, {x: game.canvas.width / 2, y: game.canvas.height / 2}, {x: 0, y: 0}, 0)
	this.game = game;

	this.mainThruster = false;
	this.leftBooster = false;
	this.rightBooster = false;
	this.retroThruster = false;
	this.trigger = false;

	this.power = 70;
	this.torque = 2.5;

	this.shooting_power = 200;
	this.reload_time = 15;
	this.reload_in = 0;
	this.projectile_mass = 100;
	this.projectile_life = 400;
	this.projectile_impact = 1;
}
extend(Ship, Mass);

Ship.prototype.refresh = function(c) {
	var unit = 5;
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

Ship.prototype.update = function() {
	this.apply_torque(this.torque * (this.leftBooster - this.rightBooster));
	var force_magnitude = this.power * (this.mainThruster - this.retroThruster);
	this.apply_force(this.angle, force_magnitude);
	this.rotation_speed *= 0.99; //retard the rotation for gameplay reasons (implement as friction?)
	if (this.trigger && this.reload_in === 0) {
		var projectile = new Projectile(this);
		projectile.apply_force(this.angle, this.shooting_power);
		this.apply_force(this.angle - Math.PI, this.shooting_power);
		this.game.objects.push(projectile);
		this.reload_in = this.reload_time;
	}
	if(this.reload_in > 0) this.reload_in -= 1;
	Mass.prototype.update.apply(this, arguments);
}

Ship.prototype.projectile_velocity = function() {

	return {
		x: this.velocity.x * 2,
		y: this.velocity.y * 2
	}
}


// PROJECTILES===========================

Projectile = function(ship) {
	this.super(ship.canvas, ship.projectile_mass, {x: ship.position.x, y: ship.position.y}, {x: ship.velocity.x, y: ship.velocity.y}, 0)
	this.impact = ship.projectile_impact;
	this.life = ship.projectile_life;
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
var fps = 70;//frames per second
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