"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Check } from "lucide-react"

interface AddPurposeModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, description: string, color: string) => void
}

const colorOptions = [
  "#a2d2ff",
  "#ffc8dd",
  "#cdb4db",
  "#bde0fe",
  "#ffafcc",
  "#ffddd2",
  "#fcf6bd",
  "#d4a373",
]

export function AddPurposeModal({ isOpen, onClose, onAdd }: AddPurposeModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(colorOptions[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim(), description.trim(), color)
      setName("")
      setDescription("")
      setColor(colorOptions[0])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <Card className="relative w-full max-w-sm bg-card border-border shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Purpose
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Work Reflections"
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you record about?"
                maxLength={200}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ backgroundColor: c, borderColor: color === c ? 'hsl(var(--primary))' : 'transparent' }}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check className="w-4 h-4 text-primary-foreground" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Purpose
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}