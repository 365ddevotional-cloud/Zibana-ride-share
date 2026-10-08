import { useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Button } from "@/components/ui/button";

export default function FundUser() {
  const [, navigate] = useLocation();
  return <RiderRouteGuard><RiderLayout><div className="mx-auto max-w-lg space-y-6 p-6">
    <Button variant="ghost" onClick={() => navigate("/rider/payments")}><ArrowLeft className="mr-2 h-4 w-4"/>Back to payments</Button>
    <section className="rounded-3xl border bg-card p-8 text-center">
      <Send className="mx-auto mb-5 h-9 w-9 text-primary"/>
      <h1 className="text-2xl font-semibold">Wallet transfers are coming soon</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Sending money to another rider is not available yet. Your wallet balance stays unchanged.</p>
      <Button className="mt-6 rounded-xl" onClick={() => navigate("/rider/wallet")}>View your wallet</Button>
    </section>
  </div></RiderLayout></RiderRouteGuard>;
}
