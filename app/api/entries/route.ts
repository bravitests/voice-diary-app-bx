import { type NextRequest, NextResponse } from "next/server";
import { getUserByFirebaseUid, getUserRecordings, createRecording, trackApiUsage } from "@/lib/database";
import { transcribeAudio, generateSummaryFromTranscript } from "@/lib/gemini-ai";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get("firebaseUid");
    const purposeId = searchParams.get("purposeId");

    if (!firebaseUid) {
      return NextResponse.json({ error: "Missing Firebase UID" }, { status: 400 });
    }

    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const entries = await getUserRecordings(user.id, purposeId === "all" ? undefined : purposeId || undefined);

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
    const audioUrl = formData.get("audioUrl") as string;
    const purposeId = formData.get("purposeId") as string;
    const firebaseUid = formData.get("firebaseUid") as string;
    const recordedAt = formData.get("recordedAt") as string;

    console.log("Parsed form data:", { purposeId, firebaseUid, recordedAt, audioUrl });

    if (!audioUrl || !purposeId || !firebaseUid) {
      console.error("Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Fetching user by Firebase UID...");
    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) {
      console.error("User not found for UID:", firebaseUid);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = user.id;
    console.log("User found:", userId);

    // Check Subscription Limits
    const { getUserPaystackSubscription, getUserRecordings } = await import("@/lib/database");
    const subscription = await getUserPaystackSubscription(userId);

    // Default Free Limits
    let limits = { recording_limit_seconds: 120, entries_per_month: 10 };

    if (subscription && subscription.plan_limits) {
      limits = subscription.plan_limits;
    }

    // Check monthly entry limit
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const userRecordings = await getUserRecordings(userId);
    const entriesThisMonth = userRecordings.filter((r: any) => new Date(r.created_at) >= startOfMonth).length;

    if (entriesThisMonth >= limits.entries_per_month) {
      return NextResponse.json({
        error: "Monthly entry limit reached. Please upgrade your plan."
      }, { status: 403 });
    }

    // 1. Fetch the audio file from Firebase Storage for transcription
    console.log("Fetching audio file from URL for transcription...");
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error("Failed to fetch audio file from storage");
    }
    const audioBlob = await audioResponse.blob();

    // Check recording duration limit (approximate check via blob size or if metadata available)
    // For better accuracy, client should enforce, but we can check here if we had duration.
    // Since we don't have duration in metadata yet, we rely on client enforcement for now, 
    // or we could decode audio here but that's heavy.

    // 2. Transcribe the audio
    console.log("Transcribing audio with Gemini API...");
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
    const newEntry = await createRecording({
      userId,
      purposeId,
      audioUrl, // Use the Firebase Storage URL directly
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
    await trackApiUsage(userId, "transcription", totalTokensUsed, totalCost);
    console.log("API usage tracked");

    console.log("Returning new entry to client");
    return NextResponse.json(newEntry, { status: 201 });

  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
