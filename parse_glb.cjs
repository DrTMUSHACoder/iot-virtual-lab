const fs = require('fs');

const buffer = fs.readFileSync('C:/Users/Abel/OneDrive/Desktop/virtual-iot-lab/virtual-iot-lab/public/models/raspberry_pi.glb');

// The GLB format has a 12-byte header, followed by chunks.
// Chunk 0 is JSON.
const magic = buffer.readUInt32LE(0);
if (magic !== 0x46546C67) {
    console.log("Not a GLB");
    process.exit(1);
}

const jsonChunkLength = buffer.readUInt32LE(12);
const jsonChunkType = buffer.readUInt32LE(16);

if (jsonChunkType !== 0x4E4F534A) {
    console.log("First chunk is not JSON");
    process.exit(1);
}

const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonString);

console.log("Meshes:");
gltf.meshes.forEach((mesh, index) => {
    console.log(`Mesh ${index}: ${mesh.name}`);
});

console.log("\nMaterials:");
gltf.materials.forEach((mat, index) => {
    console.log(`Material ${index}: ${mat.name}`);
});

console.log("\nNodes with meshes:");
gltf.nodes.forEach((node, index) => {
    if (node.mesh !== undefined) {
        const mesh = gltf.meshes[node.mesh];
        const materialIndex = mesh.primitives[0].material;
        const materialName = materialIndex !== undefined ? gltf.materials[materialIndex].name : 'none';
        console.log(`Node ${index}: ${node.name} -> Mesh ${node.mesh} (${mesh.name}), Material: ${materialName}`);
    }
});

fs.writeFileSync('gltf_dump.json', JSON.stringify(gltf, null, 2));
console.log("Dumped JSON to gltf_dump.json");
