let w, h, canvas, scene, camera, renderer, object, controls;
let deviceOrienModal = null;
let deviceOrienModalButton = null;
let video = null;
let videoInput = null;
let videoStream = null;

// --- カメラ映像初期化 ---
const initVideo = () => {
  video = document.getElementById("camera");
  video.addEventListener("loadedmetadata", adjustVideo);

  navigator.mediaDevices
    .enumerateDevices()
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
    .then(stream => {
      video.srcObject = stream;
      video.play();
      videoStream = stream;
    })
    .catch(e => {
      console.log(e);
      alert("カメラ使用拒否");
    });
};

// --- Video のアスペクト比調整 ---
const adjustVideo = () => {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  let va = vw / vh;
  let wa = ww / wh;

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

// --- iOS デバイスの向き許可 ---
const isIos = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
};

const checkDeviceOrien = () => new Promise((resolve,reject)=>{
  if(!isIos()) resolve();

  const deviceOrienEvent = () => {
    hideDeviceOrienModal();
    window.removeEventListener("deviceorientation", deviceOrienEvent);
    resolve();
  };
  window.addEventListener("deviceorientation", deviceOrienEvent);

  deviceOrienModal = document.getElementById("device-orien-modal");
  deviceOrienModalButton = document.getElementById("device-orien-modal-button");
  deviceOrienModal.classList.remove("is-hidden");

  deviceOrienModalButton.addEventListener("click", ()=>{
    if(DeviceMotionEvent?.requestPermission) DeviceMotionEvent.requestPermission();
    if(DeviceOrientationEvent?.requestPermission){
      DeviceOrientationEvent.requestPermission().then(res=>{
        if(res==="granted"){ hideDeviceOrienModal(); resolve(); }
        else{ alert("許可が必要です"); reject(); }
      });
    } else { alert("許可が必要です"); reject(); }
  });
});

const hideDeviceOrienModal = () => deviceOrienModal.classList.add("is-hidden");

// --- Three.js 初期化 ---
const initThree = () => {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas = document.getElementById("canvas");
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  camera.position.set(0,0,0);

  // --- ライト ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  // --- GLTFLoader で demo.glb を読み込む ---
  const loader = new THREE.GLTFLoader();
  loader.load(
    './demo.glb', 
    gltf => {
      object = gltf.scene;
      object.position.set(0,0,-5); // カメラ前方に固定
      object.scale.set(1,1,1);
      scene.add(object);
    },
    xhr => console.log(`モデル読み込み中: ${(xhr.loaded/xhr.total*100).toFixed(1)}%`),
    error => console.error('モデル読み込み失敗:', error)
  );

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, canvas:canvas });
  renderer.setSize(w,h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000,0);

  // --- DeviceOrientationControls ---
  controls = new THREE.DeviceOrientationControls(camera, true);

  // --- アニメーションループ ---
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene,camera);
  };
  animate();
};

// --- ページロード時 ---
window.onload = () => {
  checkDeviceOrien()
    .then(()=>{
      initThree();
      initVideo();
    })
    .catch(console.log);
};
