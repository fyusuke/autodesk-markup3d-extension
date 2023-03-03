const svfURL = "https://lmv-models.s3.amazonaws.com/toy_plane/toy_plane.svf";
let viewer;

function initializeViewer() {
  window.devicePixelRatio = 1;
  const viewerDiv = document.getElementById("forgeViewer");
  viewer = new Autodesk.Viewing.Private.GuiViewer3D(viewerDiv, {});
  const options = {
    env: "Local",
    useConsolidation: true,
    useADP: false,
  };
  Autodesk.Viewing.Initializer(options, function () {
    viewer.start(svfURL, options, onSuccess);
  });

  // Init after the viewer is ready
  function onSuccess() {
    viewer.setBackgroundColor(0, 0, 0, 155, 155, 155);
    viewer.impl.toggleGroundShadow(true);
    viewer.loadExtension("markup3d");
    initializeMarkup();
  }
}

function initializeMarkup() {
  // create 20 random markup points
  const dummyData = [];
  for (let i = 0; i < 20; i++) {
    dummyData.push({
      icon: 0, // 0に固定
      x: Math.random() * 300 - 150,
      y: Math.random() * 50 - 20,
      z: Math.random() * 150 - 130,
    });
  }
  window.dispatchEvent(new CustomEvent("newData", { detail: dummyData }));
}
