module.exports = function(game) {
    return playState = {
        level: 1,
        maxLevel: 1,
        coinPositions: [
            {x: 120, y: 135}, {x: 680, y: 135},
            {x: 120, y: 295}, {x: 680, y: 295},
            {x: 120, y: 455}, {x: 680, y: 455}
        ],
        typed: "",
        lives: 3,
        energy: 100,
        maxEnergy: 100,
        currentFadeOutEnergyLabelTween: null,
        prevEnergyUpdateTime: 0,
        create: function() {
            game.time.advancedTiming = true;
            game.renderer.renderSession.roundPixels = true;
            this.level = 1;
            this.lives = game.global.get("lives");
            game.global.score = 0;
            this.maxEnergy = 100; // todo replace with localstorage
            this.energy = this.maxEnergy;
            this.currentFadeOutEnergyLabelTween = null;

            this.cursor = game.input.keyboard.createCursorKeys();

            this.player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
            this.player.anchor.setTo(0.5, 0.5);
            game.physics.arcade.enable(this.player);
            this.player.body.gravity.y = 500;
            this.player.animations.add('right', [1, 2], 8, true);
            this.player.animations.add('left', [3, 4], 8, true);

            this.enemies = game.add.group();
            this.enemies.enableBody = true;
            this.enemies.createMultiple(30, 'enemy');

            this.bullets = game.add.group();
            this.bullets.enableBody = true;
            this.bullets.createMultiple(20, 'pixel');

            this.coin = game.add.sprite(0, 0, 'coin');
            this.coin.anchor.setTo(0.5, 0.5);
            this.updateCoinPosition();
            game.physics.arcade.enable(this.coin);

            this.scoreLabel = game.add.text(30, 30, 'Score: 0', { font: '24px Arial', fill: '#ffffff' });
            game.global.score = 0;

            this.levelLabel = game.add.text(30, 60, "Level " + this.level, { font: '24px Arial', fill: '#ffffff' });
            this.livesLabel = game.add.text(30, 90, "Lives: " + this.lives, { font: '24px Arial', fill: '#ffffff' });

            this.coinsLabel = game.add.text(30, 120, "Coins: " + game.global.get("coins"), { font: '24px Arial', fill: '#ffffff' });

            this.jumpSound = game.add.audio('jump');
            this.coinSound = game.add.audio('coin');
            this.deadSound = game.add.audio('dead');

            this.emitter = game.add.emitter(0, 0);
            this.emitter.makeParticles('pixel', 0, 150, true);
            this.emitter.setYSpeed(-150, 150);
            this.emitter.setXSpeed(-150, 150);
            this.emitter.gravity = 0;

            this.music = game.add.audio('music');
            this.music.loop = true;
            this.music.volume = 0.5;
            this.music.play();

            this.createWorld();
            this.maxLevel = this.map.layers.length;

            this.nextEnemy = 0;

            game.input.keyboard.addKeyCapture([Phaser.Keyboard.UP, Phaser.Keyboard.DOWN, Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.SPACEBAR]);

            this.wasd = {
                up: game.input.keyboard.addKey(Phaser.Keyboard.W),
                left: game.input.keyboard.addKey(Phaser.Keyboard.A),
                right: game.input.keyboard.addKey(Phaser.Keyboard.D)
            };

            if (!game.device.desktop) {
                // Display the mobile inputs
                this.addMobileInputs();
            }

            var fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
            fireButton.onDown.add(this.fire, this);
            game.input.keyboard.onUpCallback = this.checkCheats;

            this.muteButton = game.add.button(game.world.width - 40, 30, 'mute', this.toggleSound, this);
            this.muteButton.input.useHandCursor = true;
            this.muteButton.anchor.setTo(1, 0);
            if (game.sound.mute) {
                this.muteButton.frame = 1;
            }

            this.energyLabel = game.add.text(game.world.width - 40, 60, "Energy: 100", { font: "24px Arial", fill: "#ffffff" });
            this.updateEnergy();
            this.energyLabel.anchor.setTo(1, 0);

            this.notEnoughEnergyLabel = game.add.text(game.world.centerX, game.world.height - 34, "Not Enough Energy!", { font: "24px Arial", fill: "#ffffff" });
            this.notEnoughEnergyLabel.anchor.setTo(0.5, 0.5);
            this.notEnoughEnergyLabel.alpha = 0;
        },
        incrementEnergy: function() {
            if (this.energy >= this.maxEnergy) return;
            this.energy+=5;
            this.updateEnergy();
        },
        fire: function() {
            if (this.energy >= 20) {
                this.prevEnergyUpdateTime = game.time.now;
                this.energy -= 20;
                if (Math.abs(this.player.body.velocity.x) > this.player.body.velocity.y) {
                    this.emitter.x = this.player.x + this.player.body.velocity.x/2;
                    this.emitter.y = this.player.y;
                } else if (this.player.body.velocity.x == 0 && this.player.body.velocity.y == 0) {
                    // up
                    this.emitter.x = this.player.x;
                    this.emitter.y = this.player.y + this.player.body.velocity.y/2;
                } else {
                    // stationary
                    this.emitter.x = this.player.x;
                    this.emitter.y = this.player.y;
                }
                this.emitter.start(true, 600, null, 30);

                for (var i = 0; i < 4; i++) {
                    var bullet = this.bullets.getFirstDead();
                    bullet.reset(this.player.x, this.player.y);
                    bullet.lifespan = 1000;
                    switch (i) {
                        case 0:
                            bullet.body.velocity.y = 400;
                            break;
                        case 1:
                            bullet.body.velocity.x = 400;
                            break;
                        case 2:
                            bullet.body.velocity.x = -400;
                            break;
                        case 3:
                            bullet.body.velocity.y = -400;
                            break;
                    }
                }

                this.updateEnergy();
            } else {
                this.notEnoughEnergy();
            }
        },
        notEnoughEnergy: function() {
            if (this.currentFadeOutEnergyLabelTween != null) this.currentFadeOutEnergyLabelTween.stop();
            this.notEnoughEnergyLabel.alpha = 1;
            game.time.events.add(Phaser.Timer.SECOND * 2, this.enoughEnergy, this);
        },
        enoughEnergy: function() {
            this.currentFadeOutEnergyLabelTween = game.add.tween(this.notEnoughEnergyLabel).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);
        },
        updateEnergy: function() {
            this.energyLabel.setText("Energy: " + this.energy);
        },
        toggleSound: function() {
            game.sound.mute = ! game.sound.mute;
            this.muteButton.frame = game.sound.mute ? 1 : 0;
        },
        checkCheats: function(key) {
            playState.typed += String.fromCharCode(key.keyCode);
            playState.typed = playState.typed.substring(playState.typed.length - 4, playState.typed.length);
            if (playState.typed.indexOf("HELP") != -1) {
                playState.enemies.forEachAlive(function(enemy) { enemy.kill(); });
            } else if (playState.typed.indexOf("MORE") != -1) {
                game.global.score += 50;
                playState.checkLevelUp();
                playState.scoreLabel.setText("Score: " + game.global.score);
            } else if (playState.typed.indexOf("LIVE") != -1) {
                playState.lives++;
                playState.livesLabel.setText("Lives: " + playState.lives);
            }
        },
        checkLevelUp: function() {
            if (game.global.score % 50 == 0) {
                this.levelUp();
            }
        },
        addMobileInputs: function() {
            // Add the jump button
            this.jumpButton = game.add.sprite(650, 400, 'jumpButton');
            this.jumpButton.inputEnabled = true;
            this.jumpButton.alpha = 0.5;

            this.moveLeft = false;
            this.moveRight = false;

            // Add the move left button
            this.leftButton = game.add.sprite(50, 400, 'leftButton');
            this.leftButton.inputEnabled = true;
            this.leftButton.events.onInputOver.add(function(){this.moveLeft=true;}, this);
            this.leftButton.events.onInputOut.add(function(){this.moveLeft=false;}, this);
            this.leftButton.events.onInputDown.add(function(){this.moveLeft=true;}, this);
            this.leftButton.events.onInputUp.add(function(){this.moveLeft=false;}, this);
            this.leftButton.alpha = 0.5;
            // Add the move right button
            this.rightButton = game.add.sprite(170, 400, 'rightButton');
            this.rightButton.inputEnabled = true;
            this.rightButton.events.onInputOver.add(function(){this.moveRight=true;}, this);
            this.rightButton.events.onInputOut.add(function(){this.moveRight=false;}, this);
            this.rightButton.events.onInputDown.add(function(){this.moveRight=true;}, this);
            this.rightButton.events.onInputUp.add(function(){this.moveRight=false;}, this);
            this.rightButton.alpha = 0.5;

            this.jumpButton.events.onInputDown.add(this.jumpPlayer, this);
        },
        createWorld: function() {
            this.map = game.add.tilemap('map');
            this.map.addTilesetImage('tileset');
            this.layer = this.map.createLayer('Level ' + this.level);
            this.setupMap();
        },
        levelUp: function() {
            this.lives++;
            this.livesLabel.setText("Lives: " + this.lives);
            if (this.level >= this.maxLevel) return;
            this.level++;
            this.layer.destroy();
            this.enemies.forEachAlive(function(enemy) { enemy.kill() });
            this.player.x = game.world.centerX;
            this.player.y = game.world.centerY;
            this.layer = this.map.createLayer('Level ' + this.level);
            this.setupMap();
            this.levelLabel.setText("Level " + this.level);
        },
        setupMap: function() {
            this.layer.resizeWorld();
            this.map.setCollision(1, true, this.layer);
            this.map.setTileIndexCallback(2, this.collidedWithRed, this, this.layer);
        },
        collidedWithRed: function(sprite) {
            if (sprite == this.player) this.playerDie();
        },
        addEnemy: function() {
            var enemy = this.enemies.getFirstDead();
            if (!enemy) return;
            enemy.anchor.setTo(0.5, 1);
            enemy.reset(game.world.centerX, 0);
            if (Phaser.Utils.chanceRoll(Math.min(10 + game.global.score/2.5, 50))) {
                // spawn hard enemy!
                enemy.scale.setTo(1.3, 1.3);
                enemy.body.gravity.y = 700;
                enemy.body.velocity.x = 150 * (Math.random() > 0.5 == 1 ? -1 : 1);
            } else {
                enemy.scale.setTo(1, 1);
                enemy.body.gravity.y = 500;
                enemy.body.velocity.x = 100 * (Math.random() > 0.5 == 1 ? -1 : 1);
            }
            enemy.body.bounce.x = 1;
            enemy.checkWorldBounds = true;
            enemy.outOfBoundsKill = true;
        },
        update: function() {
            if (window.location.href.indexOf("localhost") != -1) game.debug.text(game.time.fps, 2, 14, "#00ff00");
            game.physics.arcade.collide(this.player, this.layer);
            game.physics.arcade.collide(this.enemies, this.layer);
            game.physics.arcade.overlap(this.player, this.coin, this.takeCoin, null, this);
            game.physics.arcade.overlap(this.player, this.enemies, this.playerDie, null, this);
            game.physics.arcade.collide(this.enemies, this.emitter, this.enemyDie, null, this);
            game.physics.arcade.collide(this.enemies, this.bullets, this.enemyDie, null, this);
            this.movePlayer();
            if (!this.player.inWorld) {
                this.playerDie();
            }

            if (this.nextEnemy < game.time.now) {
                var start = 4000, end = 1000, score = 100;
                var delay = Math.max(start - (start-end)*game.global.score/score, end);
                if (this.level == 3) {
                    delay = 500;
                }
                this.addEnemy();
                this.nextEnemy = game.time.now + delay;
            }

            if (game.time.now - this.prevEnergyUpdateTime >= Phaser.Timer.SECOND*5/2) {
                this.incrementEnergy();
                this.prevEnergyUpdateTime = game.time.now;
            }
        },
        enemyDie: function(enemy) {
            enemy.kill();
        },
        movePlayer: function() {
            if (this.cursor.left.isDown || this.wasd.left.isDown || this.moveLeft) {
                this.player.body.velocity.x = -200;
                this.player.animations.play('left');
            } else if (this.cursor.right.isDown || this.wasd.right.isDown || this.moveRight) {
                this.player.body.velocity.x = 200;
                this.player.animations.play('right');
            } else {
                this.player.body.velocity.x = 0;
                this.player.frame = 0;
            }
            if (this.cursor.up.isDown || this.wasd.up.isDown) {
                this.jumpPlayer();
            }
        },
        takeCoin: function(player, coin) {
            game.global.score += 5;
            game.global.set("coins", game.global.get("coins")+1);
            this.scoreLabel.text = 'Score: ' + game.global.score;
            this.coinsLabel.text = "Coins: " + game.global.get("coins");
            this.coinSound.play();
            this.updateCoinPosition();

            if (game.global.score % 50 == 0) {
                this.levelUp();
            }

            this.coin.scale.setTo(0, 0);
            game.add.tween(this.coin.scale).to({x: 1, y: 1}, 300).start();

            game.add.tween(this.player.scale).to({x: 1.3, y: 1.3}, 50).to({x: 1, y: 1}, 150).start();
        },
        updateCoinPosition: function() {
            var spliced;
            for (var i = 0; i < this.coinPositions.length; i++) {
                if (this.coinPositions[i].x === this.coin.x && this.coinPositions[i].y == this.coin.y) {
                    var spliced = this.coinPositions.splice(i, 1);
                }
            }
            var newPosition = this.coinPositions[game.rnd.integerInRange(0, this.coinPositions.length-1)];
            if (spliced != null) this.coinPositions.push(spliced[0]);
            this.coin.reset(newPosition.x, newPosition.y);
        },
        playerDie: function() {
            if (!this.player.alive) {
                return;
            }
            this.lives--;
            this.enemies.forEachAlive(function(enemy) { enemy.kill(); });
            this.livesLabel.setText("Lives: " + this.lives);
            this.player.kill();
            this.emitter.x = this.player.x;
            this.emitter.y = this.player.y;
            this.emitter.start(true, 600, null, 15);
            this.deadSound.play();
            if (this.lives < 1) {
                this.music.stop();
                game.time.events.add(1000, this.startMenu, this);
            } else {
                game.time.events.add(1000, function() {
                    this.player.reset(game.world.centerX, game.world.centerY);
                }, this);
            }
        },
        jumpPlayer: function() {
            // If the player is touching the ground
            if (this.player.body.onFloor()) {
                // Jump with sound
                this.player.body.velocity.y = -320;
                this.jumpSound.play();
            }
        },
        startMenu: function() {
            game.state.start('menu');
        }
    };
};
