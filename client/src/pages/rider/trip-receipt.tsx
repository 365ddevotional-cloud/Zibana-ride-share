import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useRef, useCallback } from "react";
import {
  MapPin,
  Download,
  Share2,
  CreditCard,
  Banknote,
  User,
  Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReceiptData {
  transactionRef: string;
  dateTime: string;
  riderName: string;
  driverName: string;
  pickup: string;
  dropoff: string;
  tripFare: number;
  bookingFee: number;
  governmentLevy: number;
  tollAmount: number;
  subtotal: number;
  vatAmount: number;
  totalPaid: number;
  paymentMethod: string;
  currencyCode: string;
}

interface TripReceiptProps {
  tripId: string;
}

export default function TripReceipt({ tripId }: TripReceiptProps) {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const { data: receipt, isLoading, error } = useQuery<ReceiptData>({
    queryKey: ["/api/trips", tripId, "receipt"],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/receipt`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load receipt");
      return res.json();
    },
    enabled: !!tripId,
  });

  const formatCurrency = (amount: number, currency: string = "NGN") => {
    if (currency === "NGN") return `\u20A6${amount.toFixed(2)}`;
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  };

  const paymentLabel = (method: string) => {
    switch (method) {
      case "CASH": return "Cash";
      case "MAIN_WALLET": return "Wallet";
      case "CARD": return "Card";
      default: return method;
    }
  };

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `ZIBANA-Receipt-${receipt?.transactionRef || "trip"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Receipt downloaded" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  }, [receipt, toast]);

  const handleShare = useCallback(async () => {
    if (!receipt) return;
    const text = `ZIBANA Receipt\nRef: ${receipt.transactionRef}\nTotal: ${formatCurrency(receipt.totalPaid, receipt.currencyCode)}\n${receipt.pickup} \u2192 ${receipt.dropoff}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "ZIBANA Trip Receipt", text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Receipt copied to clipboard" });
    }
  }, [receipt, toast]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-md mx-auto p-4 text-center text-muted-foreground" data-testid="receipt-error">
        <p>Receipt is not available for this trip.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div ref={receiptRef} className="bg-white rounded-xl shadow-lg overflow-hidden" data-testid="receipt-container">
        <div className="bg-slate-900 text-white text-center py-6 px-4">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-receipt-brand">ZIBANA</h1>
          <p className="text-sm text-slate-300 mt-1">Smart Ride. Transparent Fare.</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Transaction Ref</p>
              <p className="font-mono font-semibold text-slate-800" data-testid="text-transaction-ref">{receipt.transactionRef}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Date & Time</p>
              <p className="text-sm text-slate-700" data-testid="text-receipt-date">{formatDate(receipt.dateTime)}</p>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-400 text-xs">Rider</p>
                <p className="text-slate-800 font-medium" data-testid="text-receipt-rider">{receipt.riderName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-400 text-xs">Driver</p>
                <p className="text-slate-800 font-medium" data-testid="text-receipt-driver">{receipt.driverName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-400 text-xs">Pickup</p>
                <p className="text-sm text-slate-800" data-testid="text-receipt-pickup">{receipt.pickup}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-400 text-xs">Dropoff</p>
                <p className="text-sm text-slate-800" data-testid="text-receipt-dropoff">{receipt.dropoff}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fare Breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Trip Fare</span>
                <span className="text-slate-800 font-medium" data-testid="text-receipt-trip-fare">{formatCurrency(receipt.tripFare, receipt.currencyCode)}</span>
              </div>
              {receipt.bookingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Booking Fee</span>
                  <span className="text-slate-800" data-testid="text-receipt-booking-fee">{formatCurrency(receipt.bookingFee, receipt.currencyCode)}</span>
                </div>
              )}
              {receipt.governmentLevy > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Government Levy</span>
                  <span className="text-slate-800" data-testid="text-receipt-gov-levy">{formatCurrency(receipt.governmentLevy, receipt.currencyCode)}</span>
                </div>
              )}
              {receipt.tollAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Toll</span>
                  <span className="text-slate-800" data-testid="text-receipt-toll">{formatCurrency(receipt.tollAmount, receipt.currencyCode)}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-800 font-medium" data-testid="text-receipt-subtotal">{formatCurrency(receipt.subtotal, receipt.currencyCode)}</span>
            </div>
            {receipt.vatAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">VAT</span>
                <span className="text-slate-800" data-testid="text-receipt-vat">{formatCurrency(receipt.vatAmount, receipt.currencyCode)}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total Paid</span>
            <span className="text-xl font-bold text-slate-900" data-testid="text-receipt-total">{formatCurrency(receipt.totalPaid, receipt.currencyCode)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            {receipt.paymentMethod === "CASH" ? (
              <Banknote className="h-4 w-4 text-emerald-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-blue-500" />
            )}
            <span data-testid="text-receipt-payment-method">Payment: {paymentLabel(receipt.paymentMethod)}</span>
          </div>

          <Separator className="bg-slate-200" />

          <p className="text-center text-xs text-slate-400">
            Thank you for riding with ZIBANA
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleDownload} data-testid="button-download-receipt">
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} data-testid="button-share-receipt">
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
      </div>
    </div>
  );
}
