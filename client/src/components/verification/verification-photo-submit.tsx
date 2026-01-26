import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "./camera-capture";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle, Clock, XCircle, Shield } from "lucide-react";

type VerificationStatus = "unverified" | "pending_review" | "verified" | "rejected";

interface VerificationPhotoSubmitProps {
  currentStatus: VerificationStatus;
  verificationPhoto?: string | null;
  onStatusChange?: (status: VerificationStatus) => void;
}

export function VerificationPhotoSubmit({
  currentStatus,
  verificationPhoto,
  onStatusChange,
}: VerificationPhotoSubmitProps) {
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);

  const submitPhoto = useMutation({
    mutationFn: async (photoData: string) => {
      const sessionId = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const response = await apiRequest("POST", "/api/profile/verification-photo", {
        verificationPhoto: photoData,
        sessionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({
        title: "Photo submitted",
        description: "Your verification photo is being reviewed",
      });
      setShowCamera(false);
      onStatusChange?.("pending_review");
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCapture = (imageData: string) => {
    submitPhoto.mutate(imageData);
  };

  const getStatusIcon = () => {
    switch (currentStatus) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending_review":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "verified":
        return <Badge className="bg-green-500/10 text-green-600">Verified</Badge>;
      case "pending_review":
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Not Verified</Badge>;
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        title="Identity Verification"
        description="Take a clear photo of your face for verification"
        onCapture={handleCapture}
        onCancel={() => setShowCamera(false)}
        isSubmitting={submitPhoto.isPending}
      />
    );
  }

  return (
    <Card data-testid="card-verification-status">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Identity Verification
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Verify your identity to build trust with riders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentStatus === "verified" ? (
          <div className="text-sm text-muted-foreground">
            Your identity has been verified. Riders can see your verified status.
          </div>
        ) : currentStatus === "pending_review" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your verification photo is being reviewed by our team.
            </p>
            {verificationPhoto && (
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted max-w-[200px]">
                <img
                  src={verificationPhoto}
                  alt="Verification photo"
                  className="w-full h-full object-cover"
                  data-testid="img-verification-preview"
                />
              </div>
            )}
          </div>
        ) : currentStatus === "rejected" ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              Your verification was not approved. Please submit a new photo.
            </p>
            <Button onClick={() => setShowCamera(true)} data-testid="button-resubmit-verification">
              <Camera className="h-4 w-4 mr-2" />
              Take New Photo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Submit a clear photo of yourself to complete verification.
            </p>
            <Button onClick={() => setShowCamera(true)} data-testid="button-start-verification">
              <Camera className="h-4 w-4 mr-2" />
              Start Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
