import * as THREE from "https://cdn.skypack.dev/three@0.134.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/OrbitControls.js";
import { DragControls } from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/DragControls.js";

export default class Screen {
  scene = null;
  camera = null;
  _isMove = false;
  _dom = null;
  _type = "";
  _raycaster = null;
  _mouse = new THREE.Vector2();
  _moveLocation = new THREE.Vector2();
  _intersects = [];

  constructor(dom, render, type) {
    this.scene = new THREE.Scene();
    this._dom = dom;
    this._type = type;

    this._initCamera(type);

    this._initControls(render);
    if (type !== "full") {
      this.camera.zoom = 10;
      this.camera.updateProjectionMatrix();
    }
    this._setRotation();

    const arrowHelper = new THREE.AxesHelper(5);
    this.scene.add(arrowHelper);
  }
  _setRotation() {
    if (this._type === "side") {
      this.camera.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    } else if (this._type === "front") {
      this.camera.rotation.set(Math.PI / 2, 0, 0);
    }
    this.camera.updateProjectionMatrix();
  }
  _initControls(render) {
    this._render = render;
    this.controls = new OrbitControls(this.camera, this._dom);
    this.controls.addEventListener("change", (data) => {
      if (this._type !== "full") {
        this.updateAllPoints(this._object, this.camera.zoom);
      }
      this._setRotation();
      render();
    });
  }
  _initCamera() {
    const location = this.getLocation();
    if (this._type === "full") {
      const fv = 75;
      const aspect = location.width / location.height;
      const near = 1;
      const far = 1000;
      this.camera = new THREE.PerspectiveCamera(fv, aspect, near, far);
      this.camera.position.z = 100;
      this.camera.up.set(0, 0, 1);
      return;
    }

    this.camera = new THREE.OrthographicCamera(
      location.width / -2,
      location.width / 2,
      location.height / 2,
      location.height / -2,
      -50000,
      1000000
    );
    this.camera.up.set(0, 0, 3);

    if (this._type === "top") {
      this.scene.position.z = -1000;
    } else if (this._type === "front") {
      this.scene.position.y = 1000;
    } else if (this._type === "side") {
      this.scene.position.x = -1000;
    }
  }
  _updatePoints(pointsArr, zoom) {
    this.scene.children.forEach((item) => {
      if (item.name !== "points") return;
      if (typeof zoom !== "undefined")
        item.scale.set(10 / zoom, 10 / zoom, 10 / zoom);
      const index = pointsArr.findIndex(
        (i) => i.locationType === item.locationType
      );
      if (index === -1) return;
      const position = pointsArr[index];
      item.position.set(position.x, position.y, position.z);
    });
  }
  _addPoint({ x, y, z, locationType }) {
    const geometry = new THREE.SphereGeometry(0.7);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(x, y, z);
    sphere.name = "points";
    sphere.locationType = locationType;
    this.add(sphere);
    return sphere;
  }
  _addPoints(object) {
    if (this._type === "full") return [];
    return this._computedPointLocation(this._computedBoxSize(object)).map(
      (item) => this._addPoint(item)
    );
  }

  updateAllPoints(object, zoom) {
    this._updatePoints(
      this._computedPointLocation(this._computedBoxSize(object)),
      zoom
    );
  }

  _computedPointLocation({ size, position, rotation }) {
    const { width, height, long } = size;

    const { x, y, z } = position;


    switch (this._type) {
      case "top":
        return [
          {
            x: x + width / 2,
            y: y + long / 2,
            z: 10,
            locationType: "topRight",
          },
          {
            x: x - width / 2,
            y: y + long / 2,
            z: 10,
            locationType: "topLeft",
          },
          {
            x: x + width / 2,
            y: y - long / 2,
            z: 10,
            locationType: "bottomRight",
          },
          {
            x: x - width / 2,
            y: y - long / 2,
            z: 10,
            locationType: "bottomLeft",
          }
        ];
      case "side":
        return [
          {
            x: 10,
            y: y + long / 2,
            z: z + height / 2,
            locationType: "topRight",
          },
          {
            x: 10,
            y: y - long / 2,
            z: z + height / 2,
            locationType: "topLeft",
          },
          {
            x: 10,
            y: y + long / 2,
            z: z - height / 2,
            locationType: "bottomRight",
          },
          {
            x: 10,
            y: y - long / 2,
            z: z - height / 2,
            locationType: "bottomLeft",
          },
        ];
      case "front":
        return [
          {
            x: x + width / 2,
            y: -100,
            z: z + height / 2,
            locationType: "topRight",
          },
          {
            x: x - width / 2,
            y: -100,
            z: z + height / 2,
            locationType: "topLeft",
          },
          {
            x: x + width / 2,
            y: -100,
            z: z - height / 2,
            locationType: "bottomRight",
          },
          {
            x: x - width / 2,
            y: -100,
            z: z - height / 2,
            locationType: "bottomLeft",
          },
        ];
    }
    return [];
  }

