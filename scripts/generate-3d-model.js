import fs from 'fs/promises';
import path from 'path';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
    console.error("❌ Error: REPLICATE_API_TOKEN is not set.");
    console.error("Please provide it as an environment variable.");
    console.error("Example: REPLICATE_API_TOKEN=your_token node scripts/generate-3d-model.js <image_url> <output_name>");
    process.exit(1);
}

const imageUrl = process.argv[2];
const outputName = process.argv[3] || 'generated-model';

if (!imageUrl) {
    console.error("❌ Error: Please provide an input image URL.");
    console.error("Usage: node scripts/generate-3d-model.js <image_url> [output_name]");
    process.exit(1);
}

async function run() {
    console.log(`🚀 Starting TRELLIS 3D generation for: ${imageUrl}`);
    console.log(`📦 Output will be saved as: ${outputName}.glb`);

    try {
        // 1. Create Prediction using firtoz/trellis
        const createResp = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c", // Pulled latest version dynamically
                input: {
                    images: [imageUrl],
                    texture_size: 1024,
                    mesh_simplify: 0.95,
                    generate_color: true,
                    generate_model: true,
                    generate_normal: true,
                    seed: 0
                }
            })
        });

        if (!createResp.ok) {
            const errText = await createResp.text();
            throw new Error(`API Error: ${createResp.status} ${errText}`);
        }

        let prediction = await createResp.json();
        console.log(`⏱️ Prediction started (ID: ${prediction.id})`);

        // 2. Poll for Completion
        while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
            await new Promise(r => setTimeout(r, 4000));
            console.log(`⏳ Status: ${prediction.status}...`);
            const pollResp = await fetch(prediction.urls.get, {
                headers: { "Authorization": `Bearer ${REPLICATE_API_TOKEN}` }
            });

            if (!pollResp.ok) {
                const errText = await pollResp.text();
                throw new Error(`Polling Error: ${pollResp.status} ${errText}`);
            }
            prediction = await pollResp.json();
        }

        if (prediction.status === "failed") {
            throw new Error(`Generation failed: ${prediction.error}`);
        }

        if (prediction.status === "canceled") {
            throw new Error("Generation was canceled.");
        }

        console.log("✅ Generation succeeded!");

        let fileUrl = null;
        if (typeof prediction.output === 'string') {
            fileUrl = prediction.output;
        } else if (prediction.output?.model_file) {
            fileUrl = prediction.output.model_file;
        } else if (prediction.output?.model) {
            fileUrl = prediction.output.model;
        } else if (Array.isArray(prediction.output)) {
            fileUrl = prediction.output.find(url => url.endsWith(".glb")) || prediction.output[0];
        }

        if (fileUrl) {
            console.log(`⬇️ Downloading GLB from ${fileUrl}...`);
            const glbResp = await fetch(fileUrl);
            const arrayBuffer = await glbResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Ensure public/models directory exists
            const outputDir = path.join(process.cwd(), 'public', 'models');
            await fs.mkdir(outputDir, { recursive: true });

            const outputPath = path.join(outputDir, `${outputName}.glb`);
            await fs.writeFile(outputPath, buffer);
            console.log(`🎉 Successfully saved 3D model to ${outputPath}`);
            console.log(`\n💡 Tip: To load this in your component, use useGLTF('/models/${outputName}.glb')`);
        } else {
            console.log("⚠️ Could not automatically find the GLB download URL.");
            console.log("Raw output:", JSON.stringify(prediction.output, null, 2));
        }

    } catch (err) {
        console.error("❌ An error occurred:", err.message);
        process.exit(1);
    }
}

run();
