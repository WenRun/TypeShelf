import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

export async function seed() {
  // Create default fonts directory if not exists
  const fontsDir = path.resolve("fonts");
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
    console.log("Created ./fonts directory");
  }

  // Check collections
  const cols = await storage.getCollections();
  if (cols.length === 0) {
    await storage.createCollection({
      name: "My Projects",
      description: "Fonts for upcoming work",
      color: "#3b82f6" // blue-500
    });
    console.log("Seeded 'My Projects' collection");
  }
}
