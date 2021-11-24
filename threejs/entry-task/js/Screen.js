import * as THREE from "https://cdn.skypack.dev/three@0.134.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/OrbitControls.js";

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
    this._render = render;

    this._initCamera(type);

    this._initControls();

    if (type !== "full") {
      this.camera.zoom = 10;
      this.camera.updateProjectionMatrix();
    }
    this._setRotation();

    this._initRaycaster();

    this._bindMouseEvent();
  }
  _setRotation() {
    if (this._type === "side") {
      this.camera.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    } else if (this._type === "front") {
      this.camera.rotation.set(Math.PI / 2, 0, 0);
    } else if (this._type === "top") {
      this.camera.rotation.set(0, 0, 0);
    }
  }
  _initControls() {
    this.controls = new OrbitControls(this.camera, this._dom);
    if (this._type === "full") {
      this.controls.enablePan = false;
    } else {
      this.controls.enableRotate = false;
    }
    this.controls.addEventListener("change", (data) => {
      if (this._type !== "full") {
        this.updateAllPoints(this.camera.zoom);
      }
      this._setRotation();
      this._render();
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
      -2000,
      2000
    );

    this._setCameraPosition();
  }
  _setPlane() {
    var cameraPoint = new THREE.Vector3();
    var plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(
      this.camera.getWorldDirection(plane.normal),
      cameraPoint
    );
    return plane;
  }
  _screenTOWorld(clientX, clientY) {
    //三维坐标
    var worldPoint = new THREE.Vector3();
    //获取渲染的DOM元素
    var rect = this.getLocation();
    const mousePoint = new THREE.Vector2();
    //转设备坐标
    mousePoint.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mousePoint.y = -((clientY - rect.canvasY) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(mousePoint, this.camera);
    //获取平面
    var screenPlane = this._setPlane();
    //求交
    this._raycaster.ray.intersectPlane(screenPlane, worldPoint);

    // 转化为局部坐标
    const boxWrapper = this.scene.getObjectByName("boxWrapper");
    boxWrapper.worldToLocal(worldPoint);

    return worldPoint;
  }
  _initRaycaster() {
    this._raycaster = new THREE.Raycaster();
  }
  _setCameraPosition(position = {}) {
    const { x = 0, y = 0, z = 0 } = position;
    if (this._type === "top") {
      this.camera.position.z = 500;
      this.camera.position.x = x;
      this.camera.position.y = y;
    } else if (this._type === "side") {
      this.camera.position.x = 500;
      this.camera.position.y = y;
      this.camera.position.z = z;
    } else if (this._type === "front") {
      this.camera.position.y = -500;
      this.camera.position.x = x;
      this.camera.position.z = z;
    }
  }
  _bindMouseEvent() {
    if (this._type === "full") return;
    this._dom.addEventListener(
      "mousedown",
      (e) => {
        this._onMouseDown(e);
      },
      false
    );
    this._dom.addEventListener("mouseup", (e) => {
      if (e.which !== 1) return;
      this._isMove = false;
      setTimeout(() => {
        this._onEndDrag();
        this._render();
      }, 100);
    });
    this._dom.addEventListener("mousemove", (e) => {
      this._onMouseMove(e);
    });
  }
  resetLocalPosition() {
    const boxWrapper = this.scene.getObjectByName("boxWrapper");
    const box = this.scene.getObjectByName("box");

    let position = new THREE.Vector3();

    box.getWorldPosition(position);

    boxWrapper.position.copy(position);

    box.position.set(0, 0, 0);

    this._setCameraPosition();
    this.updateAllPoints();
  }
  _onMouseMove(event) {
    if (!this._isMove || event.which !== 1) return;
    const currentMousePosition = this._screenTOWorld(
      event.clientX,
      event.clientY
    );

    const x = currentMousePosition.x - this.oldMousePosition.x;
    const y = currentMousePosition.y - this.oldMousePosition.y;
    const z = currentMousePosition.z - this.oldMousePosition.z;

    const distance = { x, y, z }

    if (this._intersect.name === "box") {
      this._onDrag({ position: distance });
    } else if (this._intersect.name === "points") {
      if (this._intersect.locationType === 'top') {
        this._computedRotation(distance);
      } else {
        this._computedScale(distance, this._intersect);
      }
    }

    this.oldMousePosition = currentMousePosition;
  }
  moveBox({ x, y, z }) {
    const box = this.scene.getObjectByName("box");
    box.position.set(
      box.position.x + x,
      box.position.y + y,
      box.position.z + z
    );
  }
  _onMouseDown(event) {
    if (event.which !== 1) return;
    const location = this.getLocation();
    this._mouse.x = ((event.clientX - location.left) / location.width) * 2 - 1;
    this._mouse.y = -((event.clientY - location.top) / location.height) * 2 + 1;

    this.oldMousePosition = this._screenTOWorld(event.clientX, event.clientY);

    // 通过鼠标点的位置和当前相机的矩阵计算出raycaster
    this._raycaster.setFromCamera(this._mouse, this.camera);

    // 获取raycaster直线和所有模型相交的数组集合
    let intersects = this._raycaster.intersectObjects(
      this.scene.children,
      true
    );

    intersects = intersects.filter(
      (item) => item.object.name === "box" || item.object.name === "points"
    );

    if (!intersects.length) return;

    this._isMove = true;

    this._intersect = intersects[0].object;
  }
  _updatePoints(pointsArr, zoom) {
    this.scene.getObjectByName("boxWrapper").children.forEach((item) => {
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
    this.boxWrapper.add(sphere);
    return sphere;
  }
  _addPoints(object) {
    if (this._type === "full") return [];
    const boxSize = this._computedBoxSize(object);
    return this._computedPointLocation(boxSize).map((item) =>
      this._addPoint(item)
    );
  }

  updateAllPoints(zoom) {
    const box = this.scene.getObjectByName('box');
    const boxSize = this._computedBoxSize(box);
    this._updatePoints(this._computedPointLocation(boxSize), zoom);
  }

  _computedPointLocation({ size, position }) {
    const { width, height, long } = size;

    const { x, y, z } = position;

    switch (this._type) {
      case "top":
        return [
          {
            x: x + width / 2,
            y: y + long / 2,
            z: 100,
            locationType: "topRight",
          },
          {
            x: x - width / 2,
            y: y + long / 2,
            z: 100,
            locationType: "topLeft",
          },
          {
            x: x + width / 2,
            y: y - long / 2,
            z: 100,
            locationType: "bottomRight",
          },
          {
            x: x - width / 2,
            y: y - long / 2,
            z: 100,
            locationType: "bottomLeft",
          },
          {
            x: x,
            y: y + long / 2 + ( 3 / this.camera.zoom) * 10,
            z: 100,
            locationType: "top",
          },
        ];
      case "side":
        return [
          {
            x: 100,
            y: y + long / 2,
            z: z + height / 2,
            locationType: "topRight",
          },
          {
            x: 100,
            y: y - long / 2,
            z: z + height / 2,
            locationType: "topLeft",
          },
          {
            x: 100,
            y: y + long / 2,
            z: z - height / 2,
            locationType: "bottomRight",
          },
          {
            x: 100,
            y: y - long / 2,
            z: z - height / 2,
            locationType: "bottomLeft",
          },
          {
            x: 100,
            y: y,
            z: z + height / 2 + ( 3 / this.camera.zoom) * 10,
            locationType: "top",
          },
        ];
      case "front":
        return [
          {
            x: x + width / 2,
            y: -19,
            z: z + height / 2,
            locationType: "topRight",
          },
          {
            x: x - width / 2,
            y: -19,
            z: z + height / 2,
            locationType: "topLeft",
          },
          {
            x: x + width / 2,
            y: -19,
            z: z - height / 2,
            locationType: "bottomRight",
          },
          {
            x: x - width / 2,
            y: -19,
            z: z - height / 2,
            locationType: "bottomLeft",
          },
          {
            x: x,
            y: -19,
            z: z + height / 2 + ( 3 / this.camera.zoom) * 10,
            locationType: "top",
          },
        ];
    }
    return [];
  }

  _computedBoxSize(object) {
    const boxCopy = object.clone();
    const box = new THREE.Box3().setFromObject(boxCopy);
    const boxSize = box.max.sub(box.min);
    const width = Math.abs(boxSize.x);
    const height = Math.abs(boxSize.z);
    const long = Math.abs(boxSize.y);

    return {
      size: {
        width,
        height,
        long,
      },
      position: object.position,
      rotation: object.rotation,
    };
  }

  _createBoxWrapper(object) {
    const boxWrapper = new THREE.Object3D();

    boxWrapper.position.set(
      object.position.x,
      object.position.y,
      object.position.z
    );
    boxWrapper.rotation.set(
      object.rotation.x,
      object.rotation.y,
      object.rotation.z
    );
    this.add(boxWrapper);

    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);

    boxWrapper.name = "boxWrapper";

    const axesHelper = new THREE.AxesHelper(20);
    boxWrapper.add(axesHelper);

    boxWrapper.add(object);

    this.boxWrapper = boxWrapper;
    return boxWrapper;
  }
  _computedRotation({ x, y, z }) {
    const box = this.scene.getObjectByName("box");
    const {
      size: { height, long },
    } = this._computedBoxSize(box);

    const sizeTor = {
      top: {
        r: long / 2 + 3,
        distance: {
          x,
          y,
        },
      },
      side: {
        r: height / 2 + 3,
        distance: {
          x: y,
          y: z,
        },
      },
      front: {
        r: height / 2 + 3,
        distance: {
          x,
          y: z,
        },
      },
    };
    const { r, distance } = sizeTor[this._type]
    if (!distance.x || !distance.y) {
      return;
    }
    let c2 = Math.pow(distance.x, 2) + Math.pow(distance.y, 2);
    let rotation = Math.acos((2 * Math.pow(r, 2) - c2) / (2 * Math.pow(r, 2)));

    const rotationFromType = {
      top: "rotateZ",
      side: "rotateX",
      front: "rotateY",
    };

    const rotationDirection = rotationFromType[this._type];

    this._onDrag(
      {
        rotation: {
          num: rotation * (-distance.x / Math.abs(distance.x)),
          rotationDirection: rotationDirection,
        },
      }
    );
  }
  rotationBox({ num, rotationDirection}) {
    const boxWrapper = this.scene.getObjectByName("boxWrapper");
    boxWrapper[rotationDirection](num)
  }
  _computedScale({ x, y, z }, point) {
    const box = this.scene.getObjectByName("box");
    const {
      size: { width, height, long },
    } = this._computedBoxSize(box);

    let position = {
      x: x / 2,
      y: y / 2,
      z: z / 2,
    };

    const threeCoordinateToScreen = {
      top: {
        coordinate: {
          x: x,
          y: y
        },
        size: {
          x: width,
          y: long
        },
        baseScale: {
          x: width / box.scale.x,
          y: long / box.scale.y
        }
      },
      side: {
        coordinate: {
          x: y,
          y: z
        },
        size: {
          x: long,
          y: height
        },
        baseScale: {
          x: long / box.scale.y,
          y: height / box.scale.z
        }
      },
      front: {
        coordinate: {
          x: x,
          y: z
        },
        size: {
          x: width,
          y: height
        },
        baseScale: {
          x: width / box.scale.x,
          y: height / box.scale.z
        }
      }
    }

    const screenCoordinate = threeCoordinateToScreen[this._type];

    switch (point.locationType) {
      case "bottomRight":
        screenCoordinate.coordinate.y = -screenCoordinate.coordinate.y;
        break;
      case "topLeft":
        screenCoordinate.coordinate.x = -screenCoordinate.coordinate.x;
        break;
      case "bottomLeft":
        screenCoordinate.coordinate.y = -screenCoordinate.coordinate.y;
        screenCoordinate.coordinate.x = -screenCoordinate.coordinate.x;
        break;
    }

    const newWidth = screenCoordinate.size.x + screenCoordinate.coordinate.x
    const newHeight = screenCoordinate.size.y + screenCoordinate.coordinate.y

    const scaleX = newWidth / screenCoordinate.baseScale.x
    const scaleY = newHeight / screenCoordinate.baseScale.y

    const screenScaleToWorld = {
      top: {
        x: scaleX,
        y: scaleY
      },
      side: {
        y: scaleX,
        z: scaleY
      },
      front: {
        x: scaleX,
        z: scaleY
      }
    }

    this._onDrag(
      {
        position,
        scale: screenScaleToWorld[this._type],
      },
    );
  }
  scaleBox({ x, y, z }, position) {
    const box = this.scene.getObjectByName("box");
    box.scale.set(
      x || box.scale.x,
      y || box.scale.y,
      z || box.scale.z
    );
    this._setCameraPosition({
      x: this.camera.position.x + position.x,
      y: this.camera.position.y + position.y,
      z: this.camera.position.z + position.z
    })
  }
  bindDragControl(box, onDrag, onEndDrag) {
    const boxWrapper = this._createBoxWrapper(box);

    this._addPoints(box);

    boxWrapper.add(this.camera);

    this._onDrag = (data) => {
      onDrag.call(null, data);
    };
    this._onEndDrag = onEndDrag;
    this._box = box;
  }
  add(el) {
    this.scene.add(el);
  }
  update() {
    const location = this.getLocation();
    if (this._type === "full") {
      this.camera.aspect = location.width / location.height;
    } else {
      this.camera.left = location.width / -2;
      this.camera.right = location.width / 2;
      this.camera.top = location.height / 2;
      this.camera.bottom = location.height / -2;
    }
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
