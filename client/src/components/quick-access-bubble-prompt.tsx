import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Smartphone } from "lucide-react";
import {
  shouldShowBubblePrompt,
  setBubbleEnabled,
  setPromptCount,
  getPromptCount,
  setPromptDisabled,
  startQuickAccessBubble,
  requestBubbleOverlayPermission,
  isQuickAccessAvailable,
} from "@/lib/quickAccessBubble";
import { useToast } from "@/hooks/use-toast";

export function QuickAccessBubblePrompt() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isQuickAccessAvailable()) return;
    const timer = setTimeout(() => {
      if (shouldShowBubblePrompt()) {
        setOpen(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    const permResult = await requestBubbleOverlayPermission();
    if (permResult.granted || permResult.alreadyGranted) {
      setBubbleEnabled(true);
      const started = await startQuickAccessBubble();
      if (started) {
        toast({ title: "Quick Access Bubble enabled", description: "You can find it floating on your screen" });
      }
    } else if (permResult.settingsOpened) {
      toast({ title: "Permission needed", description: "Please allow 'Display over other apps' for Zibana, then try again in Settings" });
      setBubbleEnabled(true);
    }
    setOpen(false);
  };

  const handleNotNow = () => {
    const currentCount = getPromptCount();
    const newCount = currentCount + 1;
    setPromptCount(newCount);
    if (newCount >= 3) {
      setPromptDisabled(true);
    }
    setOpen(false);
  };

  if (!isQuickAccessAvailable()) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[380px]" data-testid="bubble-prompt-dialog">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Enable Zibana Quick Access Bubble?</DialogTitle>
          <DialogDescription className="text-center">
            A floating bubble stays on your screen so you can quickly return to Zibana from any app. Works like Messenger or Bolt.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={handleEnable} className="w-full" data-testid="button-enable-bubble">
            Enable
          </Button>
          <Button variant="ghost" onClick={handleNotNow} className="w-full" data-testid="button-decline-bubble">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
