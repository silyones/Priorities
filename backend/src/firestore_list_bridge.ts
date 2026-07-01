import "dotenv/config";
import { listSubmissions } from "./submission_queries";

async function main() {
  try {
    const items = await listSubmissions();
    process.stdout.write(JSON.stringify(items));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list submissions";
    process.stdout.write(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

void main();
