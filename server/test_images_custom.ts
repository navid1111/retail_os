import { detectBlur, computePHash, hammingDistance } from "./src/services/image.service";
import path from "path";

async function main() {
  const images = ["dup1.jpeg", "dup2.jpeg", "blury.jpg"];
  const results: Record<string, any> = {};

  for (const img of images) {
    const imgPath = path.join(__dirname, "media", img);
    console.log(`Processing ${img}...`);
    
    try {
      const blur = await detectBlur(imgPath);
      const hash = await computePHash(imgPath);
      
      results[img] = {
        blur,
        hash
      };
      
      console.log(`  Blur: variance=${blur.variance.toFixed(2)}, isBlurry=${blur.isBlurry}, conf=${blur.confidence.toFixed(2)}`);
      console.log(`  Hash: ${hash}`);
    } catch (err) {
      console.error(`  Error processing ${img}:`, err);
    }
  }

  console.log("\nComparisons:");
  const pairs = [
    ["dup1.jpeg", "dup2.jpeg"],
    ["dup1.jpeg", "blury.jpg"],
    ["dup2.jpeg", "blury.jpg"]
  ];

  for (const [img1, img2] of pairs) {
    if (results[img1] && results[img2]) {
      const dist = hammingDistance(results[img1].hash, results[img2].hash);
      console.log(`  ${img1} vs ${img2} -> Distance: ${dist} (Duplicate threshold is <= 20)`);
    }
  }
}

main().catch(console.error);
