"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { stlToMesh } from "@/lib/cad/parse-cad";

interface Props {
  src?: string; // STL url (library models)
  mesh?: Float32Array; // pre-parsed mesh (uploads)
  length?: number;
  width?: number;
  height?: number;
}

/**
 * Interactive 3D preview. Loads an STL from `src`, or renders a pre-parsed
 * `mesh`, or a bounding block from dimensions. Transparent background so it
 * blends with the card in light & dark theme. Manual drag-rotate + idle spin.
 */
export default function PartViewer({ src, mesh, length = 1, width = 1, height = 1 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      container.innerHTML =
        '<div style="display:grid;place-items:center;height:100%;font:12px monospace;color:#98a1ac">3D preview unavailable (WebGL)</div>';
      return;
    }

    const size = () => [container.clientWidth || 400, container.clientHeight || 240] as const;
    const [w0, h0] = size();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w0, h0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.1, 5_000_000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1, 1.5, 1);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-1, 0.5, -1);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);
    const material = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.45, roughness: 0.5 });
    const disposables: { dispose: () => void }[] = [material];

    function addGeometry(geometry: THREE.BufferGeometry, withEdges: boolean) {
      if (cancelled) {
        geometry.dispose();
        return;
      }
      geometry.center();
      geometry.computeVertexNormals();
      group.add(new THREE.Mesh(geometry, material));
      disposables.push(geometry);
      if (withEdges) {
        const eg = new THREE.EdgesGeometry(geometry, 30);
        group.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.4 })));
        disposables.push(eg);
      }
      geometry.computeBoundingSphere();
      const r = geometry.boundingSphere?.radius ?? 50;
      const dist = (r / Math.sin((camera.fov * Math.PI) / 360)) * 1.25;
      camera.position.set(0, 0, dist);
      camera.near = Math.max(0.01, r / 100);
      camera.far = r * 100;
      camera.updateProjectionMatrix();
    }

    function meshToGeometry(flat: Float32Array) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(flat, 3));
      return g;
    }

    if (src) {
      fetch(src)
        .then((r) => r.arrayBuffer())
        .then((buf) => addGeometry(meshToGeometry(stlToMesh(buf)), false))
        .catch(() => {});
    } else if (mesh && mesh.length >= 9) {
      addGeometry(meshToGeometry(mesh), false);
    } else {
      addGeometry(new THREE.BoxGeometry(length || 1, height || 1, width || 1), true);
    }

    // manual rotation + idle spin
    let rotY = 0.6;
    let rotX = -0.35;
    let down = false;
    let px = 0;
    let py = 0;
    const onDown = (e: PointerEvent) => { down = true; px = e.clientX; py = e.clientY; renderer.domElement.style.cursor = "grabbing"; };
    const onUp = () => { down = false; renderer.domElement.style.cursor = "grab"; };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      rotY += (e.clientX - px) * 0.01;
      rotX = Math.max(-1.4, Math.min(1.4, rotX + (e.clientY - py) * 0.01));
      px = e.clientX;
      py = e.clientY;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!down) rotY += 0.005;
      group.rotation.y = rotY;
      group.rotation.x = rotX;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const [w, h] = size();
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    requestAnimationFrame(onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [src, mesh, length, width, height]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}
