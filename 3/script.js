var Gravity = function( max ) {
	
	var transparent,
		renderType;
	
	if( this.webglAvailable() ) {
		transparent = false;
		renderType = Phaser.WEBGL;
	} else {
		transparent = true;
		renderType = Phaser.CANVAS;
	}

	this.$window = $(window);
	this.width = this.$window.width();
	this.height = this.$window.height();
	
	this.game = new Phaser.Game(
		this.width,	//Canvas Size
		this.height,	//Canvas Size
		renderType,				//Renderer
		'container',			//DOM ID
		{
			preload: this.preload.bind(this),
			create: this.create.bind(this),
			update: this.update.bind(this),
			render: this.render.bind(this)
		},
		transparent,	//transparent
		true			//antialias
	);
	
	this.div = document.getElementById( 'container' );
	this.$canvas = $('canvas');
	this.canvas = this.$canvas.get(0);
	this.ratio = window.devicePixelRatio >= 1 ? window.devicePixelRatio : 1;
	this.planets = [];
	this.pointer = new Phaser.Point();
	this.mouse = new Phaser.Point(
		this.game.width / 2,
		this.game.height / 2
	);
	

	this.firingPoint = new Phaser.Point(
		this.game.width / 6,
		this.game.height / 2
	);
	
	this.h = Math.random();
	this.s = 0.5;
	this.l = 0.66;
	
	this.color = new THREE.Color();
	
	this.screenLength = Math.sqrt( this.game.width * this.game.width + this.game.height * this.game.height );
	
	this.fireDirection = new Phaser.Point();
	this.fireTheta = Math.PI * 1.7;
	this.fireStrength = this.screenLength / 10;
	
	this.maxFire = max;
	this.fireRate = 24000 / this.maxFire;
	this.nextFire = 0;
	
	this.collisionGroups = null;
	
	
	//this.addStats();
};
		
