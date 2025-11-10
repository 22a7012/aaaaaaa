<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
  <title>Marker-less WebAR with GLTF</title>
  <style>
    body { margin:0; overflow:hidden; font-family:sans-serif; }
    .canvas { position: fixed; top:0; left:0; z-index:1; }
    .camera { position: fixed; top:0; left:0; }
    .device-orien-modal { z-index:1; display:flex; flex-direction:column; width:100%; height:100%; position:fixed; top:0; left:0; background: rgba(0,0,0,0.7); }
    .device-orien-modal-inner { width:90%; max-width:350px; box-sizing:border-box; padding:1.3rem; margin:auto; background:white; display:flex; flex-direction:column; }
    .device-orien-modal-button { margin:1rem auto auto; padding:0.8rem 1.3rem; background:black; color:white; width:130px; }
    .is-hidden { display:none; }
  </style>
</head>
<body>
  <div id="device-orien-modal" class="device-orien-modal is-hidden">
    <div class="device-orien-modal-inner">
      <p>端末の向きと方向を取得します。<br>ポップアップで「許可」を選択してください。</p>
      <button id="device-orien-modal-button" class="device-orien-modal-button">OK</button>
    </div>
  </div>

  <canvas id="canvas" class="canvas"></canvas>
  <video id="camera" class="camera" playsinline></video>

  <!-- Three.js 本体 -->
  <script src="./three.min.js"></script>
  <!-- DeviceOrientationControls -->
  <script src="./DeviceOrientationControls.js"></script>
  <!-- GLTFLoader (ローカル読み込み用) -->
  <script src="https://cdn.jsdelivr.net/npm/three@0.161.0/examples/js/loaders/GLTFLoader.js"></script>
  <script>
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
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(0,5,5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      // --- GLTFLoader で demo.gltf を読み込む ---
      const loader = new THREE.GLTFLoader();
      loader.load(
        './demo.gltf',
        (gltf) => {
          object = gltf.scene;
          object.position.set(0,0,-5);
          scene.add(object);
        },
        undefined,
        (error) => { console.error('GLTF読み込みエラー:', error); }
      );

      // --- WebGLRenderer ---
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
  </script>
</body>
</html>
