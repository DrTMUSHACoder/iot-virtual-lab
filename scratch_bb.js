import * as THREE from 'three';
import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Since we're in node, we need to mock enough for GLTFLoader or just parse it.
// Actually, GLTFLoader requires a browser environment (DOM, fetch).
// Let's write a small script that we can run in the browser console.
console.log("Run this in browser console: ");
console.log(`
const scene = document.querySelector('canvas').__r3f.root.getState().scene;
const bb = scene.getObjectByName('Breadboard'); // Assuming it has a name, or we search
scene.traverse(node => {
  if (node.name === 'PowerRails') {
    const parent = node.parent;
    const box = new THREE.Box3().setFromObject(parent.children[0]);
    console.log("Bounding box of breadboard mesh:", box);
    const center = new THREE.Vector3();
    box.getCenter(center);
    console.log("Center:", center);
  }
});
`);
