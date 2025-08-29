// Audio storage utility - simplified to use just a URL (local path or CDN)
// Other fields are optional for CDN configurations

interface AudioStorageConfig {
  baseUrl: string // Can be local path like "/audio" or CDN URL
  apiKey?: string // Optional for CDN authentication
  bucket?: string // Optional for cloud storage
}

class AudioStorage {
  private config: AudioStorageConfig

  constructor() {
    this.config = {
      baseUrl: process.env.AUDIO_STORAGE_URL || "/audio", // Default to local path
      apiKey: process.env.AUDIO_STORAGE_API_KEY, // Optional
      bucket: process.env.AUDIO_STORAGE_BUCKET, // Optional
    }
  }

  async uploadAudio(audioBlob: Blob, filename: string): Promise<string> {
    const formData = new FormData()
    formData.append("audio", audioBlob, filename)

    const response = await fetch("/api/audio/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload audio file")
    }

    const { url } = await response.json()
    return url
  }

  async deleteAudio(url: string): Promise<void> {
    await fetch("/api/audio/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
  }

  generateFilename(userId: string, purpose: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `recordings/${userId}/${purpose}/${timestamp}-${random}.webm`
  }

  getConfig() {
    return this.config
  }
}

export const audioStorage = new AudioStorage()
