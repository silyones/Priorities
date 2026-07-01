// Stdin/stdout bridge so Python FastAPI can reuse the existing Firestore client setup.

import "dotenv/config";
import { saveSubmissionToFirestore } from "./submissions";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    const raw = await readStdin();
    const payload = JSON.parse(raw);
    const result = await saveSubmissionToFirestore(payload);
    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firestore save failed";
    process.stdout.write(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

void main();