Gravity.prototype = {
	
	mouseMove : function( e ) {
		this.mouse.x = e.offsetX;
		this.mouse.y = e.offsetY;
	},
	
	preload : function() {
		
		this.game.load.image('arrow', 'images/arrow.png');
		this.game.load.image('black-hole', 'images/black-hole.png');
		
	},
	
	create : function() {
		$(this.game.canvas).on('mousemove', this.mouseMove.bind(this));
		this.game.stage.backgroundColor = '#404040';
		
		this.createPhysics();
		this.createPlanets();
		this.createBullets();
		
	},
	
	createPlanets : function() {
		var planet, i, il, j, r, theta, random, hue;
		
		r = Math.min(this.game.width, this.game.height) * 0.6;
		hue = Math.random();
		il = 20;
		
		this.planets.push({
			x : this.firingPoint.x,
			y : this.firingPoint.y,
			radius : 100
		});
		
		for(i=0; i < il; i++) {
			
			this.color.setHSL(hue + (i * 0.3 / il), 0.5, 0.5);
			
			planet = this.game.add.graphics( 50, 50 );
			planet.radius = Math.random() * Math.random() * 50 + 5;
			planet.radiusSq = planet.radius * planet.radius;
			planet.volume = (4/3) * Math.PI * Math.pow( planet.radius, 3 );
			
			console.log( planet.volume );
			
			planet.blendMode = PIXI.blendModes.SCREEN;
			
			//Set the non-colliding random location
			this.setNonCollidingPosition( planet );
			
			//Draw the planets
			for(j=0.2; j <= 1; j += 0.2) {
				
				planet.lineStyle(
					(planet.radius * j * j) / 10,	//line width
					this.color.getHex(),		//color
					j							//alpha
				);
				planet.drawCircle( 0, 0, planet.radius / 2 + planet.radius / 2 * j );
			
			}

			this.planets.push( planet );
		}
		
		this.planets.shift();
	},
	
	setNonCollidingPosition : function( planet ) {

		var collides, distanceBetweenPlanets, combinedRadii;
		
		collides = false;
		
		do {
			collides = false;
			
			planet.x = ( this.game.width  - this.game.width  / 7 ) * Math.random() + (this.game.width  / 14 );
			planet.y = ( this.game.height - this.game.height / 7 ) * Math.random() + (this.game.height / 14 );
			
			this.planets.forEach(function(otherPlanet) {
				
				distanceBetweenPlanets = Math.sqrt(
					Math.pow( planet.x - otherPlanet.x, 2 ) +
					Math.pow( planet.y - otherPlanet.y, 2 )
				);
				
				combinedRadii = ( planet.radius + otherPlanet.radius );
				
				if( distanceBetweenPlanets < combinedRadii ) {
					collides = true;
				}
				
			}, this);
								
		} while ( collides );
	},
	
	createPhysics : function() {
		this.game.physics.startSystem( Phaser.Physics.P2JS );
		this.game.physics.p2.setImpactEvents(true);
		this.game.physics.p2.defaultRestitution = 0;
		this.game.physics.p2.defaultFriction = 0.5;
		this.game.physics.p2.contactMaterial.relaxation = 2;
	
		this.collisionGroups = {
			walls	: this.game.physics.p2.createCollisionGroup(),
			bullets	: this.game.physics.p2.createCollisionGroup(),
			planets	: this.game.physics.p2.createCollisionGroup(),
			goals	: this.game.physics.p2.createCollisionGroup()
		};
		this.game.physics.p2.updateBoundsCollisionGroup();
		
	},
	
	createBullets : function() {
		this.bullets = this.game.add.spriteBatch();
		this.bullets.enableBody = true;
		this.bullets.physicsBodyType = Phaser.Physics.P2JS;
		this.bullets.enableBodyDebug = true;
		
		var i = this.maxFire,
			bullet;
		
		while(i--) {
			bullet = this.bullets.create( 50, 50, 'arrow' );
			bullet.anchor.setTo(0.5, 0.5);
			
			bullet.kill();
			bullet.body.collideWorldBounds = false;
			bullet.body.fixedRotation = true;
			//bullet.checkWorldBounds = true;
			//bullet.outOfBoundsKill = true;
			bullet.body.clearCollision(true);
			bullet.body.setCollisionGroup( this.collisionGroups.bullets );
			bullet.body.collides([]);
			bullet.scale.x = bullet.scale.y = 0.5;
			bullet.blendMode = PIXI.blendModes.ADD;
		}		
		
	},
	
	fire : function() {
		
		var bullet, random, theta, distance;

		
		if( this.game.time.now > this.nextFire && this.bullets.countDead() > 0) {
			
			this.nextFire = this.game.time.now + this.fireRate;

			bullet = this.bullets.getFirstDead();
			
			bullet.reset(
				this.firingPoint.x,
				this.firingPoint.y
			);
			bullet.px = bullet.x;
			bullet.py = bullet.y;
			
			theta = Math.PI - Math.atan2(
				 this.firingPoint.y - this.mouse.y,
				 this.firingPoint.x - this.mouse.x 
			);
			
			distance = Math.sqrt(
				Math.pow( this.firingPoint.x - this.mouse.x, 2) +
				Math.pow( this.firingPoint.y - this.mouse.y, 2)
			);
			
			distance = Math.min( distance, this.game.height / 2 );
			
			bullet.body.moveRight(	distance / 2 * Math.cos( theta ) );
			bullet.body.moveUp(		distance / 2 * Math.sin( theta ) );
			
			this.h += .01;
			
			this.fireTheta += Math.PI / 1000;
		}

		
		
	},
	
	update : function() {
		//this.updatePlanets();
		this.fire();
		this.killOutOfBounds();
		this.attractGravity();
	},
	
	killOutOfBounds : function() {
		var bullet,
			i = this.bullets.children.length,
			bounds = this.game.world.bounds;
			
		while(i--) {
			bullet = this.bullets.children[i];
			
			if(
				bullet.alive &&
				bullet.x + 20 < bounds.left 	||
				bullet.y + 20 < bounds.top		||
				bullet.x - 20 > bounds.right	||
				bullet.y - 20 > bounds.bottom
			) {
				bullet.kill();
			}
		}
	},
	
	attractGravity : function() {
			
		var i = this.bullets.children.length,
			denominator,
			//gravity = 30000,
			gravity = this.width * this.height / 6500000,
			speed;

		while(i--) {
		
			bullet = this.bullets.children[i];
		
			if(bullet.alive) {
				
				this.planets.forEach(function( planet ) {
					
					this.pointer.set(
						planet.x - bullet.x,
						planet.y - bullet.y
					);
					
					denominator =	Math.pow( this.pointer.x, 2 ) +
									Math.pow( this.pointer.y, 2 );
					
					if(planet.radiusSq > denominator) {
						bullet.kill();
						return;
					}
					
					this.pointer.normalize();
					
					speed = gravity * planet.volume / denominator;
					
					this.pointer.x *= speed;
					this.pointer.y *= speed;
					
					bullet.body.data.velocity[0] += bullet.body.world.pxmi( this.pointer.x );
					bullet.body.data.velocity[1] += bullet.body.world.pxmi( this.pointer.y );
					
				}, this);
			
				bullet.lx = bullet.x - bullet.px;
				bullet.ly = bullet.y - bullet.py;
				bullet.l = Math.sqrt(bullet.lx * bullet.lx + bullet.ly * bullet.ly);
				
				bullet.rotation = Math.atan2( bullet.ly, bullet.lx );
				
				bullet.scale.x = bullet.scale.y = bullet.l / 10 + 0.1;
				bullet.alpha = 10 / bullet.l
				
				bullet.px = bullet.x;
				bullet.py = bullet.y;
			}
		}
	},
	
	render : function() {
		
	},
	
	addStats : function() {
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.top = '0px';
		$("#container").append( this.stats.domElement );
	},
	
	webglAvailable : function() {
		// Copied from PIXI, copied from mr doob
		try {
			var canvas = document.createElement( 'canvas' );
			return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
		} catch( e ) {
			return false;
		}
	}
	
};

var gravity;

$(function() {
	
	function begin( speed ) {
		gravity = new Gravity( speed );
		$('.message').hide();
	}
	
	$('#low').click(function() {
		begin( 200 );
		return false;
	});
	
	$('#medium').click(function() {
		begin( 750 );
		return false;
	});

	$('#high').click(function() {
		begin( 2000 );
		return false;
	});
	
	$('#intense').click(function() {
		begin( 10000 );
		return false;
	});
	
	if(window.location.hash) {
		$(window.location.hash).trigger('click');
	}
	
});