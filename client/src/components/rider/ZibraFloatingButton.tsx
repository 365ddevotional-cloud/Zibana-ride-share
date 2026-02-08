import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Headphones, X } from "lucide-react";
import { ZibaSupport } from "@/components/ziba-support";

export function ZibraFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
          data-testid="button-zibra-float"
        >
          <Headphones className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                ZIBRA Support
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] px-2 pb-2">
            <ZibaSupport onClose={() => setOpen(false)} forceRole="rider" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
