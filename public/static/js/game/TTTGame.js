var TTTGame = (function(){

	var ANGLE = 26.55;
	var TILE_WIDTH = 68;
	var TILE_HEIGHT = 63;
	var SPEED = 5;
	var TAXI_START_X = 30;
	var JUMP_HEIGHT = 7;

	function TTTGame(phaserGame) {
		this.game = phaserGame;

		// Taxi variables
		this.taxi = undefined;
		this.taxiX = TAXI_START_X;
		this.taxiTargetX = 0;

		// Taxi jump variables
		this.jumpSpeed = JUMP_HEIGHT;
		this.isJumping = false;
		this.currentJumpHeight = 0;

		// Road variables
		this.roadCount = 0;
		this.nextObstacleIndex = 0;
		this.arrObstacles = [];
		this.nextQueueIndex = 0;
		this.rightQueue = [];

		// General game variables
		this.mouseTouchDown = false;
		this.hasStarted = false;
		this.isDead = false;
		this.gameOverGraphic = undefined;
		this.counter = undefined;
		this.logo = undefined;
		this.tapToStart = undefined;
		this.scoreCount = 0;
		this.blackOverlay = undefined;
		this.btnRestart = undefined;
		this.sfx = {
			// fill in create
		};

		this.arrTiles = [];
		this.numberOfIterations = 0;
		this.roadStartPosition = {
			x: GAME_WIDTH + 100,
			y: GAME_HEIGHT / 2 - 100,
    };
    
    
	}

	TTTGame.prototype.restart = function() {
		this.reset();
	};

	TTTGame.prototype.reset = function() {

		this.scoreCount = 0;
		this.counter.setScore(0, false);

		// General game variables
		this.mouseTouchDown = false;
		this.hasStarted = false;
		this.isDead = false;

		// Road variables
		this.arrObstacles = [];
		this.nextObstacleIndex = 0;

		// Taxi jump variables
		this.jumpSpeed = JUMP_HEIGHT;
		this.isJumping = false;
		this.currentJumpHeight = 0;

		// Taxi properties
		this.game.tweens.removeFrom(this.taxi);
		this.taxiX = TAXI_START_X;
		this.taxi.rotation = 0;
		this.taxiTargetX = 0;

		// Sprite visibility
		this.gameOverGraphic.visible = false;
		this.counter.visible = false;
		this.logo.visible = true;
		this.tapToStart.visible = true;
		this.blackOverlay.visible = false;
		this.tapToStart.blinker.startBlinking();
		this.btnRestart.visible = false;
	};

	TTTGame.prototype.preload = function() {
		// SFX
		this.game.load.audio('hit', 'assets/static/audio/hit.wav');
		this.game.load.audio('jump', 'assets/static/audio/jump.wav');
		this.game.load.audio('score', 'assets/static/audio/score.wav');

		// Atlases
		this.game.load.atlasJSONArray(
			'numbers', // key
			'assets/static/img/spritesheets/numbers.png', // spritesheet
			'assets/static/img/spritesheets/numbers.json'); // atlasJSON

		this.game.load.atlasJSONArray(
			'playButton', // key
			'assets/static/img/spritesheets/playButton.png', // spritesheet
			'assets/static/img/spritesheets/playButton.json'); // atlasJSON

		this.game.load.atlasJSONArray(
			'gameAssets', // key
			'assets/static/img/spritesheets/gameAssets.png', // spritesheet
			'assets/static/img/spritesheets/gameAssets.json'); // atlasJSON

	};

	TTTGame.prototype.init = function() {
		this.game.stage.backgroundColor = '#9bd3e1';
	};

	TTTGame.prototype.create = function() {

		this.sfx = {
			hit: this.game.add.audio('hit'),
			jump: this.game.add.audio('jump'),
			score: this.game.add.audio('score')
		};

		var numberOfLayers = 9;
		var i = 0;
		while (i < numberOfLayers) {
			var layer = new Phaser.Sprite(this.game, 0, 0);
			this.game.add.existing(layer);
			// arrTiles will now hold layers
			this.arrTiles.push(layer);
			i++;
		}

		// Our assets are available
		this.generateRoad();
		
		var x = GAME_WIDTH / 2;
		var y = GAME_HEIGHT / 2;
		this.taxi = new Phaser.Sprite(this.game, x, y, 'gameAssets', 'taxi');
		this.taxi.anchor.setTo(0.5, 1.0);
		this.game.world.addChild(this.taxi);

		this.counter = new TTTCounter(this.game, 0, 0);
		this.game.add.existing(this.counter);
		this.counter.x = this.game.world.centerX;
		this.counter.y = 40;

		this.logo = this.game.add.sprite(0, 0, 'gameAssets', 'logo');
		this.logo.anchor.setTo(0.5, 0.5);
		this.logo.x = this.game.world.centerX;
		this.logo.y = 100;

		this.tapToStart = this.game.add.sprite(0, 0, 'gameAssets', 'tapToStart');
		this.tapToStart.anchor.setTo(0.5, 0.5);
		this.tapToStart.x = this.game.world.centerX;
		this.tapToStart.y = this.game.world.height - 60;
		this.tapToStart.blinker = new TTTBlinker(this.game, this.tapToStart);

		this.blackOverlay = this.game.add.graphics(0, 0);
		this.blackOverlay.beginFill(0x000000, 1);
		this.blackOverlay.drawRect(0, 0, this.game.world.width, this.game.world.height);
		this.blackOverlay.endFill();

		x = this.game.world.centerX;
		y = this.game.world.centerY - 50;

		this.gameOverGraphic = new Phaser.Sprite(this.game, x, y, 'gameAssets', 'gameOver');
		this.gameOverGraphic.anchor.setTo(0.5, 0.5);
		this.game.add.existing(this.gameOverGraphic);

		this.btnRestart = new Phaser.Button(
			this.game,
			0,
			0,
			'playButton',
			this.restart, // Event handler
			this, // context
			'default',
			'default',
			'hover',
			'default'
		);
		this.game.add.existing(this.btnRestart);
		this.btnRestart.inputEnabled = true;
		this.btnRestart.input.useHandCursor = false;
		this.btnRestart.anchor.setTo(0.5, 0.5);
		this.btnRestart.x = this.game.world.centerX;
		this.btnRestart.y = this.gameOverGraphic.y + this.gameOverGraphic.height / 2 + 50;
		
		this.reset();
		this.generateLevel();
	};

	TTTGame.prototype.generateLevel = function() {
		var i = 0;
		// Calculate how many tiles fit on screen
		var numberOfTiles = Math.ceil( this.game.world.width / TILE_WIDTH ) + 2;
		while (i <= numberOfTiles) {
			this.generateRoad();
			if (i != numberOfTiles) {
				// Move the tiles by TILE_WIDTH
				this.moveTilesWithSpeed(TILE_WIDTH);
			};
			i++;
		}
	};

	TTTGame.prototype.generateGreenQueue = function() {
		var retval = [];

		retval.push('green_start');

		// Random amount of middle tiles
		var middle = Math.round(Math.random() * 2);
		var i = 0;
		while (i <= middle) {
			retval.push('green_middle_empty');
			i++;
		}

		// Random amount of trees
		var randomAmountOfTrees = Math.round(Math.random() * 2);
		i = 0;
		while (i <= randomAmountOfTrees) {
			retval.push('green_middle_tree');
			i++;
		}

		// Add some middle tiles again
		i = 0;
		while (i <= middle) {
			retval.push('green_middle_empty');
			i++;
		}

		retval.push('green_end');

		return retval;
	};

	TTTGame.prototype.calculateTaxiPosition = function() {
		
		var multiplier = 0.025;
		var num = TAXI_START_X + (this.scoreCount * GAME_WIDTH * multiplier);

		// Limit it to 60% of the game width
		if (num > GAME_WIDTH * 0.60) {
			num = GAME_WIDTH * 0.60;
		};

		this.taxiTargetX = num;

		// Gradually increase taxiX to approach taxiTargetX
		if (this.taxiX < this.taxiTargetX) {
			var easing = 15;
			this.taxiX += (this.taxiTargetX - this.taxiX) / easing;
		};

	};

	TTTGame.prototype.calculateNextObstacleIndex = function() {
		var minimumOffset = 3;
		var maximumOffset = 10;
		var num = Math.random() * (maximumOffset - minimumOffset);
		this.nextObstacleIndex = this.roadCount + Math.round(num) + minimumOffset;
	};

	TTTGame.prototype.checkObstacles = function() {
		var i = this.arrObstacles.length - 1;

		while (i >= 0) {
			var sprite = this.arrObstacles[i];

			if (sprite.x < this.taxi.x - 10) {
				this.arrObstacles.splice(i, 1);
				// Taxi jumped over the obstacle
				this.sfx.score.play();
				this.scoreCount++;
				this.counter.setScore(this.scoreCount, true);
			}

			// Distance formula
			var dx = sprite.x - this.taxi.x;
			dx = Math.pow(dx, 2);

			var dy = (sprite.y - sprite.height / 2) - this.taxi.y;
			dy = Math.pow(dy, 2);

			var distance = Math.sqrt(dx + dy);

			if (distance < 25) {
				if (!this.isDead) {
					this.gameOver();
				};
			};

			i--;
		}

	};

	TTTGame.prototype.gameOver = function() {

		this.sfx.hit.play();

		this.blackOverlay.alpha = 0.6;
		this.blackOverlay.visible = true;
		this.btnRestart.visible = true;
		this.gameOverGraphic.visible = true;

		this.isDead = true;
		this.hasStarted = false;
		this.arrObstacles = [];

		var dieSpeed = SPEED / 10;

		var tween_1 = this.game.add.tween(this.taxi);
		tween_1.to({
			x: this.taxi.x + 20,
			y: this.taxi.y - 40
		}, 300 * dieSpeed, Phaser.Easing.Quadratic.Out);

		var tween_2 = this.game.add.tween(this.taxi);
		tween_2.to({
			y: GAME_HEIGHT + 40
		}, 1000 * dieSpeed, Phaser.Easing.Quadratic.In);

		tween_1.chain(tween_2);
		tween_1.start();

		var tween_rotate = this.game.add.tween(this.taxi);
		tween_rotate.to({
			angle: 200
		}, 1300 * dieSpeed, Phaser.Easing.Linear.None);
		tween_rotate.start();

	};

	TTTGame.prototype.rightQueueOrEmpty = function() {
		var retval = 'empty';

		if (this.rightQueue.length !== 0) {
			retval = this.rightQueue[0][0];
			this.rightQueue[0].splice(0, 1);
			if (this.rightQueue[0].length === 0) {
				this.rightQueue.splice(0, 1);
			};
		};

		return retval;
	};

	TTTGame.prototype.generateRoad = function() {

		this.roadCount++;
		var tile = 'tile_road_1';
		var isObstacle = false;

		if (this.roadCount > this.nextObstacleIndex && this.hasStarted) {
			this.calculateNextObstacleIndex();
			tile = 'obstacle_1';
			isObstacle = true;
		};

		this.addTileAtIndex(new TTTBuilding(this.game, 0, 0), 0);
		this.createTileAtIndex('tile_road_1', 1);
		this.createTileAtIndex('empty', 2);
		this.addTileAtIndex(new TTTBuilding(this.game, 0, 0), 3);
		var sprite = this.createTileAtIndex(tile, 4);
		this.createTileAtIndex('empty', 5);
		this.createTileAtIndex(this.rightQueueOrEmpty(), 6);
		this.createTileAtIndex('empty', 7);
		this.createTileAtIndex('water', 8);
		
		if (isObstacle) {
			this.arrObstacles.push(sprite);
		};
	};

	TTTGame.prototype.createTileAtIndex = function(tile, index) {

		var sprite = new Phaser.Sprite(this.game, 0, 0, 'gameAssets', tile);

		this.addTileAtIndex(sprite, index);

		return sprite;
	};

	TTTGame.prototype.addTileAtIndex = function(sprite, index) {
		sprite.anchor.setTo(0.5, 1.0);
		var middle = 4; // Middle layer

		// < 0 if it's a layer below the middle, > 0 if it's above the middle
		var offset = index - middle;

		var x = this.roadStartPosition.x;
		var y = this.roadStartPosition.y + offset * TILE_HEIGHT;
		sprite.x = x;
		sprite.y = y;
		this.arrTiles[index].addChildAt(sprite, 0);
	};

	TTTGame.prototype.calculatePositionOnRoadWithXPosition = function(xpos) {
		var adjacent = this.roadStartPosition.x - xpos;
		var alpha = ANGLE * Math.PI / 180;
		var hypotenuse = adjacent / Math.cos(alpha);
		var opposite = Math.sin(alpha) * hypotenuse;
		return {
			x: xpos,
			y: this.roadStartPosition.y + opposite - 57
		};
	};

	TTTGame.prototype.moveTilesWithSpeed = function(speed) {
		var i = this.arrTiles.length - 1;

		while (i >= 0) {
			var children = this.arrTiles[i].children;
			var j = children.length - 1;

			while (j >= 0) {

				var sprite = children[j];
				// Move the sprite
				sprite.x -= speed * Math.cos( ANGLE * Math.PI / 180 );
				sprite.y += speed * Math.sin( ANGLE * Math.PI / 180 );

				if (sprite.x < -120) {
					this.arrTiles[i].removeChild(sprite);
					sprite.destroy();
				}

				j--;
			}

			i--;
		}
	};

	TTTGame.prototype.startGame = function() {
		this.hasStarted = true;
		this.logo.visible = false;
		this.counter.visible = true;
		this.tapToStart.visible = false;
		this.tapToStart.blinker.stopBlinking();
	};

	TTTGame.prototype.touchDown = function() {
		this.mouseTouchDown = true;

		if (this.isDead) {
			return;
		};

		if (!this.hasStarted) {
			this.startGame();
		};

		if (!this.isJumping) {
			this.isJumping = true;
			this.sfx.jump.play();
		}
	};

	TTTGame.prototype.touchUp = function() {
		this.mouseTouchDown = false;
	};

	TTTGame.prototype.taxiJump = function() {
		this.currentJumpHeight -= this.jumpSpeed;
		this.jumpSpeed -= 0.5;
		if (this.jumpSpeed < -JUMP_HEIGHT) {
			this.jumpSpeed = JUMP_HEIGHT;
			this.isJumping = false;
		}
	};

	TTTGame.prototype.generateRightQueue = function() {
		var minimumOffset = 5;
		var maximumOffset = 15;
		var num = Math.random() * (maximumOffset - minimumOffset);
		this.nextQueueIndex = this.roadCount + Math.round(num) + minimumOffset;
		this.rightQueue.push(this.generateGreenQueue());
	};

	TTTGame.prototype.update = function() {
		// Gets called at 60fps

		if (this.game.input.activePointer.isDown) {
			if (!this.mouseTouchDown) {
				this.touchDown();
			};
		} else {
			if (this.mouseTouchDown) {
				this.touchUp();
			};
		}

		if (this.roadCount > this.nextQueueIndex) {
			this.generateRightQueue();
		};

		this.numberOfIterations++;

		if (this.numberOfIterations > TILE_WIDTH / SPEED) {
			this.generateRoad();
			this.numberOfIterations = 0;
		}

		if (!this.isDead) {
			if (this.isJumping) {
				this.taxiJump();
			}

			this.calculateTaxiPosition();

			var pointOnRoad = this.calculatePositionOnRoadWithXPosition(this.taxiX);
			this.taxi.x = pointOnRoad.x;
			this.taxi.y = pointOnRoad.y + this.currentJumpHeight;

			this.checkObstacles();
		}

		this.moveTilesWithSpeed(SPEED);
	};

	return TTTGame;

})();