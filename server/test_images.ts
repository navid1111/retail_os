import { detectBlur, computePHash, hammingDistance } from "./src/services/image.service";
import path from "path";

async function test() {
  const images = ["./media/dup1.jpeg", "./media/dup2.jpeg", "./media/blury.jpg"];
  const hashes: Record<string, string> = {};

  for (const img of images) {
    const fullPath = path.resolve(img);
    const blurResult = await detectBlur(fullPath);
    const hash = await computePHash(fullPath);
    hashes[img] = hash;
    
    console.log(`\nImage: ${img}`);
    console.log(`Blur Result:`, blurResult);
    console.log(`pHash: ${hash}`);
  }

  console.log("\n--- Distances ---");
  console.log(`dup1 vs dup2: ${hammingDistance(hashes["./media/dup1.jpeg"], hashes["./media/dup2.jpeg"])}`);
  console.log(`dup1 vs blury: ${hammingDistance(hashes["./media/dup1.jpeg"], hashes["./media/blury.jpg"])}`);
  console.log(`dup2 vs blury: ${hammingDistance(hashes["./media/dup2.jpeg"], hashes["./media/blury.jpg"])}`);
}

test().catch(console.error);
