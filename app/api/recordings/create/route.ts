import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { checkUsageLimit } from "@/lib/subscription";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "audio");

async function ensureUploadDirExists() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
    throw new Error("Could not create upload directory.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const purposeId = formData.get("purposeId") as string | null;
    const duration = formData.get("duration") as string | null;
    const walletAddress = formData.get("walletAddress") as string | null;

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAllowed = await checkUsageLimit(walletAddress, "recording");
    if (!isAllowed.allowed) {
      return NextResponse.json({ error: isAllowed.reason }, { status: 402 });
    }

    if (!audio || !purposeId || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await ensureUploadDirExists();

    const uniqueFilename = `${Date.now()}-${walletAddress}.webm`;
    const localPath = path.join(UPLOAD_DIR, uniqueFilename);
    const audioUrl = `/uploads/audio/${uniqueFilename}`;

    const buffer = Buffer.from(await audio.arrayBuffer());
    await fs.writeFile(localPath, buffer);

    // Create recording entry in database (without transcription/summary - that will be added later)
    const newRecording = await db.createRecording(
      walletAddress,
      purposeId,
      audioUrl,
      parseInt(duration, 10)
    );

    console.log("[v0] Recording created", {
      recordingId: newRecording.id,
      walletAddress,
      audioUrl,
      duration: parseInt(duration, 10)
    });

    return NextResponse.json({
      recordingId: newRecording.id,
      audioUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${audioUrl}`
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating recording:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}