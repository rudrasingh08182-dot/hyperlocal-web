import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  PARTICLE_COUNT,
  RING_COLORS,
  FOOD_EMOJIS,
  getDeviceTier,
  getDevicePixelRatio,
} from './constants';

function createEmojiTexture(emoji, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${size * 0.75}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function useThreeScene(mountRef, logoUrl, onLogoReady) {
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const frameIdRef = useRef(null);
  const logoMeshRef = useRef(null);
  const foodItemsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  const cleanup = useCallback(() => {
    try {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss?.();
        rendererRef.current = null;
      }
      if (mountRef.current) {
        const canvas = mountRef.current.querySelector('canvas');
        if (canvas) mountRef.current.removeChild(canvas);
      }
      sceneRef.current = null;
      logoMeshRef.current = null;
      foodItemsRef.current = [];
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, [mountRef]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const tier = getDeviceTier();
    const maxFoodItems = tier === 'high' ? 50 : tier === 'medium' ? 35 : 20;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: tier !== 'low' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(getDevicePixelRatio());
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xa78bfa, 1.8, 25);
    keyLight.position.set(4, 4, 6);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x7c3aed, 1.2, 20);
    fillLight.position.set(-4, -2, 4);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xd8b4fe, 0.8, 15);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    // ── FLOATING FOOD ITEMS ──
    const foodGroup = new THREE.Group();
    const foodItems = [];
    const shuffledFood = [...FOOD_EMOJIS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < maxFoodItems; i++) {
      const emoji = shuffledFood[i % shuffledFood.length];
      const texture = createEmojiTexture(emoji, 64);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      });
      const sprite = new THREE.Sprite(material);

      const radius = 3 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      sprite.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) - 2
      );

      const baseScale = 0.3 + Math.random() * 0.4;
      sprite.scale.set(baseScale, baseScale, 1);

      sprite.userData = {
        basePos: sprite.position.clone(),
        floatSpeed: 0.3 + Math.random() * 0.7,
        floatOffset: Math.random() * Math.PI * 2,
        rotateSpeed: (Math.random() - 0.5) * 0.5,
        baseScale: baseScale,
        pulsePhase: Math.random() * Math.PI * 2,
      };

      foodItems.push(sprite);
      foodGroup.add(sprite);
    }
    scene.add(foodGroup);
    foodItemsRef.current = foodItems;

    // ── GLOWING RINGS ──
    const ringGroup = new THREE.Group();
    RING_COLORS.forEach((color, i) => {
      const ringGeo = new THREE.TorusGeometry(2.0 + i * 0.5, 0.02, 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25 - i * 0.04,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.2 + i * 0.3;
      ring.rotation.y = i * 0.4;
      ring.userData = { baseOpacity: 0.25 - i * 0.04, speed: 0.1 + i * 0.06 };
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    // ── SPARKLE PARTICLES ──
    const sparkleCount = tier === 'high' ? 80 : 40;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
      const r = 1.5 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      sparklePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      sparklePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      sparklePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: 0xe9d5ff,
      size: 0.06,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    // ── LOGO ──
    const textureLoader = new THREE.TextureLoader();
    let logoMesh = null;
    let popStart = null;

    const createFallbackLogo = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 220);
      grad.addColorStop(0, '#a855f7');
      grad.addColorStop(0.7, '#7c3aed');
      grad.addColorStop(1, '#5b21b6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(256, 256, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 260px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Z', 256, 246);

      const texture = new THREE.CanvasTexture(canvas);
      const logoMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const logoGeo = new THREE.PlaneGeometry(2.4, 2.4);
      logoMesh = new THREE.Mesh(logoGeo, logoMat);
      logoMesh.scale.set(0.01, 0.01, 0.01);
      scene.add(logoMesh);
      logoMeshRef.current = logoMesh;
      onLogoReady?.();
    };

    textureLoader.load(
      logoUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 128;
        glowCanvas.height = 128;
        const gCtx = glowCanvas.getContext('2d');
        const gGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gGrad.addColorStop(0, 'rgba(168,85,247,0.6)');
        gGrad.addColorStop(0.5, 'rgba(139,92,246,0.2)');
        gGrad.addColorStop(1, 'rgba(0,0,0,0)');
        gCtx.fillStyle = gGrad;
        gCtx.fillRect(0, 0, 128, 128);

        const glowTex = new THREE.CanvasTexture(glowCanvas);
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
        });
        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.set(5, 5, 1);
        glowSprite.position.z = -0.2;

        const logoMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const logoGeo = new THREE.PlaneGeometry(2.2, 2.2);
        logoMesh = new THREE.Mesh(logoGeo, logoMat);
        logoMesh.add(glowSprite);
        logoMesh.scale.set(0.01, 0.01, 0.01);
        scene.add(logoMesh);
        logoMeshRef.current = logoMesh;
        onLogoReady?.();
      },
      undefined,
      () => {
        console.warn('Logo failed, using fallback');
        createFallbackLogo();
      }
    );

    // ── MOUSE / TOUCH ──
    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / width - 0.5) * 2;
      mouseRef.current.y = (e.clientY / height - 0.5) * 2;
    };
    const handleTouchMove = (e) => {
      if (e.touches[0]) {
        mouseRef.current.x = (e.touches[0].clientX / width - 0.5) * 2;
        mouseRef.current.y = (e.touches[0].clientY / height - 0.5) * 2;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // ── ANIMATION ──
    const clock = new THREE.Clock();
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      foodItems.forEach((item) => {
        const d = item.userData;
        item.position.y = d.basePos.y + Math.sin(t * d.floatSpeed + d.floatOffset) * 0.4;
        item.position.x += Math.sin(t * 0.2 + d.floatOffset) * 0.002;
        item.position.z += Math.cos(t * 0.15 + d.floatOffset) * 0.001;
        item.material.rotation = t * d.rotateSpeed;
        const pulse = 1 + Math.sin(t * 2 + d.pulsePhase) * 0.08;
        item.scale.set(d.baseScale * pulse, d.baseScale * pulse, 1);
        const dist = item.position.distanceTo(new THREE.Vector3(0, 0, 0));
        item.material.opacity = Math.max(0.3, 1 - dist * 0.08);
      });
      foodGroup.rotation.y = t * 0.03;

      ringGroup.children.forEach((ring) => {
        ring.rotation.z += ring.userData.speed * 0.01;
        ring.rotation.x = Math.PI / 2.2 + Math.sin(t * 0.5) * 0.1;
        const pulse = Math.sin(t * 1.2 + ring.userData.speed * 5) * 0.1;
        ring.material.opacity = Math.max(0.05, ring.userData.baseOpacity + pulse);
      });
      ringGroup.rotation.y = t * 0.05;

      const sparklePos = sparkles.geometry.attributes.position.array;
      for (let i = 0; i < sparkleCount; i++) {
        sparklePos[i * 3 + 1] += Math.sin(t * 2 + i) * 0.002;
      }
      sparkles.geometry.attributes.position.needsUpdate = true;
      sparkles.rotation.y = t * 0.02;
      sparkles.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;

      if (logoMesh) {
        if (popStart === null) popStart = t;
        const popT = Math.min((t - popStart) / 0.8, 1);
        const eased = 1 - Math.pow(1 - popT, 4);
        const scale = 0.01 + eased * 0.99;
        logoMesh.scale.set(scale, scale, scale);
        logoMesh.rotation.y = Math.sin(t * 0.6) * 0.08;
        logoMesh.position.y = Math.sin(t * 1.0) * 0.05;
      }

      const targetX = mouseRef.current.x * 0.4;
      const targetY = mouseRef.current.y * 0.3;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      cleanup();
    };
  }, [mountRef, logoUrl, cleanup, onLogoReady]);

  return { cleanup };
}