import "dotenv/config";
import { getSubmissionImage } from "./submission_queries";

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
    const { id } = JSON.parse(raw) as { id?: string };
    if (!id?.trim()) {
      throw new Error("Submission id is required");
    }

    const imageBase64 = await getSubmissionImage(id.trim());
    process.stdout.write(JSON.stringify({ imageBase64 }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch submission image";
    process.stdout.write(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

void main();
