import { put } from '@vercel/blob'

export async function uploadAudioBlob(audioBlob: Blob, filename?: string): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const blobFilename = filename || `audio/${timestamp}-${random}.webm`
  
  const blob = await put(blobFilename, audioBlob, {
    access: 'public',
    contentType: 'audio/webm'
  })
  
  return blob.url
}