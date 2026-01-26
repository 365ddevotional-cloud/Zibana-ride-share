import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, RefreshCw, Check, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
}

export function CameraCapture({
  onCapture,
  onCancel,
  title = "Take a Photo",
  description = "Position yourself clearly in the frame",
  isSubmitting = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Could not access camera. Please allow camera permissions and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const handleCancel = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    onCancel?.();
  }, [stopCamera, onCancel]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
          {!isCameraActive && !capturedImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <Button onClick={startCamera} data-testid="button-start-camera">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
              {error && (
                <p className="text-sm text-destructive text-center px-4">{error}</p>
              )}
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive && !capturedImage ? "" : "hidden"}`}
            data-testid="video-camera-feed"
          />

          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
              data-testid="img-captured-photo"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {isCameraActive && !capturedImage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              data-testid="button-cancel-camera"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={capturePhoto} className="flex-1" data-testid="button-capture">
              <Camera className="h-4 w-4 mr-1" />
              Capture
            </Button>
          </div>
        )}

        {capturedImage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={retake}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="button-retake"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retake
            </Button>
            <Button
              onClick={confirmCapture}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="button-confirm-photo"
            >
              <Check className="h-4 w-4 mr-1" />
              {isSubmitting ? "Submitting..." : "Use Photo"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
