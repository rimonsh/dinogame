import { GetSprite } from "../assets/loader";
import * as PIXI from "pixi.js";

type WorldObject = Player | ScrollingObject;

class Player {
  sprite: PIXI.AnimatedSprite;
  airborne: boolean;
  solid = false;
  verticalSpeed: number;

  public constructor() {
    this.sprite = GetSprite("ghost");
    this.sprite.x = 5;
    this.sprite.anchor.set(0, 1);

    this.sprite.y = GameApp.GroundPosition;
    this.sprite.animationSpeed = 0.05;
    this.sprite.play();

    GameApp.Stage.addChild(this.sprite);
  }

  private collidesWith(otherSprite: PIXI.Sprite) {
    let ab = this.sprite.getBounds();
    let bb = otherSprite.getBounds();
    return !(
      ab.x > bb.x + bb.width ||
      ab.x + ab.width < bb.x ||
      ab.y + ab.height < bb.y ||
      ab.y > bb.y + bb.height
    );
  }

  public Update(delta: number, activeEntities: Array<WorldObject>) {
    if (this.sprite.y >= GameApp.GroundPosition) {
      this.sprite.y = GameApp.GroundPosition;
      this.verticalSpeed = 0;
      this.airborne = false;
    }

    if (this.airborne) {
      this.verticalSpeed += delta / 3;
    }

    if (GameApp.PressedSpace && !this.airborne) {
      this.airborne = true;
      this.verticalSpeed = -5;
    }
    this.sprite.y += this.verticalSpeed * delta;

    for (const currentEntity of GameApp.ActiveEntities) {
      if (this.collidesWith(currentEntity.sprite)) {
        if (isScrollingObject(currentEntity) && currentEntity.type === 'good') {
    
          // Check if the good obstacle is not a cloud
          if (!currentEntity.isCloud) {
            GameApp.Score += 10; // Increment score for good non-cloud obstacles
            GameApp.showFloatingText("+10", currentEntity.sprite.x, currentEntity.sprite.y);
          }
    
          GameApp.Stage.removeChild(currentEntity.sprite);
          GameApp.ActiveEntities.splice(GameApp.ActiveEntities.indexOf(currentEntity), 1);
        } else if (isScrollingObject(currentEntity) && currentEntity.type === 'bad' && currentEntity.solid) {
          GameApp.GameOver = true;
        }
      }
    }
  }
}

// Type guard to check if an object is ScrollingObject
function isScrollingObject(entity: WorldObject): entity is ScrollingObject {
  return (entity as ScrollingObject).type !== undefined;
}

class ScrollingObject {
  sprite: PIXI.AnimatedSprite;
  airborne: boolean;
  solid: boolean = true;
  type: 'good' | 'bad'; // Add type property
  isCloud: boolean; // Add isCloud property

  public constructor(
    spriteName: string,
    x: number,
    y: number,
    isSolid: boolean,
    type: 'good' | 'bad' // Include type in the constructor
  ) {
    this.sprite = GetSprite(spriteName);
    this.sprite.y = y;
    this.sprite.anchor.set(0, 1);
    this.sprite.x = x;
    this.solid = isSolid;
    this.type = type; // Set the type
    this.isCloud = spriteName === "cloud"; // Set isCloud based on spriteName

  }

  public Update(delta: number) {
    let baseScrollSpeed = this.solid ?
      GameApp.ScrollSpeed : 
      GameApp.ScrollSpeed - 1;
    let scrollSpeed = baseScrollSpeed + Math.min(GameApp.Score / 15.0, 1);
    this.sprite.x -= delta * scrollSpeed;
  }
}

export class GameApp {
  public app: PIXI.Application;
  static ScoreText: PIXI.Text = new PIXI.Text("Score: ", {
    fontSize: 5,
    fill: "#aaff",
    align: "center",
    stroke: "#aaaaaa",
    strokeThickness: 0
  });

  static PressedSpace = false;
  static Stage: PIXI.Container;
  static ActiveEntities: Array<WorldObject> = [];
  static GameOver: boolean = true;
  static ScrollSpeed = 3;
  static ScoreNextObstacle = 0;
  static Score: number = 0;
  static MaxScore = 0;
  static FloatingTexts: Array<{ text: PIXI.Text, elapsed: number }> = [];
  static GroundPosition = 0;
  static Width = 0;

