import * as THREE from "https://cdn.skypack.dev/three@0.134.0";
import {
  OrbitControls
} from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/OrbitControls.js";
import {
  TransformControls
} from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/TransformControls.js";
import {
  DragControls
} from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/DragControls.js";

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

  constructor(dom, render, type, scene) {
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
    mousePoint.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(mousePoint, this.camera);
    //获取平面
    var screenPlane = this._setPlane();
    //求交
    this._raycaster.ray.intersectPlane(screenPlane, worldPoint);
    return worldPoint;
  }
  _initControls(render) {
    this._render = render;
    this.controls = new OrbitControls(this.camera, this._dom);
    this.controls.addEventListener("change", (data) => {
      // this._updatePoints(this._computedPointLocation(this.scene.children.filter(item => item.name === 'box')[0]), this.camera.zoom);
      this._setRotation();
      render();
    });
  }
  _initRaycaster() {
    this._raycaster = new THREE.Raycaster();
    this._raycaster.near = -Infinity;
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
    });
    this._dom.addEventListener("mousemove", (e) => {
      this._onMouseMove(e);
    });
  }
  _onMouseMove(event) {
    if (!this._isMove || event.which !== 1) return;
    const location = this.getLocation();
    // const currentX = ((event.clientX - location.x) / location.width) * 2 - 1;
    // const currentY = -((event.clientY - location.y) / location.height) * 2 + 1;
    // const currentInCameraLocation = new THREE.Vector3(currentX, currentY, 0).unproject(this.camera)
    // const oldInCameraLocation = new THREE.Vector3(this._mouse.x, this._mouse.y, 0).unproject(this.camera)
    const currentMousePosition = this._screenTOWorld(
      event.clientX,
      event.clientY
    );

    const x = currentMousePosition.x - this.oldMousePosition.x;
    const y = currentMousePosition.y - this.oldMousePosition.y;
    const z = currentMousePosition.z - this.oldMousePosition.z;

    this._intersects.forEach(({
      object
    }) => {
      object.position.x = object.position.x + x;
      object.position.y = object.position.y + y;
      object.position.z = object.position.z + z;
      // switch (this._type) {
      //   case "top":
      //     object.position.x = object.position.x + x
      //     object.position.y = object.position.y + y
      //     break;
      //   case "side":
      //     object.position.x = object.position.x + x
      //     object.position.x = object.position.x + x
      //     object.position.x = object.position.x + x
      //     break;
      //   case "front":
      //     object.position.y = object.position.y + y
      //     object.position.x = object.position.x + x
      //     object.position.x = object.position.x + x
      //     break;
      // }

      // this._mouse.x = currentX
      // this._mouse.y = currentY
      this.oldMousePosition = currentMousePosition;
      this._setRotation();
      this._render();
    });
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
    let intersects = this._raycaster.intersectObjects(this.scene.children);

    intersects = intersects.filter((item) => item.object.name === "box");

    console.log(intersects);
    if (!intersects.length) return;

    this._isMove = true;

    // this._moveLocation.x = event.clientX;
    // this._moveLocation.y = event.clientY;
    this._intersects = intersects;

    //将所有的相交的模型的颜色设置为红色，如果只需要将第一个触发事件，那就数组的第一个模型改变颜色即可
    // for ( var i = 0; i < intersects.length; i++ ) {
    //   console.log(intersects[ i ].object)
    //   intersects[ i ].object.position.x = intersects[ i ].object.position.x + 1
    //   intersects[ i ].object.position.y = intersects[ i ].object.position.y + 1
    //   this._render()
    // }
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
      if (item.name !== 'points') return;
      if (typeof zoom !== 'undefined') item.scale.set(10 / zoom, 10 / zoom, 10 / zoom);
      const index = pointsArr.findIndex(i => i.locationType === item.locationType)
      if (index === -1) return;
      const position = pointsArr[index];
      item.position.set(position.x, position.y, position.z);
    });
  }
  add(el) {
    this.scene.add(el);
  }
  _addPoint({
    x,
    y,
    z,
    locationType
  }) {
    const geometry = new THREE.SphereGeometry(0.7);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(x, y, z);
    sphere.name = "points";
    sphere.locationType = locationType;
    this.add(sphere);
    return sphere;
  }
  _addPoints(object) {
    if (this._type === "full") return []
    return this._computedPointLocation(this._computedBoxSize(object)).map(item => this._addPoint(item))
  }

  updateAllPoints(object) {
    this._updatePoints(this._computedPointLocation(this._computedBoxSize(object)))
  }

  _computedPointLocation({
    size,
    position
  }) {
    const {
      width,
      height,
      long
    } = size;

    const {
      x,
      y,
      z
    } = position

    switch (this._type) {
      case "top":
        return [{
            x: x + (width / 2),
            y: y + (long / 2),
            z: 10,
            locationType: 'topRight'
          },
          {
            x: x - (width / 2),
            y: y + (long / 2),
            z: 10,
            locationType: 'topLeft'
          },
          {
            x: x + (width / 2),
            y: y - (long / 2),
            z: 10,
            locationType: 'bottomRight'
          },
          {
            x: x - (width / 2),
            y: y - (long / 2),
            z: 10,
            locationType: 'bottomLeft'
          }
        ]
        break;
      case "side":
        return [{
            x: 10,
            y: y + (long / 2),
            z: z + (height / 2),
            locationType: 'topRight'
          },
          {
            x: 10,
            y: y - (long / 2),
            z: z + (height / 2),
            locationType: 'topLeft'
          },
          {
            x: 10,
            y: y + (long / 2),
            z: z - (height / 2),
            locationType: 'bottomRight'
          },
          {
            x: 10,
            y: y - (long / 2),
            z: z - (height / 2),
            locationType: 'bottomLeft'
          }
        ]
        break;
      case 'front':
        return [{
            x: x + (width / 2),
            y: -100,
            z: z + (height / 2),
            locationType: 'topRight'
          },
          {
            x: x - (width / 2),
            y: -100,
            z: z + (height / 2),
            locationType: 'topLeft'
          },
          {
            x: x + (width / 2),
            y: -100,
            z: z - (height / 2),
            locationType: 'bottomRight'
          },
          {
            x: x - (width / 2),
            y: -100,
            z: z - (height / 2),
            locationType: 'bottomLeft'
          }
        ]
        break
    }
    return []
  }

  _computedBoxSize(object) {
    const box = new THREE.Box3().setFromObject(object);
    const boxSize = box.max.sub(box.min);
    const width = Math.abs(boxSize.x)
    const height = Math.abs(boxSize.z)
    const long = Math.abs(boxSize.y)

    var position = new THREE.Vector3();
    object.getWorldPosition(position);

    return {
      size: {
        width,
        height,
        long,
      },
      position
    }
  }

  bindDragControl(object, onDrag) {
    const points = this._addPoints(object);

    const dragControls = new DragControls(
      [object, ...points],
      this.camera,
      this._dom
    );

    let oldPointsPosition = null;

    dragControls.addEventListener("hoveron", (event) => {});

    dragControls.addEventListener('dragstart', (event) => {
      oldPointsPosition = event.object.position.clone()
    });
    dragControls.addEventListener("drag", (event) => {
      if (event.object.name === "box") {
        this._updatePoints(this._computedPointLocation(this._computedBoxSize(event.object)))
        onDrag({ position: event.object.position }, this._type);
        this._render();
      } else {
        const distance = oldPointsPosition.sub(event.object.position)

        let newWidth, newLong, newHeight;
        const {
          size: {
            width,
            height,
            long
          }
        } = this._computedBoxSize(object);
        let x = -distance.x
        let y = -distance.y
        let z = -distance.z

        let positionX = object.position.x + (x / 2)
        let positionY = object.position.y + (y / 2)
        let positionZ = object.position.z + (z / 2)

        let position = {}

        let scale = {}

        let baseX, baseY, baseZ;

        switch (this._type) {
          case "top":
            switch (event.object.locationType) {
              case "bottomRight":
                y = -y
                break;
              case "topLeft":
                x = -x
                break;
              case "bottomLeft":
                y = -y
                x = -x
                break;
            }

            newWidth = width + x
            newLong = long + y

            baseX = width / object.scale.y
            baseY = long / object.scale.x

            object.scale.x = newLong / baseY

            object.scale.y = newWidth / baseX
            scale = {
              x: object.scale.x,
              y: object.scale.y
            }
            object.position.x = positionX
            object.position.y = positionY
            position = {
              x: positionX,
              y: positionY
            }
            break;
          case "side":
            switch (event.object.locationType) {
              case "bottomRight":
                z = -z
                break;
              case "topLeft":
                y = -y
                break;
              case "bottomLeft":
                y = -y
                z = -z
                break;
            }

            newHeight = height + z
            newLong = long + y

            baseZ = height / object.scale.z
            baseY = long / object.scale.x

            object.scale.x = newLong / baseY

            object.scale.z = newHeight / baseZ

            scale = {
              x: object.scale.x,
              z: object.scale.z
            }
            object.position.z = positionZ
            object.position.y = positionY

            position = {
              z: positionZ,
              y: positionY
            }
            break
            case 'front':
              switch (event.object.locationType) {
                case "bottomRight":
                  z = -z
                  break;
                case "topLeft":
                  x = -x
                  break;
                case "bottomLeft":
                  x = -x
                  z = -z
                  break;
              }
  
              newHeight = height + z
              newWidth = width + x
  
              baseZ = height / object.scale.z
              baseX = width / object.scale.y
  
              object.scale.y = newWidth / baseX
  
              object.scale.z = newHeight / baseZ
  
              scale = {
                y: object.scale.y,
                z: object.scale.z
              }
              object.position.z = positionZ
              object.position.x = positionX
              position = {
                x: positionX,
                y: positionY
              }
              break;
        }
        this._updatePoints(this._computedPointLocation({
          size: {
            width: newWidth,
            long: newLong,
            height: newHeight
          },
          position: object.position.clone()
        }).filter(item => item.locationType !== event.object.locationType))

        onDrag({ position, scale }, this._type);
        oldPointsPosition = event.object.position.clone()
      }
    });
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