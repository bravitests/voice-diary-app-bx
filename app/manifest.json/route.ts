export async function GET() {
  return Response.json({
    name: "VoiceDiary - AI Voice Journaling",
    short_name: "VoiceDiary",
    description: "AI-powered voice journaling app with blockchain integration",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    scope: "/",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  })
}