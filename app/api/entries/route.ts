import { type NextRequest, NextResponse } from "next/server";
import { put } from '@vercel/blob';
import { db } from "@/lib/database";
import { transcribeAudio, generateSummaryFromTranscript } from "@/lib/gemini-ai";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress") || searchParams.get("wallet_address");
    const purposeId = searchParams.get("purposeId");

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
    }

    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const entries = await db.getUserRecordings(user.id, purposeId === "all" ? undefined : purposeId || undefined);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("Received request to create new entry");
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const purposeId = formData.get("purposeId") as string;
    const walletAddress = formData.get("walletAddress") as string;
    const recordedAt = formData.get("recordedAt") as string;

    console.log("Parsed form data:", { purposeId, walletAddress, recordedAt, audioFileName: audioFile.name, audioFileSize: audioFile.size });

    if (!audioFile || !purposeId || !walletAddress) {
      console.error("Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Fetching user by wallet address...");
    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      console.error("User not found for wallet address:", walletAddress);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = user.id;
    console.log("User found:", userId);

    // 1. Save the audio file to Vercel Blob
    console.log("Uploading audio file to Vercel Blob...");
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `audio/${timestamp}-${random}.webm`;
    
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: audioFile.type || 'audio/webm'
    });
    
    const publicUrl = blob.url;
    console.log("Audio file uploaded to:", publicUrl);

    // 2. Transcribe the audio
    console.log("Transcribing audio with Gemini API...");
    const audioBlob = new Blob([buffer], { type: audioFile.type });
    const { transcript, tokensUsed: transcriptTokens, cost: transcriptCost } = await transcribeAudio(audioBlob, userId);
    console.log("Transcription successful. Tokens used:", transcriptTokens, "Cost:", transcriptCost);

    if (transcript === "Transcription failed. Please try again.") {
        console.error("Transcription failed");
        return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }

    // 3. Generate summary from the transcript
    console.log("Generating summary with Gemini API...");
    const { summary, insights, tokensUsed: summaryTokens, cost: summaryCost } = await generateSummaryFromTranscript(transcript, userId);
    console.log("Summary generation successful. Tokens used:", summaryTokens, "Cost:", summaryCost);

    // 4. Save the complete entry to the database
    console.log("Saving entry to database...");
    const newEntry = await db.createRecording({
      userId,
      purposeId,
      audioUrl: publicUrl,
      transcript,
      summary,
      insights,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });
    console.log("Database entry created:", newEntry.id);
    
    // 5. Track API usage
    console.log("Tracking API usage...");
    const totalTokensUsed = transcriptTokens + summaryTokens;
    const totalCost = transcriptCost + summaryCost;
    await db.trackApiUsage(userId, "transcription", totalTokensUsed, totalCost);
    console.log("API usage tracked");

    console.log("Returning new entry to client");
    return NextResponse.json(newEntry, { status: 201 });

  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
