let w, h, canvas, scene, camera, renderer, object, controls;
let deviceOrienModal, deviceOrienModalButton;
let video, videoInput, videoStream;

// --- カメラ映像初期化 ---
const initVideo = () => {
  video = document.getElementById("camera");
  video.addEventListener("loadedmetadata", adjustVideo);

  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      videoInput = devices.filter(d => d.kind === "videoinput");
      getVideo();
    })
    .catch(console.log);
};

const setVideo = () => ({
  audio: false,
  video: {
    deviceId: videoInput,
    facingMode: "environment",
    width: { min:1280, max:1920 },
    height: { min:720, max:1080 }
  }
});

const getVideo = () => {
  if(videoStream) videoStream.getTracks().forEach(t => t.stop());
  navigator.mediaDevices.getUserMedia(setVideo())
    .then(stream => { video.srcObject = stream; video.play(); videoStream = stream; })
    .catch(e => { console.log(e); alert("カメラ使用拒否"); });
};

const adjustVideo = () => {
  const ww = window.innerWidth, wh = window.innerHeight;
  const vw = video.videoWidth, vh = video.videoHeight;
  const va = vw / vh, wa = ww / wh;

  if(wa < va){
    let nw = va * wh;
    video.style.width = nw + "px";
    video.style.marginLeft = -(nw - ww)/2 + "px";
    video.style.height = wh + "px";
    video.style.marginTop = "0px";
  } else {
    let nh = 1 / (va / ww);
    video.style.height = nh + "px";
    video.style.marginTop = -(nh - wh)/2 + "px";
    video.style.width = ww + "px";
    video.style.marginLeft = "0px";
  }
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const checkDeviceOrien = () => new Promise((resolve,reject)=>{
  if(!isIos()) return resolve();
  deviceOrienModal = document.getElementById("device-orien-modal");
  deviceOrienModalButton = document.getElementById("device-orien-modal-button");
  deviceOrienModal.classList.remove("is-hidden");

  const deviceOrienEvent = () => { hideDeviceOrienModal(); window.removeEventListener("deviceorientation", deviceOrienEvent); resolve(); };
  window.addEventListener("deviceorientation", deviceOrienEvent);

  deviceOrienModalButton.addEventListener("click", ()=>{
    if(DeviceMotionEvent?.requestPermission) DeviceMotionEvent.requestPermission();
    if(DeviceOrientationEvent?.requestPermission){
      DeviceOrientationEvent.requestPermission().then(res=>{
        if(res==="granted"){ hideDeviceOrienModal(); resolve(); } 
        else { alert("許可が必要です"); reject(); }
      });
    } else { alert("許可が必要です"); reject(); }
  });
});

const hideDeviceOrienModal = () => deviceOrienModal.classList.add("is-hidden");

// --- Three.js 初期化 ---
const initThree = () => {
  w = window.innerWidth; h = window.innerHeight;
  canvas = document.getElementById("canvas");
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  camera.position.set(0,0,0);

  // ライト
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0,5,5); scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff,0.5));

  // --- GLTFLoader ---
  const loader = new THREE.GLTFLoader();
  loader.load(
    './demo.gltf',
    (gltf)=>{
      object = gltf.scene;
      object.position.set(0,0,-5);
      scene.add(object);
    },
    undefined,
    (error)=>{ console.error("GLTF読み込みエラー:",error); }
  );

  // WebGLRenderer
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, canvas:canvas});
  renderer.setSize(w,h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000,0);

  // DeviceOrientationControls
  controls = new THREE.DeviceOrientationControls(camera,true);

  // アニメーションループ
  const animate = ()=>{
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene,camera);
  };
  animate();
};

// --- ページロード時 ---
window.onload = ()=>{
  checkDeviceOrien()
    .then(()=>{ initThree(); initVideo(); })
    .catch(console.log);
};
