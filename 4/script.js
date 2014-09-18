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
		false			//antialias
	);
	
	this.div = document.getElementById( 'container' );
	this.$canvas = $('canvas');
	this.canvas = this.$canvas.get(0);
	this.ratio = window.devicePixelRatio >= 1 ? window.devicePixelRatio : 1;
	this.pointer = new Phaser.Point();
	this.bullets = [];	
	
	this.quadTree = new Phaser.QuadTree(0, 0, this.width, this.height, 10, 3);

	
	this.h = Math.random();
	this.s = 0.5;
	this.l = 0.66;
	
	this.color = new THREE.Color();
	
	this.screenLength = Math.sqrt( this.game.width * this.game.width + this.game.height * this.game.height );
	
	this.fireDirection = new Phaser.Point();
	this.fireTheta = Math.PI * 1.7;
	this.fireStrength = this.screenLength / 17;
	
	this.maxFire = max;
	this.fireRate = 100 / this.maxFire;
	this.nextFire = 0;
		
	this.mouse = null;
	this.mouseSprite = null;
	
	//this.addStats();
};
		
Gravity.prototype = {
	
	preload : function() {
		
		this.game.load.image('arrow', 'images/arrow.png');
		this.game.load.image('black-hole', 'images/black-hole.png');
		
	},
	
	create : function() {
		this.game.stage.backgroundColor = '#404040';
		this.createMouse();
		this.createPhysics();
		//this.createPlanets();
		this.createBullets();
		
		
		
	},
	
	createMouse	: function() {
		
		this.mouse = new Mouse( this, this.game.canvas );
		
		this.mouseSprite = this.game.add.sprite(100, 100, 'black-hole');
		this.mouseSprite.anchor.setTo(0.5, 0.5);
		
		this.mouseSprite.scale.x = this.mouseSprite.scale.y = (this.width + this.height ) / 5000;
		
		this.mouseSprite.tint = this.color.setHSL(0.11, 0.5, 0.5).getHex();
		this.mouseSprite.blendMode = PIXI.blendModes.MULTIPLY;
		
	},
	
	createPhysics : function() {
		this.game.physics.startSystem( Phaser.Physics.P2JS );
		this.game.physics.p2.setImpactEvents(true);
		this.game.physics.p2.defaultRestitution = 0;
		this.game.physics.p2.defaultFriction = 0.5;
		this.game.physics.p2.contactMaterial.relaxation = 2;
		
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
			bullet.body.collides([]);
			bullet.scale.x = bullet.scale.y = 0.5;
			bullet.blendMode = PIXI.blendModes.ADD;
		}
				
	},
	
	fire : function() {
		
		var bullet, random, theta;

		if( this.game.time.now > this.nextFire && this.bullets.countDead() > 0) {
			
			this.nextFire = this.game.time.now + this.fireRate;

			bullet = this.bullets.getFirstDead();
						
			bullet.reset(
				(this.game.width / 10) + (this.game.width * (8/10)) * Math.random(),
				(this.game.height / 10) + (this.game.height * (8/10)) * Math.random()
			);
			bullet.px = bullet.x;
			bullet.py = bullet.y;
			bullet.visible = false;
			
			theta = Math.random() * 2 * Math.PI;
			bullet.body.moveRight(	this.fireStrength * Math.cos( theta ) );
			bullet.body.moveUp(		this.fireStrength * Math.sin( theta ) );
			//bullet.body.moveRight(	this.fireStrength * Math.cos( this.fireTheta ) + Math.random() * 1 );
			//bullet.body.moveUp(		this.fireStrength * Math.sin( this.fireTheta ) + Math.random() * 1 );
			this.h += .01;
			
		}

		
		
	},
	
	update : function() {
		
		this.fire();
		
		this.updateMouseSprite();
		this.killOutOfBounds();
		this.attractGravityBullets();
	
		// debug
		// this.game.debug.text( liveBullets.length, 10, 30 );
		// this.game.debug.text( "Dead: " + this.bullets.countDead(), 10, 50 );
		
	},
	
	updateMouseSprite : function() {
		this.mouseSprite.x = this.mouse.position.x;
		this.mouseSprite.y = this.mouse.position.y;
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
	
	attractGravityBullets : function() {
			
		var denominator,
			//gravity = 30000,
			gravity = this.width * this.height / 6500000,
			halfWidth = this.width / 2,
			halfHeight = this.height / 2,
			liveBullets = _.filter( this.bullets.children, function( bullet ) {
				return bullet.alive;
			}),
			speed;
		
		
		liveBullets.forEach(function( bullet ) {
			bullet.body.right = bullet.body.x;
			bullet.body.bottom = bullet.body.y;
		});
		
		if( liveBullets ) {
			//this.quadTree.populate( liveBullets );
			//this.game.debug.quadTree( this.quadTree );
		}
		
		
		liveBullets.forEach(function goThroughEachBullet( bullet ) {
				
			liveBullets.forEach(function applyGravityFromOtherBullets( planet ) {
				
				if( planet == bullet ) return;
				
				this.pointer.set(
					planet.x - bullet.x,
					planet.y - bullet.y
				);
				
				denominator =	Math.pow( this.pointer.x, 2 ) +
								Math.pow( this.pointer.y, 2 );
				
				this.pointer.normalize();
				
				speed = gravity * 5000 / denominator;
				
				this.pointer.x *= speed;
				this.pointer.y *= speed;
				
				if(denominator > 10 ) {
				
					bullet.body.data.velocity[0] += bullet.body.world.pxmi( this.pointer.x );
					bullet.body.data.velocity[1] += bullet.body.world.pxmi( this.pointer.y );
					
				}
			
				
			}, this);
			
			// this.pointer.set(
			// 	halfWidth - bullet.x,
			// 	halfHeight - bullet.y
			// );
			//
			// denominator =	Math.pow( this.pointer.x, 2 ) +
			// 				Math.pow( this.pointer.y, 2 );
			//
			// this.pointer.normalize();
			//
			// speed = gravity * 10000 / denominator;
			//
			// this.pointer.x *= speed;
			// this.pointer.y *= speed;
			//
			//
			// bullet.body.data.velocity[0] += bullet.body.world.pxmi( this.pointer.x );
			// bullet.body.data.velocity[1] += bullet.body.world.pxmi( this.pointer.y );
			
			this.attractToMouse( bullet );
			
			bullet.body.data.velocity[0] *= 0.9;
			bullet.body.data.velocity[1] *= 0.9;
			
			this.updateBulletAppearance( bullet );
			
		}.bind(this) );
	},
	
	attractToMouse : function() {
		
		var pointer = new Phaser.Point();
		
		return function( bullet ) {
			
			var denominator, speed,
				gravity = this.width * this.height / 60;
			
			pointer.set(
				this.mouse.position.x - bullet.x,
				this.mouse.position.y - bullet.y
			);
	
			denominator =	Math.pow( pointer.x, 2 ) +
							Math.pow( pointer.y, 2 );
					
			pointer.normalize();

			speed = gravity / denominator;
		
			pointer.x *= speed;
			pointer.y *= speed;
				
			bullet.body.data.velocity[0] += bullet.body.world.pxmi( pointer.x );
			bullet.body.data.velocity[1] += bullet.body.world.pxmi( pointer.y );
			
		}
	}(),
	
	updateBulletAppearance : function( bullet ) {
		bullet.lx = bullet.x - bullet.px;
		bullet.ly = bullet.y - bullet.py;
		bullet.l = Math.sqrt(bullet.lx * bullet.lx + bullet.ly * bullet.ly);
		
		bullet.rotation = Math.atan2( bullet.ly, bullet.lx );
		
		bullet.scale.x = bullet.scale.y = bullet.l / 2.5 + 0.1;
		bullet.alpha = 5 / bullet.l
		
		bullet.px = bullet.x;
		bullet.py = bullet.y;
	
		bullet.visible = true;
		
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

var Mouse = function( scene, target ) {

	this.scene = scene;
	this.position = new Phaser.Point(-10000, -10000);

	$(target).on('mousemove', this.onMouseMove.bind(this) );
	$(target).on('touchmove', this.onTouchMove.bind(this) );
	$(target).on('touchend', this.onTouchEnd.bind(this) );

};

Mouse.prototype = {

	onMouseMove : function(e) {

		if(typeof(e.pageX) == "number") {
			this.position.x = e.pageX;
			this.position.y = e.pageY;
		} else {
			this.resetPosition();
		}

	},

	onTouchMove : function( e ) {
		e.preventDefault();
		
		this.position.x = e.originalEvent.touches[0].pageX;
		this.position.y = e.originalEvent.touches[0].pageY;
		
		return false;
	},
	
	resetPosition : function() {
		this.position.x = -100000;
		this.position.y = -100000;	
	},
	
	onTouchEnd : function( e ) {
		this.resetPosition();
	},
	
	copyPosition : function( vector ) {
		vector.copy( this.position );
	},

	getPosition : function() {
		return this.position.clone();
	}

};


var gravity;

$(function() {
	
	function begin( speed ) {
		gravity = new Gravity( speed );
		$('.message').hide();
	}
	
	$('#low').click(function() {
		begin( 75 );
		return false;
	});
	
	$('#medium').click(function() {
		begin( 125 );
		return false;
	});

	$('#high').click(function() {
		begin( 250 );
		return false;
	});
	
	$('#intense').click(function() {
		begin( 500 );
		return false;
	});
	
	if(window.location.hash) {
		$(window.location.hash).trigger('click');
	}
	
});