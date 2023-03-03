// MarkupExt.js
function markup3d(viewer, options) {
  Autodesk.Viewing.Extension.call(this, viewer, options);
  this.raycaster = new THREE.Raycaster();
  this.raycaster.params.PointCloud.threshold = 5; // hit-test markup size.  Change this if markup 'hover' doesn't work
  this.size = 150.0; // markup size.  Change this if markup size is too big or small

  this.scene = viewer.impl.scene; // change this to viewer.impl.sceneAfter with transparency, if you want the markup always on top.
  this.markupItems = []; // array containing markup data
  this.pointCloud; // three js point-cloud mesh object
  this.camera = viewer.impl.camera;
  this.hovered; // index of selected pointCloud id, based on markupItems array
  this.selected; // index of selected pointCloud id, based on markupItems array
  this.offset; // global offset
  this.viwer = viewer;

  this.vertexShader = `
        uniform float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( size / (length(mvPosition.xyz) + 1.0) );
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

  this.fragmentShader = `
        uniform sampler2D tex;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( vColor.x, vColor.x, vColor.x, 1.0 );
            gl_FragColor = gl_FragColor * texture2D(tex, vec2((gl_PointCoord.x+vColor.y*1.0)/4.0, 1.0-gl_PointCoord.y));
            if (gl_FragColor.w < 0.5) discard;
        }
    `;
}

markup3d.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
markup3d.prototype.constructor = markup3d;

markup3d.prototype.updateHitTest = function (event) {
  // on mouse move event, check if ray hit with pointcloud, move selection cursor
  // https://stackoverflow.com/questions/28209645/raycasting-involving-individual-points-in-a-three-js-pointcloud
  if (!this.pointCloud) return;

  const canvas = event.target;
  const _x = ((event.offsetX * canvas.width) / canvas.clientWidth) | 0;
  const _y = ((event.offsetY * canvas.height) / canvas.clientHeight) | 0;
  const x = 2 * (_x / canvas.clientWidth) - 1; // scales from -1 to 1
  const y = -2 * (_y / canvas.clientHeight) + 1; // scales from -1 to 1, with direction reversed

  const vector = new THREE.Vector3(x, y, 0.5).unproject(this.camera);
  this.raycaster.set(this.camera.position, vector.sub(this.camera.position).normalize());
  const nodes = this.raycaster.intersectObject(this.pointCloud);
  if (nodes.length > 0) {
    if (this.hovered || this.hovered === 0) this.geometry.colors[this.hovered].r = 1.0;
    this.hovered = nodes[0].index;
    this.geometry.colors[this.hovered].r = 2.0;
    this.geometry.colorsNeedUpdate = true;
    this.viewer.impl.invalidate(true);
  }
};

markup3d.prototype.unload = function () {
  return true;
};

markup3d.prototype.load = function () {
  this.material = null;
  this.offset = this.viewer.model.getData().globalOffset; // use global offset to align pointCloud with lmv scene

  // setup listeners for new data and mouse events
  window.addEventListener("newData", (e) => this.setMarkupData(e.detail), false);
  document.addEventListener("mousedown", (e) => this.onClick(e), true);
  document.addEventListener("touchstart", (e) => this.onClick(e.changedTouches[0]), false);
  document.addEventListener("mousemove", (e) => this.onMouseMove(e), false);
  document.addEventListener("touchmove", (e) => this.onMouseMove(e.changedTouches[0]), false);
  document.addEventListener("mousewheel", (e) => this.onMouseMove(e), true);

  // Load markup points into Point Cloud
  this.setMarkupData = function (data) {
    this.markupItems = data;
    this.geometry = new THREE.Geometry();
    data.map((item) => {
      point = new THREE.Vector3(item.x, item.y, item.z);
      this.geometry.vertices.push(point);
      this.geometry.colors.push(new THREE.Color(1.0, item.icon, 0)); // icon = 0..3 position in the horizontal icons.png sprite sheet
    });
    this.initMesh_PointCloud();
  };

  this.initMesh_PointCloud = function () {
    if (this.pointCloud) this.scene.remove(this.pointCloud); //replace existing pointCloud Mesh
    else {
      // create new point cloud material
      const texture = THREE.ImageUtils.loadTexture("img/test.png");
      this.material = new THREE.ShaderMaterial({
        vertexColors: THREE.VertexColors,
        fragmentShader: this.fragmentShader,
        vertexShader: this.vertexShader,
        depthWrite: true,
        depthTest: true,
        opacity: 0.1,
        uniforms: {
          size: { type: "f", value: this.size },
          tex: { type: "t", value: texture },
        },
      });
    }
    this.pointCloud = new THREE.PointCloud(this.geometry, this.material);
    this.pointCloud.position.sub(this.offset);
    if (!this.viewer.overlays.hasScene("custom-scene")) {
      this.viewer.overlays.addScene("custom-scene");
    }
    this.viewer.overlays.addMesh(this.pointCloud, "custom-scene");
  };

  // when mouse is moved
  this.onMouseMove = function (event) {
    this.updateHitTest(event);
  };

  // when a point is clicked
  this.onClick = function () {
    this.updateHitTest(event);
    if (!this.hovered && this.hovered !== 0) return;
    this.selected = this.hovered;
    this.viewer.impl.invalidate(true);
    this.viewer.clearSelection();
  };

  return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension("markup3d", markup3d);