  _computedBoxSize(object) {
    const box = new THREE.Box3().setFromObject(object);
    const boxSize = box.max.sub(box.min);
    const width = Math.abs(boxSize.x);
    const height = Math.abs(boxSize.z);
    const long = Math.abs(boxSize.y);

    var position = new THREE.Vector3();
    object.getWorldPosition(position);

    return {
      size: {
        width,
        height,
        long,
      },
      position,
      rotation: object.rotation,
    };
  }

  bindDragControl(object, onDrag) {
    const points = this._addPoints(object);

    this._object = object;

    const dragControls = new DragControls(
      [object, ...points],
      this.camera,
      this._dom
    );

    let oldPointsPosition = null;

    dragControls.addEventListener("dragstart", (event) => {
      oldPointsPosition = event.object.position.clone();
    });

    dragControls.addEventListener("drag", (event) => {
      if (event.object.name === "box") {
        this._updatePoints(
          this._computedPointLocation(this._computedBoxSize(event.object))
        );
        onDrag({ position: event.object.position }, this._type);
        this._render();
      } else {
        const distance = oldPointsPosition.sub(event.object.position);

        let newWidth, newLong, newHeight;
        const {
          size: { width, height, long },
        } = this._computedBoxSize(object);
        let x = -distance.x;
        let y = -distance.y;
        let z = -distance.z;

        let positionX = object.position.x + x / 2;
        let positionY = object.position.y + y / 2;
        let positionZ = object.position.z + z / 2;

        let position = {};

        let scale = {};

        let baseX, baseY, baseZ;

        switch (this._type) {
          case "top":
            switch (event.object.locationType) {
              case "bottomRight":
                y = -y;
                break;
              case "topLeft":
                x = -x;
                break;
              case "bottomLeft":
                y = -y;
                x = -x;
                break;
            }

            newWidth = width + x;
            newLong = long + y;

            baseX = width / object.scale.x;
            baseY = long / object.scale.y;

            object.scale.x = newWidth / baseX;

            object.scale.y = newLong / baseY;

            scale = {
              x: object.scale.x,
              y: object.scale.y,
            };
            object.position.x = positionX;
            object.position.y = positionY;
            position = {
              x: positionX,
              y: positionY,
            };
            break;
          case "side":
            switch (event.object.locationType) {
              case "bottomRight":
                z = -z;
                break;
              case "topLeft":
                y = -y;
                break;
              case "bottomLeft":
                y = -y;
                z = -z;
                break;
            }

            newHeight = height + z;
            newLong = long + y;

            baseZ = height / object.scale.z;
            baseY = long / object.scale.y;

            object.scale.y = newLong / baseY;

            object.scale.z = newHeight / baseZ;

            scale = {
              y: object.scale.y,
              z: object.scale.z,
            };
            object.position.z = positionZ;
            object.position.y = positionY;

            position = {
              z: positionZ,
              y: positionY,
            };
            break;
          case "front":
            switch (event.object.locationType) {
              case "bottomRight":
                z = -z;
                break;
              case "topLeft":
                x = -x;
                break;
              case "bottomLeft":
                x = -x;
                z = -z;
                break;
            }

            newHeight = height + z;
            newWidth = width + x;

            baseZ = height / object.scale.z;
            baseX = width / object.scale.x;

            object.scale.x = newWidth / baseX;

            object.scale.z = newHeight / baseZ;

            scale = {
              x: object.scale.x,
              z: object.scale.z,
            };
            object.position.z = positionZ;
            object.position.x = positionX;
            position = {
              x: positionX,
              y: positionY,
            };
            break;
        }
        this._updatePoints(
          this._computedPointLocation({
            size: {
              width: newWidth,
              long: newLong,
              height: newHeight,
            },
            position: object.position.clone(),
          }).filter((item) => item.locationType !== event.object.locationType)
        );

        onDrag({ position, scale }, this._type);
        oldPointsPosition = event.object.position.clone();
      }
    });
  }
  add(el) {
    this.scene.add(el);
  }
  update() {
    const location = this.getLocation();
    this.camera.aspect = location.width / location.height;
    this.camera.updateProjectionMatrix();
  }
  getLocation() {
    const domRect = this._dom.getBoundingClientRect();
    return {
      x: domRect.x,
      y: domRect.y,
      bottom: domRect.bottom,
      height: domRect.height,
      left: domRect.left,
      top: domRect.top,
      width: domRect.width,
      canvasY: window.innerHeight - domRect.bottom,
    };
  }
}
