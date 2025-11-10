let w, h, canvas, scene, camera, renderer, object, controls;
let deviceOrienModal = null;
let deviceOrienModalButton = null;
let video = null;
let videoInput = null;
let videoStream = null;

function initVideo() {
  video = document.getElementById("camera");
  video.addEventListener("loadedmetadata", adjustVideo);

  navigator.mediaDevices.enumerateDevices().then(devices => {
    videoInput = devices.filter(d => d.kind === "videoinput");
    getVideo();
  }).catch(console.log);
}

function setVideo() {
  return {
    audio: false,
    video: {
      deviceId: videoInput,
      facingMode: "environment",
      width: { min:1280, max:1920 },
      height: { min:720, max:1080 }
    }
  };
}

function getVideo() {
  if(videoStream) videoStream.getTracks().forEach(t => t.stop());
  navigator.mediaDevices.getUserMedia(setVideo())
    .then(stream => {
      video.srcObject = stream;
      video.play();
      videoStream = stream;
    })
    .catch(e => {
      console.log(e);
      alert("カメラ使用が拒否されました");
    });
}

function adjustVideo() {
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
}

function isIos(){
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
}

function checkDeviceOrien(){
  return new Promise((resolve,reject)=>{
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
}

function hideDeviceOrienModal(){
  deviceOrienModal.classList.add("is-hidden");
}

function initThree(){
  w = window.innerWidth;
  h = window.innerHeight;
  canvas = document.getElementById("canvas");
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 30);
  camera.position.set(0,0,5);
  camera.lookAt(0,0,0);
  scene.add(camera);

  const geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshNormalMaterial();
  object = new THREE.Mesh(geometry, material);
  scene.add(object);

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, canvas:canvas });
  renderer.setClearColor(0x000000,0);
  renderer.setSize(w,h);
  renderer.setPixelRatio(window.devicePixelRatio);

  controls = new THREE.DeviceOrientationControls(camera, true);

  // 古い Three.js 対応: requestAnimationFrame に置き換え
  function animate() {
    requestAnimationFrame(animate);
    render();
  }
  animate();
}

function render(){
  object.rotation.x += 0.01;
  object.rotation.y += 0.01;
  controls.update();
  renderer.render(scene,camera);
}

window.onload = () => {
  checkDeviceOrien().then(()=>{
    initThree();
    initVideo();
  }).catch(console.log);
};
