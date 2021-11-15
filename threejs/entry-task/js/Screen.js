import * as THREE from "https://cdn.skypack.dev/three@0.134.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/OrbitControls.js";
export default class Screen {
  constructor(dom, render, type) {
    this.scene = new THREE.Scene();
    this._dom = dom;
    this._type = type;

    this._initCamera(type);
    const controls = new OrbitControls(this.camera, dom);
    controls.addEventListener("change", (data) => {
      this._setRotation();
      render();
    });
    if (type !== "full") {
      this.camera.zoom = 25;
      this.camera.updateProjectionMatrix();
    }
    this._setRotation();

    const arrowHelper = new THREE.AxesHelper(5);
    this.scene.add(arrowHelper);
  }
  _setRotation() {
    if (this._type === "side") {
      this.camera.rotation.set(Math.PI / 2, 0, 0);
    } else if (this._type === "front") {
      this.camera.rotation.set(Math.PI / 2, -Math.PI / 2, 0);
    }
    this.camera.updateProjectionMatrix();
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
      return;
    }

    this.camera = new THREE.OrthographicCamera(
      location.width / -2,
      location.width / 2,
      location.height / 2,
      location.height / -2,
      1,
      1000
    );
    this.camera.position.set(0, 0, 0)

    this.scene.add(this.camera);

    console.log(this.camera.position);
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
