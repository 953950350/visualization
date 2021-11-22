import * as THREE from "https://cdn.skypack.dev/three@0.134.0";
import { PCDLoader } from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/loaders/PCDLoader.js";
import Screen from "./Screen.js";

export default class BoxEdit {
  constructor(canvas, boxData, domList, pcdUrl, boxChange = () => {}) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    renderer.sortObjects = false;

    const screens = domList.map(({ dom, type }) => {
      return new Screen(dom, this.render.bind(this), type);
    });

    this.renderer = renderer;
    this.screens = screens;
    this._boxChange = boxChange;

    this.loaderPCD(pcdUrl);
    this.addBox(boxData);

    window.addEventListener("resize", this.onResize.bind(this));
  }

  render() {
    this.screens.forEach((screen) => {
      this.renderer.setScissorTest(true);
      const location = screen.getLocation();
      this.renderer.setScissor(
        location.left,
        location.canvasY,
        location.width,
        location.height
      );
      this.renderer.setViewport(
        location.left,
        location.canvasY,
        location.width,
        location.height
      );
      this.renderer.render(screen.scene, screen.camera);
    });
  }

  loaderPCD(pcdUrl) {
    const loader = new PCDLoader();
    loader.load(pcdUrl, (points) => {
      points.material.color.setHex(0xfffff0);
      this.screens.forEach((screen) => screen.add(points.clone()));
      this.render();
    });
  }

  addBox(boxData) {
    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const material = new THREE.MeshBasicMaterial({
      color: "red",
      alphaTest: 0.5,
    });
    const cube = new THREE.Mesh(geometry, material);

    const { position, scale, rotation, objectType, objectId } = boxData;

    cube.name = "box";

    cube.position.set(position.x, position.y, position.z);
    cube.scale.set(scale.x, scale.y, scale.z);
    cube.rotation.set(rotation.x, rotation.y, rotation.z);

    this.screens.forEach((screen) => {
      const newCube = cube.clone();
      if (screen._type === "full") {
        screen._createBoxWrapper(newCube);
      } else {
        screen.bindDragControl(
          newCube,
          ({ position, scale, rotation }, current) => {
            this.screens
              .filter((screen) => screen._type !== current)
              .forEach((screen) => {
                const boxWrapper = screen.scene.getObjectByName("boxWrapper");
                const box = screen.scene.getObjectByName("box");
                if (rotation) {
                  // boxWrapper.rotation.copy(rotation);
                  const { num, rotationDirection } = rotation;
                  boxWrapper[rotationDirection](num)
                }
                if (position) {
                  box.position.set(
                    position.x || box.position.x,
                    position.y || box.position.y,
                    position.z || box.position.z
                  );
                }
                if (scale) {
                  box.scale.set(
                    scale.x || box.scale.x,
                    scale.y || box.scale.y,
                    scale.z || box.scale.z
                  );
                }
                screen.updateAllPoints(box);
              });
            this._boxChange(this.getBoxSizeData());
          }
        );
      }
    });
  }

  onResize() {
    this.screens.forEach((screen) => screen.update());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }

  getBoxSizeData() {
    const scene = this.screens[0].scene;
    if (!scene) return null;
    const boxWrapper = scene.getObjectByName("boxWrapper");
    const box = scene.getObjectByName("box");

    var position = new THREE.Vector3();
    box.getWorldPosition(position);

    return {
      position: position,
      scale: box.scale.clone(),
      rotation: boxWrapper.rotation.clone(),
    };
  }
}
