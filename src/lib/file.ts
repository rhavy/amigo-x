import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "participants.json");

export async function getParticipants() {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveParticipants(participants: any[]) {
  await fs.writeFile(filePath, JSON.stringify(participants, null, 2), "utf8");
}
