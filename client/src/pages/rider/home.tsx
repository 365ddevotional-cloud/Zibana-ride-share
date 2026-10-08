import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapPin, Navigation, ArrowUpRight, Wallet, Calendar, Home, Briefcase, ShieldCheck, Info } from "lucide-react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { RideClassSelector } from "@/components/rider/RideClassSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@shared/currency";
import type { RideClassId } from "@shared/ride-classes";

interface WalletInfo { mainBalance: string; currencyCode: string; defaultPaymentMethod: string }
interface SavedPlace { id: string; type: string; address: string }

export default function RiderHome() {
  const [, navigate] = useLocation();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedClass, setSelectedClass] = useState<RideClassId>("go");
  const { data: wallet, isError: walletError } = useQuery<WalletInfo>({ queryKey: ["/api/rider/wallet-info"] });
  const { data: places = [] } = useQuery<SavedPlace[]>({ queryKey: ["/api/rider/saved-places"] });

  return <RiderRouteGuard><RiderLayout>
    <div className="space-y-7 px-4 py-6 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 px-6 py-8 text-white sm:px-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" aria-hidden="true" />
        <div className="relative max-w-lg">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">Your journey, your way</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-greeting">Where are you going?</h1>
          <p className="mt-3 text-sm leading-6 text-violet-100">Explore ride options, keep your favourite places close, and manage your travel in one place.</p>
        </div>
      </section>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4" role="status" data-testid="booking-readiness">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div><p className="text-sm font-semibold">Preview available · ride booking coming soon</p><p className="mt-1 text-sm text-muted-foreground">Fares and driver availability are still being connected. You can explore the app, but you cannot request an immediate ride yet.</p></div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="plan-title">
          <h2 id="plan-title" className="text-lg font-semibold">Plan your journey</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Start with your pickup and destination.</p>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="ride-pickup">Pickup</Label><div className="relative"><MapPin className="absolute left-3 top-3.5 h-5 w-5 text-primary" aria-hidden="true"/><Input id="ride-pickup" placeholder="Enter a pickup address" value={pickup} onChange={e => setPickup(e.target.value)} className="h-12 rounded-xl pl-10" data-testid="input-pickup" /></div></div>
            <div className="space-y-2"><Label htmlFor="ride-destination">Destination</Label><div className="relative"><Navigation className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden="true"/><Input id="ride-destination" placeholder="Where would you like to go?" value={destination} onChange={e => setDestination(e.target.value)} className="h-12 rounded-xl pl-10" data-testid="input-destination" /></div></div>
          </div>
          <div className="my-6 border-t" />
          <RideClassSelector selectedClass={selectedClass} onClassChange={setSelectedClass} />
          <Button className="mt-6 h-12 w-full rounded-xl" disabled data-testid="button-request-ride">Ride booking is not available yet</Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">No fare is quoted and no payment is taken.</p>
        </section>
        <aside className="space-y-5">
          <section className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2.5"><Wallet className="h-5 w-5 text-primary"/></span><h2 className="font-semibold">Your wallet</h2></div>
            <p className="mt-5 text-3xl font-semibold tracking-tight" data-testid="wallet-balance">{wallet ? formatCurrency(wallet.mainBalance, wallet.currencyCode) : walletError ? "Unavailable" : "Loading…"}</p>
            <p className="mt-2 text-sm text-muted-foreground" data-testid="text-wallet-currency">{wallet ? `Account currency: ${wallet.currencyCode}. Existing funds keep their recorded currency.` : walletError ? "We could not load your wallet. Open payments to retry." : "Checking your account currency…"}</p>
            <Button variant="outline" className="mt-5 w-full rounded-xl" onClick={() => navigate("/rider/payments")} data-testid="button-payment-method">Manage payments<ArrowUpRight className="ml-auto h-4 w-4"/></Button>
          </section>
          <section className="rounded-3xl border bg-card p-5 shadow-sm"><h2 className="mb-3 font-semibold">Saved places</h2><div className="divide-y">{[{type:"home",label:"Home",Icon:Home},{type:"work",label:"Work",Icon:Briefcase}].map(({type,label,Icon}) => { const place = places.find(p => p.type === type); return <button key={type} className="flex w-full items-center gap-3 rounded-lg py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => place ? setDestination(place.address) : navigate(`/rider/saved-places/${type}`)} data-testid={`button-saved-${type}`}><Icon className="h-5 w-5 shrink-0 text-muted-foreground"/><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block truncate text-xs text-muted-foreground">{place?.address || `Add ${label.toLowerCase()} address`}</span></span><ArrowUpRight className="h-4 w-4 text-muted-foreground"/></button>})}</div></section>
          <button className="flex w-full items-start gap-3 rounded-3xl border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary" onClick={() => navigate("/rider/schedule")} data-testid="button-schedule-ride"><Calendar className="h-5 w-5 text-primary"/><span><span className="block text-sm font-semibold">Plan ahead</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Save a future ride request. A driver must confirm it.</span></span><ArrowUpRight className="ml-auto h-4 w-4 shrink-0"/></button>
          <Button variant="ghost" className="w-full" onClick={() => navigate("/rider/safety")}><ShieldCheck className="mr-2 h-4 w-4"/>Visit the safety hub</Button>
        </aside>
      </div>
    </div>
  </RiderLayout></RiderRouteGuard>;
}
