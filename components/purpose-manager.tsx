"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Purpose {
  id: string
  name: string
  description: string
  color: string
  is_default: boolean
  recording_count: number
  created_at: string
}

export function PurposeManager() {
  const { user } = useAuth()
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPurpose, setSelectedPurpose] = useState<Purpose | null>(null)

  useEffect(() => {
    if (user?.walletAddress) {
      fetchPurposes()
    }
  }, [user])

  const fetchPurposes = async () => {
    try {
      const response = await fetch(`/api/purposes?wallet_address=${user?.walletAddress}`)
      const data = await response.json()
      if (response.ok) {
        setPurposes(data.purposes)
      }
    } catch (error) {
      console.error("Error fetching purposes:", error)
    } finally {
      setLoading(false)
    }
  }



  const handleDeletePurpose = async () => {
    if (!selectedPurpose) return

    try {
      const response = await fetch(`/api/purposes/${selectedPurpose.id}?wallet_address=${user?.walletAddress}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchPurposes()
        setShowDeleteDialog(false)
        setSelectedPurpose(null)
      }
    } catch (error) {
      console.error("Error deleting purpose:", error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading purposes...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Manage Purposes</h2>
        <p className="text-sm text-muted-foreground mt-1">Delete custom purposes you no longer need</p>
      </div>

      <div className="grid gap-4">
        {purposes.map((purpose) => (
          <Card key={purpose.id} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: purpose.color }} />
                    <h3 className="font-medium text-card-foreground">{purpose.name}</h3>
                    {purpose.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  {purpose.description && <p className="text-sm text-muted-foreground mb-2">{purpose.description}</p>}
                  <p className="text-xs text-muted-foreground">
                    {purpose.recording_count} recording{purpose.recording_count !== 1 ? "s" : ""}
                  </p>
                </div>
                {!purpose.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPurpose(purpose)
                      setShowDeleteDialog(true)
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* Delete Purpose Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Purpose
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPurpose?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedPurpose && selectedPurpose.recording_count > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">
                Warning: This purpose has {selectedPurpose.recording_count} recording
                {selectedPurpose.recording_count !== 1 ? "s" : ""} attached. Deleting this purpose will remove the
                purpose association from these recordings.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePurpose}>
              Delete Purpose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
