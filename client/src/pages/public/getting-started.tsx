import { policies, NIGERIA_PRICING_VERSION } from "@shared/nigeria-pricing";
import { useState } from "react";
import { Link } from "wouter";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuickStartTour } from "@/components/quick-start-tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const answers = [
  ["Can I book a ride now?", "Live ride booking is currently closed while service readiness and payment settlement are verified. Creating an account or completing a driver profile does not mean trips are available. Check the app for launch updates."],
  ["Can Keke drivers register?", "Nigerian drivers can declare Keke (tricycle) as their vehicle category. Car and Keke eligibility are separate. Keke bookings remain closed pending permitted routes, local approvals and verified payment settlement. Approved fares take effect when live booking opens."],
  ["How do I change the app theme?", "Use the theme button at the top of this page, or Appearance in Settings. Choose Light, Dark or System (Auto). System follows your device. Your choice is saved on this device when browser storage is available."],
  ["What if location permission is denied?", "You can still read the guide and manage your account. For pickup planning, enter a location manually when that option is shown. If you want to enable GPS later, change the app's location permission in your device settings."],
  ["What if the app loses connection?", "Check the offline indicator and reconnect before submitting. If a payment or ride action is interrupted, check its status before trying again to avoid duplicate requests. Never assume a payment succeeded from a loading screen."],
  ["How do I report a bug or suggest a feature?", "Sign in and open Help & Safety as a rider, or Help as a driver. Create a support ticket with the screen name, steps, expected result and actual result. Mention your device and app version if known. Never include passwords, verification codes or full card or bank details."],
  ["Can I share a trip?", "Trip sharing is available only when a trip has an authorized sharing link. Share it only with people you trust because it can reveal trip information. Do not post private trip links publicly."],
  ["What is coming next?", "The next launch milestones are permitted operating routes, verified payment settlement and end-to-end booking verification. Keke booking stays closed until those checks are complete. No launch date or guaranteed income is promised."],
];
export default function GettingStartedPage() {
  const [search, setSearch] = useState("");
  const results = answers.filter(pair => pair.join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3 p-4"><Logo /><div className="flex items-center gap-2"><ThemeToggle /><Button asChild variant="outline"><Link href="/welcome">Home</Link></Button></div></div></header>
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-3"><p className="text-sm font-semibold text-primary">ZIBANA GUIDE</p><h1 className="text-3xl font-bold">Help & launch status</h1><p className="text-muted-foreground">Get started, find answers and tell us what needs improving.</p><QuickStartTour /></div>
      <section className="rounded-xl border border-amber-600/40 bg-amber-50 p-5 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" aria-labelledby="launch-title"><h2 id="launch-title" className="font-semibold">Registration open · Bookings not yet open</h2><p className="mt-2 text-sm leading-relaxed">Explore accounts, driver registration and help. Live rides and Keke bookings remain closed while launch approvals and payment checks are completed. Fares are approved; live charging starts only when bookings open.</p></section>
      <section className="space-y-3 rounded-xl border p-5" aria-labelledby="fares-title">
        <h2 id="fares-title" className="text-xl font-semibold">Approved Nigeria fares</h2>
        <p className="text-sm text-muted-foreground">Whole-vehicle private rides in NGN. These rates are approved for launch; bookings and charging are not yet active.</p>
        <div className="grid gap-4 sm:grid-cols-2">{(["keke", "car"] as const).map(category => { const rate = policies[category]; return <div key={category} className="rounded-lg bg-muted p-4"><h3 className="font-semibold">{category === "keke" ? "Keke (tricycle)" : "Standard car"}</h3><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt>Base fare</dt><dd>₦{rate.base.toLocaleString("en-NG")}</dd><dt>Per kilometre</dt><dd>₦{rate.km}</dd><dt>Per minute</dt><dd>₦{rate.minute}</dd><dt>Minimum trip fare</dt><dd>₦{rate.minimum.toLocaleString("en-NG")}</dd><dt>Booking fee</dt><dd>₦{rate.bookingFee}</dd><dt>Commission</dt><dd>{rate.commission * 100}% of trip fare</dd></dl></div>; })}</div>
        <p className="text-sm text-muted-foreground">The booking fee is additional. When paid mapping is used, a mapping service fee of the allocated cost plus 60% will be included in the upfront quote. Free mapping usage adds no mapping fee. A higher cost-covering minimum may apply; the full quote must be shown before confirmation. No accepted quote will be changed. Driver operating costs and provider fees still require local validation.</p>
        <p className="text-xs text-muted-foreground">Tariff version: {NIGERIA_PRICING_VERSION}</p>
      </section>
      <section className="space-y-4" aria-labelledby="questions-title"><h2 id="questions-title" className="text-xl font-semibold">Quick answers</h2><label htmlFor="guide-search" className="block text-sm">Search help topics</label><Input id="guide-search" type="search" placeholder="Try Keke, theme, connection or feedback" value={search} onChange={e => setSearch(e.target.value)} /><p role="status" className="text-sm text-muted-foreground">{results.length} matching topics</p>{results.map(([question, answer]) => <details key={question} className="rounded-lg border p-4"><summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{question}</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p></details>)}{results.length === 0 && <p>No matching topics. Try another word or use the support links below.</p>}</section>
      <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Report an issue or suggest a feature</h2><p className="text-sm text-muted-foreground">Sign in to send and follow up on a private support ticket. Do not use support tickets for emergencies; contact local emergency services directly.</p><div className="flex flex-wrap gap-3"><Button asChild><Link href="/rider/support">Rider support</Link></Button><Button variant="outline" asChild><Link href="/driver/help">Driver help</Link></Button><Button variant="outline" asChild><a href="/api/login">Sign in</a></Button></div></section>
      <footer className="flex flex-wrap gap-4 border-t pt-4 text-sm"><Link href="/privacy" className="underline">Privacy</Link><Link href="/terms" className="underline">Terms</Link><Link href="/safety" className="underline">Safety</Link></footer>
    </main>
  </div>;
}
