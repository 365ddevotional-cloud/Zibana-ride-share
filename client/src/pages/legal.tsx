import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Users, RefreshCw, AlertTriangle, Bot } from "lucide-react";

function getInitialTab(): string {
  const path = window.location.pathname;
  if (path === "/privacy") return "privacy";
  return "terms";
}

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-legal-title">Legal Documents</h1>
          <p className="text-muted-foreground mt-2">Review our terms, policies, and agreements</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="terms" data-testid="tab-terms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Terms</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" data-testid="tab-privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="driver" data-testid="tab-driver" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Driver</span>
            </TabsTrigger>
            <TabsTrigger value="refund" data-testid="tab-refund" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refund</span>
            </TabsTrigger>
            <TabsTrigger value="safety" data-testid="tab-safety" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Safety</span>
            </TabsTrigger>
            <TabsTrigger value="ai-disclosure" data-testid="tab-ai-disclosure" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 text-sm text-foreground" data-testid="content-terms">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">1. Introduction</h3>
                      <p className="text-muted-foreground">
                        Welcome to ZIBANA ("Platform"). These Terms of Service ("Terms") govern your access to and use of our ride-hailing platform, which connects riders with independent driver-partners for transportation services.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">1a. Assumption of Risk</h3>
                      <p className="text-muted-foreground mb-2">
                        By using ZIBANA, all users expressly acknowledge and agree that:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>ZIBANA is a digital technology marketplace, not a transportation provider</li>
                        <li>ZIBANA does not own vehicles, employ drivers, or control trip outcomes</li>
                        <li>All trips are undertaken at the user's own risk</li>
                        <li>ZIBANA does not guarantee the safety, reliability, or conduct of any driver or rider</li>
                        <li>Users are responsible for their own personal safety decisions</li>
                        <li>ZIBANA is not liable for accidents, injuries, assault, robbery, or property damage occurring during or in connection with trips</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. Platform Nature</h3>
                      <p className="text-muted-foreground">
                        ZIBANA operates as a digital marketplace that facilitates connections between riders seeking transportation and independent driver-partners who provide transportation services. ZIBANA does not provide transportation services directly, is not a transportation carrier, does not employ drivers, and does not supervise individual trips. ZIBANA's role is limited to providing the technology platform and associated support services.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Wallet System</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA uses a wallet-based payment system for all transactions:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Wallet balances represent service credits, not stored monetary value</li>
                        <li>Credits are used to pay for rides within the platform</li>
                        <li>ZIBANA is not a bank or financial institution</li>
                        <li>Wallet credits are non-transferable and non-refundable except as stated in our Refund Policy</li>
                        <li>All wallet transactions are final once a ride is completed</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">4. User Responsibilities</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Provide accurate account information</li>
                        <li>Maintain sufficient wallet balance for rides</li>
                        <li>Treat drivers and other users with respect</li>
                        <li>Follow all applicable local laws and regulations</li>
                        <li>Not engage in fraudulent or abusive behavior</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">5. Limitation of Liability</h3>
                      <p className="text-muted-foreground">
                        ZIBANA is not liable for any direct, indirect, incidental, or consequential damages arising from the use of transportation services arranged through the platform. Riders and drivers use the platform at their own risk.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. Account Termination</h3>
                      <p className="text-muted-foreground">
                        ZIBANA reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose safety risks to the community.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">7. Modifications</h3>
                      <p className="text-muted-foreground">
                        ZIBANA may modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the modified Terms.
                      </p>
                    </section>

                    <p className="text-xs text-muted-foreground mt-8">
                      Last updated: January 2026
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 text-sm text-foreground" data-testid="content-privacy">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">1. Information We Collect</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Account information (name, email, phone number)</li>
                        <li>Location data during active trips for navigation and safety</li>
                        <li>Trip history and transaction records</li>
                        <li>Device information and app usage data</li>
                        <li>Camera/photo data for identity verification</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. GPS Tracking</h3>
                      <p className="text-muted-foreground mb-2">
                        We collect and use GPS location data:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>During active trips to track pickup and dropoff locations</li>
                        <li>To calculate accurate fare distances and durations</li>
                        <li>For safety monitoring and emergency response</li>
                        <li>Location tracking is only active during rides, not passively</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Camera Usage</h3>
                      <p className="text-muted-foreground mb-2">
                        Camera access may be requested for:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Driver identity verification (photo matching)</li>
                        <li>Document uploads (license, vehicle registration)</li>
                        <li>Profile photos for safety identification</li>
                        <li>Camera access is only used when explicitly initiated by the user</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">4. Data Retention</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Account data: Retained while account is active plus 3 years</li>
                        <li>Trip history: Retained for 7 years for legal/tax purposes</li>
                        <li>Location data: Retained for 90 days after trip completion</li>
                        <li>Verification photos: Retained for account lifetime plus 1 year</li>
                        <li>Users may request data deletion subject to legal requirements</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">5. Data Sharing</h3>
                      <p className="text-muted-foreground">
                        We share limited data with drivers (name, pickup location) and riders (driver name, vehicle info) only as needed to complete trips. We do not sell personal data to third parties.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. AI-Powered Features</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA uses automated support tools. See the "AI" tab for full disclosure on data handling and limitations.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">7. Your Rights</h3>
                      <p className="text-muted-foreground">
                        You have the right to access, correct, or request deletion of your personal data by contacting our support team. Data deletion requests are processed within 30 days, subject to legal retention requirements.
                      </p>
                    </section>

                    <p className="text-xs text-muted-foreground mt-8">
                      Last updated: January 2026
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="driver">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Driver Partner Agreement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 text-sm text-foreground" data-testid="content-driver">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">1. Independent Contractor Status</h3>
                      <p className="text-muted-foreground">
                        By registering as a driver on ZIBANA, you acknowledge that you are an independent contractor, not an employee of ZIBANA. You control your own schedule, routes, and conduct. ZIBANA does not supervise individual trips. You are responsible for your own taxes, insurance, business expenses, and personal safety decisions.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. Requirements</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Valid driver's license for your jurisdiction</li>
                        <li>Roadworthy vehicle meeting local requirements</li>
                        <li>Valid vehicle insurance</li>
                        <li>Passing background check (where applicable)</li>
                        <li>Identity verification through photo matching</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Wallet Earnings</h3>
                      <p className="text-muted-foreground mb-2">
                        Driver earnings are tracked through the ZIBANA wallet system:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Wallet balances represent service credits for completed trips</li>
                        <li>Credits accumulate as you complete rides</li>
                        <li>ZIBANA deducts a platform commission from each fare</li>
                        <li>Wallet credits are not cash until a payout is processed</li>
                        <li>Earnings are subject to platform fees and applicable taxes</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">4. Payout Processing</h3>
                      <p className="text-muted-foreground mb-2">
                        Payouts are processed based on your wallet balance:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Minimum payout threshold applies</li>
                        <li>Payouts are processed to your registered bank or mobile money account</li>
                        <li>Processing times vary by payment method and region</li>
                        <li>ZIBANA reserves the right to hold payouts pending dispute resolution</li>
                        <li>Fraudulent activity may result in payout suspension</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">5. Driver Responsibilities</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Maintain a safe, clean vehicle</li>
                        <li>Provide professional, courteous service</li>
                        <li>Complete identity verification before each shift</li>
                        <li>Follow all traffic laws and regulations</li>
                        <li>Not discriminate against riders</li>
                        <li>Report any incidents or safety concerns</li>
                        <li>Lost item handling is voluntary and at driver's discretion</li>
                        <li>Unsafe behavior, fraud, or false reports may result in immediate deactivation</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. Termination</h3>
                      <p className="text-muted-foreground">
                        Either party may terminate this agreement at any time. Pending wallet balances will be paid out according to standard processing timelines, minus any applicable fees or chargebacks.
                      </p>
                    </section>

                    <p className="text-xs text-muted-foreground mt-8">
                      Last updated: January 2026
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refund">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Refund & Cancellation Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 text-sm text-foreground" data-testid="content-refund">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">1. Rider Cancellation Rules</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li><strong>Before driver assignment:</strong> Free cancellation, no fee</li>
                        <li><strong>After driver accepts:</strong> Cancellation fee may apply</li>
                        <li><strong>After driver arrives:</strong> Higher cancellation fee applies</li>
                        <li><strong>During ride:</strong> Full fare charged based on distance traveled</li>
                        <li>Repeated cancellations may result in account restrictions</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. Reservation Cancellations</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li><strong>More than 1 hour before pickup:</strong> Full refund of reservation premium</li>
                        <li><strong>Within 1 hour of pickup:</strong> Cancellation fee of $5.00 applies</li>
                        <li><strong>No-show:</strong> Full reservation premium forfeited</li>
                        <li>Drivers who cancel reservations may receive penalties</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Driver Cancellation</h3>
                      <p className="text-muted-foreground mb-2">
                        When drivers cancel:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Riders are not charged for driver cancellations</li>
                        <li>A new driver will be assigned automatically when available</li>
                        <li>Excessive driver cancellations result in account review</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">4. Driver Compensation</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li><strong>Rider no-show:</strong> Drivers receive waiting compensation after grace period</li>
                        <li><strong>Rider cancellation after arrival:</strong> Drivers receive partial compensation</li>
                        <li><strong>Long wait times:</strong> Per-minute waiting fees added to fare</li>
                        <li>Compensation is credited to driver wallet automatically</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">5. Fare Disputes</h3>
                      <p className="text-muted-foreground">
                        If you believe you were charged incorrectly:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Submit a dispute within 7 days of the trip</li>
                        <li>Provide details and any supporting evidence</li>
                        <li>Disputes are reviewed within 5 business days</li>
                        <li>Refunds, if approved, are credited to your wallet</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. Wallet Credit Refunds</h3>
                      <p className="text-muted-foreground">
                        Wallet credits are generally non-refundable. Exceptions may be made for:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Duplicate charges due to technical errors</li>
                        <li>Service unavailability in your area</li>
                        <li>Account closure under specific circumstances</li>
                        <li>Refund requests are reviewed case-by-case</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">7. Contact Support</h3>
                      <p className="text-muted-foreground">
                        For refund requests or cancellation inquiries, contact our support team through the app or at support@zibana.com
                      </p>
                    </section>

                    <p className="text-xs text-muted-foreground mt-8">
                      Last updated: January 2026
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Safety, Lost Items & Accident Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 text-sm text-foreground" data-testid="content-safety">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">1. Lost & Found Policy</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA provides a Lost & Found system to help recover items left in vehicles. Please note:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>ZIBANA is not responsible for items left in vehicles and does not guarantee recovery</li>
                        <li>Riders should report lost items promptly through the app</li>
                        <li>Drivers are encouraged to check vehicles after each trip</li>
                        <li>Communication between rider and driver is facilitated through in-app chat once the driver confirms the item is found</li>
                        <li>Phone numbers are not shared by default to protect privacy</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. Safe Return Hubs</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA facilitates Safe Return Hubs as an optional method for item returns. Hubs are operated by independent partners:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Safe Return Hubs are designated partner locations (stores, fuel stations, service centers) where drivers can drop off found items</li>
                        <li>Using hubs is optional but recommended for safety and convenience</li>
                        <li>Drivers may receive a bonus reward for using Safe Return Hubs</li>
                        <li>Hub service fees may apply and are disclosed before drop-off</li>
                        <li>ZIBANA does not guarantee the security of items at hub locations</li>
                        <li>Safe Return Hubs are independent partner entities, not owned or operated by ZIBANA</li>
                        <li>ZIBANA does not take custody of, inspect, or verify items at any hub location</li>
                        <li>ZIBANA is not liable for loss, damage, theft, or mishandling of items at hub locations</li>
                        <li>Hub operating hours and availability are managed by the hub partner and may change without notice</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Return Fees & Rewards</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Return fees are country-specific and set by ZIBANA</li>
                        <li>Fees are split between driver compensation and platform costs</li>
                        <li>Driver rewards and bonuses are discretionary and may change</li>
                        <li>Tipping drivers for item returns is optional and appreciated</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">4. Fraud & Abuse</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA employs automated fraud detection for the Lost & Found system:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Repeated false claims may result in account suspension</li>
                        <li>False confirmations of found items are prohibited</li>
                        <li>Abuse of the return fee system will lead to penalties</li>
                        <li>Trust scores are impacted by lost item interactions</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">5. Unclaimed Items</h3>
                      <p className="text-muted-foreground">
                        Items that remain unclaimed for 30 days may be disposed of or donated at ZIBANA's discretion. ZIBANA is not liable for unclaimed items after this period.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. Accident Reporting</h3>
                      <p className="text-muted-foreground mb-2">
                        In the event of an accident during a ZIBANA trip:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Both riders and drivers should report the accident through the app immediately</li>
                        <li>Provide photos, descriptions, and injury information</li>
                        <li>Trip payouts may be frozen pending investigation</li>
                        <li>ZIBANA will coordinate with relevant authorities as needed</li>
                        <li>Emergency services should be contacted directly for serious incidents</li>
                        <li>Reports are for documentation and assistance only and do not imply fault, liability, or compensation</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">7. Driver Accident Relief Fund</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA maintains a Driver Accident Relief Fund to support drivers:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>The fund provides financial assistance for verified accidents</li>
                        <li>Claims are reviewed by ZIBANA administrators</li>
                        <li>Payouts are based on fault determination and accident severity</li>
                        <li>A minimum trust score may be required for eligibility</li>
                        <li>Abuse of the relief fund will result in account termination</li>
                        <li>The relief fund is a discretionary goodwill program and not an insurance product or entitlement</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">8. Liability Limitation</h3>
                      <p className="text-muted-foreground">
                        ZIBANA acts as a technology platform connecting riders and drivers. ZIBANA is not liable for personal injuries, property damage, or lost items arising from the use of transportation services. All users are encouraged to maintain appropriate personal insurance.
                      </p>
                    </section>

                    <p className="text-xs text-muted-foreground mt-8">
                      Last updated: February 2026
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai-disclosure">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI-Generated Content Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 text-sm text-foreground" data-testid="content-ai-disclosure">
                    <section>
                      <h3 className="font-semibold text-lg mb-2">1. AI-Powered Support (ZIBANA Support)</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA uses an AI-powered support system ("ZIBANA Support") to provide automated assistance to users. This system uses pattern-matching and structured templates to respond to common questions and issues.
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>ZIBANA Support is not a human agent. It uses pre-defined templates to assist users.</li>
                        <li>Responses are generated based on your question, your role on the platform, and your current screen context.</li>
                        <li>ZIBANA Support does not use generative AI, large language models, or deep learning to produce responses.</li>
                        <li>No user conversations with ZIBANA Support are used to train AI models.</li>
                        <li>You may escalate any conversation to a human support agent at any time.</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. Data Collected by AI Support</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Your messages to ZIBANA Support are logged for quality assurance and improvement purposes.</li>
                        <li>Conversation metadata (role, screen context, timestamp) is recorded.</li>
                        <li>Escalated conversations are forwarded to human agents along with the conversation transcript.</li>
                        <li>Support interaction logs may be reviewed by authorized administrators.</li>
                        <li>You may request deletion of your support conversation history by contacting our team.</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Limitations of AI Support</h3>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>ZIBANA Support provides informational guidance only and does not make binding commitments.</li>
                        <li>Responses may not cover every situation. For complex issues, escalate to a human agent.</li>
                        <li>ZIBANA Support cannot process payments, modify accounts, or take actions on your behalf.</li>
                        <li>Information provided by ZIBANA Support is advisory and should not be relied upon as legal, financial, or safety advice.</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">4. Governance & Safety</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBANA maintains governance controls over the AI support system:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Authorized administrators can enable or disable AI support globally or per user role.</li>
                        <li>A safe mode restricts responses to verified FAQ content only.</li>
                        <li>A phrase blacklist prevents certain words or phrases from appearing in responses.</li>
                        <li>All governance changes are logged in an immutable audit trail.</li>
                        <li>Users can always escalate to human support regardless of AI availability.</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">5. Your Consent</h3>
                      <p className="text-muted-foreground">
                        By using ZIBANA Support, you acknowledge that you are interacting with an automated system. You may choose not to use ZIBANA Support and instead contact our human support team directly through the Help Center. Your continued use of ZIBANA Support constitutes acceptance of this disclosure.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. Data Deletion & Account Requests</h3>
                      <p className="text-muted-foreground">
                        You have the right to request deletion of your personal data, including support conversation history. To submit a data deletion request, contact our support team through the Help Center. Data deletion requests will be processed within 30 days, subject to legal retention requirements.
                      </p>
                    </section>

                    <p className="text-xs text-muted-foreground mt-8">
                      Last updated: February 2026
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
