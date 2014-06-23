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
	
	this.h = Math.random();
	this.s = 0.5;
	this.l = 0.66;
	
	this.color = new THREE.Color();
	
	this.screenLength = Math.sqrt( this.game.width * this.game.width + this.game.height * this.game.height );
	
	this.fireDirection = new Phaser.Point();
	this.fireTheta = Math.PI * 1.7;
	this.fireStrength = this.screenLength / 17;
	
	this.maxFire = max;
	this.fireRate = 24000 / this.maxFire;
	this.nextFire = 0;
	
	this.collisionGroups = null;
	
	//this.addStats();
};
		
Gravity.prototype = {
	
	preload : function() {
		
		this.game.load.image('arrow', 'images/arrow.png');
		this.game.load.image('black-hole', 'images/black-hole.png');
		
	},
	
	create : function() {
		this.game.stage.backgroundColor = '#404040';
		this.blackHole = this.game.add.sprite(100, 100, 'black-hole');
		this.blackHole.anchor.setTo(0.5, 0.5);
		this.blackHole.x = this.game.width / 2;
		this.blackHole.y = this.game.height / 2;
		this.blackHole.blendMode = PIXI.blendModes.MULTIPLY;
		
		this.createPhysics();
		this.createBullets();
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
			bullet.planetPointer = new Phaser.Point();
			
			bullet.kill();
			bullet.body.collideWorldBounds = false;
			bullet.body.fixedRotation = true;
			//bullet.checkWorldBounds = true;
			//bullet.outOfBoundsKill = true;
			bullet.body.clearCollision(true);
			bullet.body.setCollisionGroup( this.collisionGroups.bullets );
			bullet.body.collides([]);
			bullet.scale.x = 0.3;
			bullet.scale.y = 0.3;
			
			bullet.blendMode = PIXI.blendModes.ADD;
		}		
		
	},
	
	fire : function() {
		
		var bullet, random;

		if( this.game.time.now > this.nextFire && this.bullets.countDead() > 0) {
			
			this.nextFire = this.game.time.now + this.fireRate;

			bullet = this.bullets.getFirstDead();
			bullet.reset(
				this.game.width / 4 + 100 * Math.random() - 50,
				3 * this.game.height / 4  + 100 * Math.random() - 50
			);
			bullet.px = bullet.x;
			bullet.py = bullet.y;
			
			bullet.reset(
				this.game.width / 4,
				3 * this.game.height / 4
			);
			
			bullet.body.moveRight(	this.fireStrength * Math.cos( this.fireTheta ) );
			bullet.body.moveUp(		this.fireStrength * Math.sin( this.fireTheta ) );
			//bullet.body.moveRight(	this.fireStrength * Math.cos( this.fireTheta ) + Math.random() * 1 );
			//bullet.body.moveUp(		this.fireStrength * Math.sin( this.fireTheta ) + Math.random() * 1 );
			this.h += .01;
			
			this.fireTheta += Math.PI / 1000;
		}

		
		
	},
	
	update : function() {
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
//			gravity = 30000,
			gravity = this.width * this.height / 30,
			speed;

		while(i--) {
			
			bullet = this.bullets.children[i];
			
			if(bullet.alive) {
				bullet.planetPointer.set(
					this.game.world.bounds.halfWidth - bullet.x,
					this.game.world.bounds.halfHeight - bullet.y
				);
			
				denominator =	Math.pow( this.game.world.bounds.halfWidth - bullet.x, 2 ) +
								Math.pow( this.game.world.bounds.halfHeight - bullet.y, 2 );
							
				bullet.planetPointer.normalize();

				speed = gravity / denominator;
				
				bullet.planetPointer.x *= speed;
				bullet.planetPointer.y *= speed;
			
				bullet.body.data.velocity[0] += bullet.body.world.pxmi( bullet.planetPointer.x );
				bullet.body.data.velocity[1] += bullet.body.world.pxmi( bullet.planetPointer.y );
				
				bullet.rotation = Math.atan2( bullet.y - bullet.py, bullet.x - bullet.px );
				
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
	
	$('#slow').click(function() {
		begin( 150 );
		return false;
	});
	
	$('#medium').click(function() {
		begin( 600 );
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
	
});