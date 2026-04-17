import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

async function loadEnv(p) {
  if (!existsSync(p)) return;
  const content = await readFile(p, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

await loadEnv(path.join(__dirname, ".env"));
await loadEnv(path.join(ROOT_DIR, ".env"));
await loadEnv(path.join(ROOT_DIR, ".env.local"));

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Delete DB records
const { data, error } = await supabase
  .from("product_images")
  .delete()
  .like("storage_path", "%ai-on-feet%")
  .select("id, product_id, storage_path");

if (error) { console.error("❌ DB delete failed:", error.message); process.exit(1); }

console.log(`🗑  Deleted ${data.length} DB records:`);
data.forEach(r => console.log("   -", r.storage_path));

// 2. Delete from storage
const paths = data.map(r => r.storage_path);
if (paths.length) {
  const { error: storageErr } = await supabase.storage.from("product-images").remove(paths);
  if (storageErr) console.error("❌ Storage delete failed:", storageErr.message);
  else console.log("✅ Storage files deleted.");
} else {
  console.log("Nothing in storage to delete.");
}
