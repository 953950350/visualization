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
  _initControls(render) {
    this._render = render;
    this.controls = new OrbitControls(this.camera, this._dom);
    if (this._type === "full") {
      this.controls.enablePan = false;
    } else {
      this.controls.enableRotate = false;
    }
    this.controls.addEventListener("change", (data) => {
      if (this._type !== "full") {
        this.updateAllPoints(this._box, this.camera.zoom);
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
      -100,
      100
    );

    if (this._type === 'top') {
      this.camera.position.z = 20
    } else if (this._type === 'side') {
      this.camera.position.x = 20
    } else if (this._type === 'front') {
      this.camera.position.y = -20
    }
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
    this.boxWrapper.worldToLocal(worldPoint)
    return worldPoint;
  }
  _initRaycaster() {
    this._raycaster = new THREE.Raycaster();
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
      this._render();
    });
    this._dom.addEventListener("mousemove", (e) => {
      this._onMouseMove(e);
    });
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

    if (this._intersect.name === "box") {
      const box = this.scene.getObjectByName("box");
      box.position.x = box.position.x + x;
      box.position.y = box.position.y + y;
      box.position.z = box.position.z + z;
      this.updateAllPoints(box)
      
      this._onDrag({ position: box.position }, this._type);
      this._render()
    } else if (this._intersect.name === "points") {
      this._scaleBox({ x, y, z }, this._intersect);
    }

    this.oldMousePosition = currentMousePosition;
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
    let intersects = this._raycaster.intersectObjects(this.scene.children, true);
    console.log(intersects)
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
          },
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
            y: -9,
            z: z + height / 2,
            locationType: "topRight",
          },
          {
            x: x - width / 2,
            y: -9,
            z: z + height / 2,
            locationType: "topLeft",
          },
          {
            x: x + width / 2,
            y: -9,
            z: z - height / 2,
            locationType: "bottomRight",
          },
          {
            x: x - width / 2,
            y: -9,
            z: z - height / 2,
            locationType: "bottomLeft",
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

    // var position = new THREE.Vector3();
    // object.getWorldPosition(position)

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

    boxWrapper.add(object);

    this.boxWrapper = boxWrapper;
    return boxWrapper;
  }
  _scaleBox(distance, point) {
    let newWidth, newLong, newHeight;
    const box = this.scene.getObjectByName("box");
    const {
      size: { width, height, long },
    } = this._computedBoxSize(box);
    const boxWrapper = this.scene.getObjectByName("boxWrapper");

    let x = distance.x;
    let y = distance.y;
    let z = distance.z;

    let positionX = boxWrapper.position.x + x / 2;
    let positionY = boxWrapper.position.y + y / 2;
    let positionZ = boxWrapper.position.z + z / 2;

    let position = {};

    let scale = {};

    let baseX, baseY, baseZ;

    switch (this._type) {
      case "top":
        switch (point.locationType) {
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

        baseX = width / box.scale.x;
        baseY = long / box.scale.y;

        box.scale.x = newWidth / baseX;

        box.scale.y = newLong / baseY;

        scale = {
          x: box.scale.x,
          y: box.scale.y,
        };
        boxWrapper.position.x = positionX;
        boxWrapper.position.y = positionY;
        position = {
          x: positionX,
          y: positionY,
        };
        break;
      case "side":
        switch (point.locationType) {
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

        baseZ = height / box.scale.z;
        baseY = long / box.scale.y;

        box.scale.y = newLong / baseY;

        box.scale.z = newHeight / baseZ;

        scale = {
          y: box.scale.y,
          z: box.scale.z,
        };
        boxWrapper.position.z = positionZ;
        boxWrapper.position.y = positionY;

        position = {
          z: positionZ,
          y: positionY,
        };
        break;
      case "front":
        switch (point.locationType) {
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

        baseZ = height / box.scale.z;
        baseX = width / box.scale.x;

        box.scale.x = newWidth / baseX;

        box.scale.z = newHeight / baseZ;

        scale = {
          x: box.scale.x,
          z: box.scale.z,
        };
        boxWrapper.position.z = positionZ;
        boxWrapper.position.x = positionX;
        position = {
          x: positionX,
          y: positionY,
        };
        break;
    }
    this.updateAllPoints(box);

    this._onDrag(
      {
        position,
        scale,
      },
      this._type
    );
  }
  bindDragControl(box, onDrag) {
    const boxWrapper = this._createBoxWrapper(box);

    const points = this._addPoints(box);

    boxWrapper.add(this.camera)


    this._onDrag = (...args) => {
      onDrag.apply(null, args);
      this._render();
    };
    this._box = box;
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
