import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Lenis from "@studio-freight/lenis";

// GSAP and ScrollTrigger are now available globally
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

const w = window.innerWidth;
const h = window.innerHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.setClearColor(0x000000, 0);
renderer.setSize(w, h);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.5;
document.querySelector(".model").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.enableZoom = false;
// controls.maxPolarAngle = Math.PI / 2;

const ambientLight = new THREE.AmbientLight(0xfffffff, 0.2);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 7.5);
mainLight.position.set(0.5, 7.5, 2.5);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 2.0);
fillLight.position.set(-15, 0, -5);
scene.add(fillLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.7);
hemiLight.position.set(0, 0, 0);
scene.add(hemiLight);

function basicAnimate() {
  renderer.render(scene, camera);
  requestAnimationFrame(basicAnimate);
}

basicAnimate();

let model;
const loader = new GLTFLoader();
loader.load("./assets/DeployCell_Laptop.glb", function (gltf) {
  model = gltf.scene;
  model.traverse((node) => {
    if (node.isMesh) {
      if (node.material) {
        node.material.metalness = 1;
        // node.material.roughness = 5;
        node.material.envMapIntensity = 5;
      }
      node.castShadow = true;
      node.receiveshadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  model.position.sub(center);
  camera.position.z = maxDim * 1;

  controls.target.copy(center);
  controls.update();

  scene.add(model);

  model.position.x = -0.1;

  model.scale.set(1, 1, 1);
  model.rotation.set(0.4, 1, -0.2);
  playIntialAnimation();

  cancelAnimationFrame(basicAnimate);
  animate();
});

const floatAmplitude = -0.1;
const floatSpeed = 1.5;
const rotationSpeed = 0.3;
let isFloating = true;
let currentScroll = 0;

const totalScrollHeight = document.documentElement.scrollHeight;

function playIntialAnimation() {
  if (model) {
    gsap.to(model.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1,
      ease: "power2.out",
    });
  }
}

lenis.on("scroll", (e) => {
  currentScroll = e.scroll;
});
function animate() {
  if (model) {
    if (isFloating) {
      const floatOffset =
        Math.sin(Date.now() * 0.001 * floatSpeed) * floatAmplitude;
      model.position.y = floatOffset;
    }

    const scrollProgress = Math.min(currentScroll / totalScrollHeight, 2);

    const baseTilt = 0.5;
    model.rotation.y = scrollProgress * Math.PI * 5.5 * baseTilt;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const introSection = document.querySelector(".intro");
const archiveSection = document.querySelector(".archive");
const outroSection = document.querySelector(".outro");

document.addEventListener("DOMContentLoaded", () => {
  const SplitText = new SplitType(".outro-copy h2", {
    types: "lines",
    lineClass: "line",
  });

  SplitText.lines.forEach((line) => {
    const text = line.innerHTML;
    line.innerHTML = `<span style= "display: block; transform: translateY(70px);">${text}</span>`;
  });

  ScrollTrigger.create({
    trigger: ".outro",
    start: "top center",
    onEnter: () => {
      gsap.to(".outro-copy h2 .line span", {
        translateY: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power3.out",
        force3D: true,
      });
    },
    onLeaveBack: () => {
      console.log("Animation reversing on leave");
      gsap.to(".outro-copy h2 .line-span", {
        translateY: 70,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out",
        force3D: true,
      });
    },
    toggleAction: "play reverse play reverse",
  });
});

window.addEventListener("resize", () => {
  const w = window.innerWidth; // Update width
  const h = window.innerHeight; // Update height

  camera.aspect = w / h; // Update the camera aspect ratio
  camera.updateProjectionMatrix(); // Notify the camera of the change

  renderer.setSize(w, h); // Update the renderer size
});

// Replace with your backend URL
const BACKEND_UPLOAD_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  const repoUrlInput = document.getElementById("repo-url");
  const uploadButton = document.getElementById("upload-button");
  const statusMessage = document.getElementById("status-message");
  const loader = document.querySelector(".loader");
  const result = document.querySelector("#result");

  uploadButton.addEventListener("click", async () => {
    const repoUrl = repoUrlInput.value.trim();

    if (!repoUrl) {
      statusMessage.textContent = "Please enter a repository URL.";
      return;
    }

    loader.style.setProperty("--loader-content", '"Uploading..."');

    try {
      const response = await fetch(`${BACKEND_UPLOAD_URL}/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });

      const resData = await response.json();
      const uploadId = resData.id;

      loader.style.setProperty("--loader-content", '"Upload Successful..."');
      setTimeout(() => {
        loader.style.setProperty("--loader-content", '"Deploying..."');
      }, 3000);

      const interval = setInterval(async () => {
        const statusResponse = await fetch(
          `${BACKEND_UPLOAD_URL}/status?id=${uploadId}`
        );
        const statusData = await statusResponse.json();

        if (statusData.status === "deployed") {
          clearInterval(interval);

          function copyText(){
            navigator.clipboard.writeText(`http://${uploadId}.localhost:3001/index.html`);
            result.innerHTML = `
              <p>Copied</p> 
              <div>
                <ion-icon name="copy-outline" onclick="copyText()"></ion-icon>
                <a href="http://${uploadId}.localhost:3001/index.html" target="_blank" rel="noopener noreferrer">
                  <ion-icon name="arrow-redo-circle-outline"></ion-icon>
                </a>
              </div>`;
        }

          loader.style.setProperty(
            "--loader-content",
            '"Deployment Successful!"'
          );
          result.style.display = "flex";
          result.innerHTML = `
              <p>http://${uploadId}.localhost:3001/index.html</p> 
              <div>
                <ion-icon name="copy-outline" onclick="copyText()"></ion-icon>
                <a href="http://${uploadId}.localhost:3001/index.html" target="_blank" rel="noopener noreferrer">
                  <ion-icon name="arrow-redo-circle-outline"></ion-icon>
                </a>
              </div>`;
        }
      }, 3000);
    } catch (error) {
      console.error("Error:", error);
      statusMessage.textContent = "An error occurred. Please try again.";
    }
  });
});