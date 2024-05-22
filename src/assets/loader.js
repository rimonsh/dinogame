import ghost from "./images/ghost/*.png";
import cloud from "./images/cloud/*.png";
import badObstacleSprite1 from "./images/badObstacleSprite1/*.png";
import goodObstacleSprite1 from "./images/goodObstacleSprite1/*.png";
import docker from "./images/docker/*.png";
import kafa from "./images/kafa/*.png";

import * as PIXI from "pixi.js";

const spriteNames = {
  ghost: Object.values(ghost),
  badObstacleSprite1: Object.values(badObstacleSprite1),
  goodObstacleSprite1: Object.values(goodObstacleSprite1),
  docker: Object.values(docker),
  kafa: Object.values(kafa),
  cloud: Object.values(cloud),
};
export function GetSprite(name) {
  const spritePaths = spriteNames[name];
  if (!spritePaths) {
    throw new Error(`Sprite name '${name}' not found.`);
  }
  const textures = spritePaths.map((path) => PIXI.Texture.from(path));
  return new PIXI.AnimatedSprite(textures);
}
