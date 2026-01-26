import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Users, RefreshCw } from "lucide-react";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState("terms");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-legal-title">Legal Documents</h1>
          <p className="text-muted-foreground mt-2">Review our terms, policies, and agreements</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
                        Welcome to ZIBA ("Platform"). These Terms of Service ("Terms") govern your access to and use of our ride-hailing platform, which connects riders with independent driver-partners for transportation services.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">2. Platform Nature</h3>
                      <p className="text-muted-foreground">
                        ZIBA operates as a technology marketplace that facilitates connections between riders seeking transportation and independent driver-partners who provide transportation services. ZIBA does not provide transportation services directly and is not a transportation carrier.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">3. Wallet System</h3>
                      <p className="text-muted-foreground mb-2">
                        ZIBA uses a wallet-based payment system for all transactions:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Wallet balances represent service credits, not stored monetary value</li>
                        <li>Credits are used to pay for rides within the platform</li>
                        <li>ZIBA is not a bank or financial institution</li>
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
                        ZIBA is not liable for any direct, indirect, incidental, or consequential damages arising from the use of transportation services arranged through the platform. Riders and drivers use the platform at their own risk.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">6. Account Termination</h3>
                      <p className="text-muted-foreground">
                        ZIBA reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose safety risks to the community.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg mb-2">7. Modifications</h3>
                      <p className="text-muted-foreground">
                        ZIBA may modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the modified Terms.
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
                      <h3 className="font-semibold text-lg mb-2">6. Your Rights</h3>
                      <p className="text-muted-foreground">
                        You have the right to access, correct, or request deletion of your personal data by contacting our support team.
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
                        By registering as a driver on ZIBA, you acknowledge that you are an independent contractor, not an employee of ZIBA. You are responsible for your own taxes, insurance, and business expenses.
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
                        Driver earnings are tracked through the ZIBA wallet system:
                      </p>
                      <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                        <li>Wallet balances represent service credits for completed trips</li>
                        <li>Credits accumulate as you complete rides</li>
                        <li>ZIBA deducts a platform commission from each fare</li>
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
                        <li>ZIBA reserves the right to hold payouts pending dispute resolution</li>
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
                        For refund requests or cancellation inquiries, contact our support team through the app or at support@ziba.com
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
        </Tabs>
      </div>
    </div>
  );
}