  constructor(parent: HTMLElement, width: number, height: number) {
    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x0254EC,
      antialias: false,
      resolution: 3
    });
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    GameApp.Stage = this.app.stage;
    GameApp.GroundPosition = height - 1;
    GameApp.Width = width - 1;

    // Hack for parcel HMR
    parent.replaceChild(this.app.view, parent.lastElementChild);

    window.onkeydown = (ev: KeyboardEvent): any => {
      GameApp.PressedSpace = ev.key == " ";
      if (ev.target == document.body) { 
        ev.preventDefault();
      }
    };

    window.ontouchstart = (ev: TouchEvent): any => {
      GameApp.PressedSpace = true;
    };

    GameApp.SetupGame();

    this.app.ticker.add(delta => {
      GameApp.Update(delta);

      // if we didn't lose, display score and max score, otherwise show a "game over" prompt
      if (!GameApp.GameOver) {
        GameApp.ScoreText.text =
          "Score: " +
          Math.ceil(GameApp.Score) +
          " - Max Score: " +
          Math.ceil(GameApp.MaxScore);
      } else {
        if (GameApp.Score == 0) {
          GameApp.ScoreText.text = "Press spacebar or touch screen to start!"; 
          return;
        };
        GameApp.ScoreText.text =
          "Game over! You scored " +
          Math.ceil(GameApp.Score) +
          ". Max Score: " +
          Math.ceil(GameApp.MaxScore) +
          ". Press spacebar or touch to restart.";
      }
    });
  }

  static SetupGame() {
    this.Score = 0;

    this.ActiveEntities = new Array<WorldObject>();
    this.Stage.removeChildren();

    let player = new Player();
    GameApp.ActiveEntities.push(player);

    let myGraph = new PIXI.Graphics();
    myGraph.position.set(0, 75);
    myGraph.lineStyle(10, 0xFFBFD6).lineTo(300, 0);

    GameApp.Stage.addChild(myGraph);
    this.ScoreNextObstacle = 0;
    GameApp.Stage.addChild(GameApp.ScoreText);
  }

  static getRandomBadObstacle() {
    const badObstacleSprites = ['kafa'];
    return badObstacleSprites[Math.floor(Math.random() * badObstacleSprites.length)];
  }

  static getRandomGoodObstacle() {
    const goodObstacleSprites = ['docker'];
    return goodObstacleSprites[Math.floor(Math.random() * goodObstacleSprites.length)];
  }

  static Update(delta: number) {
    if (!this.GameOver) {
      for (let i = 0; i < GameApp.ActiveEntities.length; i++) {
        const currentEntity = GameApp.ActiveEntities[i];
        currentEntity.Update(delta, GameApp.ActiveEntities);
  
        if (currentEntity.sprite.x < -20) {
          currentEntity.sprite.destroy();
          GameApp.ActiveEntities.splice(i, 1);
        }
      }
      this.Score += (delta) / 6;
  
      if (this.Score > this.MaxScore) this.MaxScore = this.Score;
      if (GameApp.ShouldPlaceWorldObject()) {
        // Generate a bad obstacle on the ground

        let isGoodObstacle = Math.random() < 0.5;
        if (!isGoodObstacle){
          GameApp.AddObject(
            GameApp.getRandomBadObstacle(),
            GameApp.GroundPosition,
            true,
            'bad'
          );
        }
        // Generate a good obstacle as a cloud
        else{
          GameApp.AddObject(GameApp.getRandomGoodObstacle(), GameApp.GroundPosition, false, 'good'); 
        }

        GameApp.AddObject("cloud", 20, false, 'good');
        this.ScoreNextObstacle += this.GetScoreNextObstacle();
      }
      GameApp.updateFloatingTexts(delta); // Update floating texts
    } else {
      if (GameApp.PressedSpace) {
        this.GameOver = false;
        this.SetupGame();
      }
    }
  
    GameApp.PressedSpace = false;
  }  

  static ShouldPlaceWorldObject(): boolean {
    return this.Score >= this.ScoreNextObstacle;
  }

  static GetScoreNextObstacle(): number {
    let minimumDistance = 25;
    let maximumDistance = 50; // Adjust this value for larger gaps if needed
    let difficulty = Math.min(this.Score / 100, 5);
    return minimumDistance + Math.random() * (maximumDistance - minimumDistance) - difficulty * 4;
  }
  
  static showFloatingText(text: string, x: number, y: number) {
    let floatingText = new PIXI.Text(text, {
      fontSize: 8,
      fill: "#ffffff",
      align: "center",
      stroke: "#000000",
      strokeThickness: 2
    });
  
    floatingText.x = x;
    floatingText.y = y;
    GameApp.Stage.addChild(floatingText);
  
    GameApp.FloatingTexts.push({ text: floatingText, elapsed: 0 });
  }
  
  static updateFloatingTexts(delta: number) {
    const fadeOutTime = 60; // Duration for the fade-out effect in frames
  
    for (let i = GameApp.FloatingTexts.length - 1; i >= 0; i--) {
      const floatingTextObj = GameApp.FloatingTexts[i];
      floatingTextObj.elapsed += delta;
      floatingTextObj.text.y -= 0.5; // Move the text upwards
      floatingTextObj.text.alpha = 1 - (floatingTextObj.elapsed / fadeOutTime); // Fade out the text
  
      if (floatingTextObj.elapsed >= fadeOutTime) {
        GameApp.Stage.removeChild(floatingTextObj.text);
        GameApp.FloatingTexts.splice(i, 1);
      }
    }
  }
  
  private static AddObject(
    spriteName: string,
    height: number,
    isSolid: boolean,
    type: 'good' | 'bad'
  ) {
    let obstacle = new ScrollingObject(
      spriteName,
      GameApp.Width,
      height,
      isSolid,
      type
    );
    GameApp.ActiveEntities.push(obstacle);
    GameApp.Stage.addChild(obstacle.sprite);
  }
}
