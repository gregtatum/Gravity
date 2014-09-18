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

	this.div = document.getElementById( 'container' );
	this.$canvas = null;
	this.canvas = null;
	this.$drawingTarget = $('.drawing-target');
	this.ratio = window.devicePixelRatio >= 1 ? window.devicePixelRatio : 1;
	this.ratio = 1;
	this.h = Math.random();

	this.game = new Phaser.Game(
		this.width * this.ratio,	//Canvas Size
		this.height * this.ratio,	//Canvas Size
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
	
	this.launchers = [];
	this.liveBullets = [];
	this.pointer = new Phaser.Point();

	this.animatingArrows = false;
	this.drawingLauncher = false;
	this.overDragger = false;
	this.draggedBase = null;
	this.draggedBaseX = 0;
	this.draggedBaseY = 0;
	this.draggedTip = null;
	this.screenLength = Math.sqrt( this.game.width * this.game.width + this.game.height * this.game.height );
	
	this.collisionGroups = null;
	
};
		
Gravity.prototype = {
	
	
	preload : function() {
		
		this.game.load.image('arrow', 'images/arrow.png');
		this.game.load.image('black-hole', 'images/black-hole.png');
		this.game.load.image('greg', 'images/greg.png');
		
	},
	
	create : function() {
		
		this.$canvas = $(this.game.canvas);
		this.$drawingTarget = this.$canvas;
		
		var sprite = this.game.add.sprite(100,100);
		
		/*
		sprite.anchor.set(0.5);
		sprite.texture.frame.width = 100;
		sprite.texture.frame.height = 100;
		sprite.texture.updateFrame = true;
		
		sprite.scale.x = sprite.scale.y = 1;
		sprite.inputEnabled = true;
		sprite.input.useHandCursor = true;
		sprite.input.enableDrag();
		*/
		
		this.setHandlers();
		
		this.game.stage.backgroundColor = '#404040';
		
		this.createPhysics();
		//this.createPlanets();
		this.createBullets();
		
	},
	
	setHandlers : function() {
		
		this.$drawingTarget.one('mousedown', this.firstTouch.bind(this) );
		//this.$drawingTarget.one('touchstart', this.firstTouch.bind(this) );
		
		this.$drawingTarget.on('mousedown', this.onMouseDown.bind(this) );
		//this.$drawingTarget.on('touchstart', this.onTouchStart.bind(this) );
		
		$('.start-button').on('click', this.fire.bind(this) );
		
		//this.$drawingTarget.on('touchmove', this.onTouchMove );
		//this.$drawingTarget.on('mouseup', this.onMouseMoveDone );
		
	},
	
	onMouseDown : function( e ) {
		e.preventDefault();
		console.log('down');
		if( this.drawingLauncher === false && this.overDragger === false ) {
			console.log('start');
			
			this.$drawingTarget.on('mousemove.gravity', this.onMouseMove.bind(this) );
			this.$drawingTarget.on('mouseout.gravity', this.onMouseEnd.bind(this) );
			this.$drawingTarget.on('mouseup.gravity', this.onMouseEnd.bind(this) );

			this.startLauncher( e.offsetX * this.ratio, e.offsetY * this.ratio );
			
		}
	},
	
	onTouchStart : function( e ) {
		e.preventDefault();
		
		if( this.drawingLauncher === false ) {
			
			this.$drawingTarget.on('touchmove', this.onTouchMove.bind(this) );
			this.$drawingTarget.on('touchend', this.onTouchEnd.bind(this) );
			
			this.$drawingTarget.off('touchstart', this.onTouchStart.bind(this) );
			
			debugger;
			this.startLauncher( e.offsetX * this.ratio, e.offsetY * this.ratio );
			
		}
	},
	
	onMouseMove : function( e ) {
		e.preventDefault();
		console.log('move');
		this.updateLauncherVector( this.currentLauncher, e.offsetX * this.ratio, e.offsetY * this.ratio );
	},
	
	onTouchMove : function( e ) {
		e.preventDefault();
		this.updateLauncherVector(
			this.currentLauncher,
			e.originalEvent.touches[0].pageX * this.ratio,
			e.originalEvent.touches[0].pageY * this.ratio
		);
	},
	
	onTouchEnd : function( e ) {

		this.$drawingTarget.off('touchmove', this.onTouchMove.bind(this) );
		this.$drawingTarget.off('touchend', this.onTouchEnd.bind(this) );
		
		this.$drawingTarget.on('touchstart', this.onTouchStart.bind(this) );
		
		this.endDrawing();
	},
	
	onMouseEnd : function( e ) {
		console.log('end');
		//this.$drawingTarget.on('mousedown', this.onMouseDown.bind(this) );
		
		this.$drawingTarget.off('mousemove.gravity');
		this.$drawingTarget.off('mouseout.gravity');
		this.$drawingTarget.off('mouseup.gravity');
		
		this.endDrawing();
	},
	
	endDrawing : function() {
		if( this.drawingLauncher ) {
			this.currentLauncher = null;
			this.drawingLauncher = false;
		}
	},
	
	startLauncher : function(x, y) {
		
		var launcher, width;
		
		launcher = this.game.add.graphics( x, y );
		
		this.drawingLauncher = true;
		this.currentLauncher = launcher
		this.launchers.push( launcher );

		width = 6 * this.ratio;
		
		launcher.hue = this.h + this.launchers.length * 0.05;
		launcher.color = new THREE.Color().setHSL(
			launcher.hue,
			0.5,
			0.5
		);
		
		launcher.blendMode = PIXI.blendModes.SCREEN;
		
		launcher.lineStyle(
			1 * this.ratio,				//line width
			launcher.color.getHex(),	//color
			1							//alpha
		);
		launcher.drawCircle( 0, 0, width / 3 );
		
		launcher.lineStyle(
			2 * this.ratio,				//line width
			launcher.color.getHex(),	//color
			1							//alpha
		);
		launcher.drawCircle( 0, 0, width );
		
		//Add the vector graphic
		launcher.vector = new Phaser.Graphics( this.game, 0, 0 );
		launcher.vector.color = new THREE.Color().setHSL(
			launcher.hue,
			0.6,
			0.6
		);
		launcher.addChild( launcher.vector );
		
		
		//Add the base and tip sprites
		launcher.base = new Phaser.Sprite( this.game, 0, 0 );
		launcher.tip = new Phaser.Sprite( this.game, 0, 0 );
		
		this.startDraggableSprite( launcher.base, width, launcher );
		this.startDraggableSprite( launcher.tip, width, launcher);
		
		launcher.base.events.onDragStart.add(function() {
			this.draggedBase = launcher.base;
			this.draggedBaseX = launcher.x;
			this.draggedBaseY = launcher.y;
		}, this);
		launcher.base.events.onDragStop.add(function() {
			this.draggedBase.x = 0;
			this.draggedBase.y = 0;
			this.draggedBase = null;
		}, this);
		
		launcher.tip.events.onDragStart.add(function() {
			this.draggedTip = launcher.tip;
		}, this);
		launcher.tip.events.onDragStop.add(function() {
			this.draggedTip = null;
		}, this);
	},
	
	startDraggableSprite : function(sprite, width, parent) {
		
		sprite.anchor.set(0.5);
		
		sprite.texture.frame.width = width * 3;
		sprite.texture.frame.height = width * 3;
		
		sprite.texture.updateFrame = true;
		
		sprite.inputEnabled = true;

		sprite.input.useHandCursor = true;
		sprite.input.bringToTop = false;
		sprite.input.enableDrag();
		
		sprite.events.onInputOver.add(function() {
			this.overDragger = true;
		}, this);
		sprite.events.onInputOut.add(function() {
			this.overDragger = false;
		}, this);
				
		parent.addChild( sprite );
		
	},
	
	updateLauncherVector : function(launcher, x, y) {
		var vector, length, relX, relY;
		
		if(launcher) {
			
			relX = x - launcher.x;
			relY = y - launcher.y;
			
			length = Math.sqrt( relX * relX + relY * relY );
			
			vector = launcher.vector
			vector.clear();

			vector.lineStyle(
				0.03 * this.ratio * length,			//line width
				vector.color.getHex(),	//color
				0.5						//alpha
			);
			
			vector.moveTo(0,0);
			vector.lineTo(
				relX,
				relY
			);
			
			launcher.tip.x = relX;
			launcher.tip.y = relY;
			
		}
	},
	
	firstTouch : function() {
		$('.message').hide();
		$('.start-button').css("display", "block");
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
		
		var i = 100,
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
		
		this.liveBullets.forEach(function( bullet ) {
			bullet.kill();
		});
		
		this.liveBullets = [];
		this.animatingArrows = true;
		
		this.launchers.forEach( function( launcher ) {
			
			var bullet, random, theta, distance;

			bullet = this.bullets.getFirstDead();
			
			this.liveBullets.push( bullet );
			
			launcher.alpha = 0.8;
			
			bullet.reset(
				launcher.x,
				launcher.y
			);
			bullet.px = bullet.x;
			bullet.py = bullet.y;
			
			theta = Math.PI - Math.atan2(
				 launcher.tip.y,
				 launcher.tip.x 
			);
			
			distance = Math.sqrt(
				Math.pow( launcher.tip.x, 2) +
				Math.pow( launcher.tip.y, 2)
			);
			bullet.body.moveLeft(	(distance / 2) * Math.cos( theta ) );
			bullet.body.moveDown(		(distance / 2) * Math.sin( theta ) );				
			
		}.bind(this) );
		
	},
	
	update : function() {
		
		this.updateDrags();
		
		this.killOutOfBounds();
		this.attractGravity();
	},
	
	updateDrags : function() {
		var sprite;
		
		if( this.draggedBase ) {
			
			sprite = this.draggedBase;
			
			sprite.parent.x = this.draggedBaseX + sprite.x;
			sprite.parent.y = this.draggedBaseY + sprite.y;
			
		}
		
		if( this.draggedTip ) {
			
			sprite = this.draggedTip;
			//console.log(sprite.x, sprite.y);
			this.updateLauncherVector(sprite.parent, sprite.x + sprite.parent.x, sprite.y + sprite.parent.y);
		}
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
			halfWidth = this.width / 2,
			halfHeight = this.height / 2,
			speed;
		
		this.liveBullets.forEach(function( bullet ) {
				
			this.liveBullets.forEach(function( planet ) {
				
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
			
			this.pointer.set(
				halfWidth - bullet.x,
				halfHeight - bullet.y
			);
			
			denominator =	Math.pow( this.pointer.x, 2 ) +
							Math.pow( this.pointer.y, 2 );
			
			this.pointer.normalize();
			
			speed = gravity * 10000 / denominator;
			
			this.pointer.x *= speed;
			this.pointer.y *= speed;
			
			bullet.body.data.velocity[0] += bullet.body.world.pxmi( this.pointer.x );
			bullet.body.data.velocity[1] += bullet.body.world.pxmi( this.pointer.y );
			
		}.bind(this) );
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
	gravity = new Gravity();
		
});