import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, FileText, Shield } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

export default function DriverTermsPrivacy() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/account")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Terms & Privacy</h1>
        </div>

        <Tabs defaultValue="terms">
          <TabsList className="w-full">
            <TabsTrigger value="terms" className="flex-1 gap-2" data-testid="tab-terms">
              <FileText className="h-4 w-4" />
              Terms of Service
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 gap-2" data-testid="tab-privacy">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms of Service</CardTitle>
                <p className="text-xs text-muted-foreground">Last updated: February 2026</p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed">
                <section data-testid="section-terms-acceptance">
                  <h3 className="font-semibold mb-1">1. Acceptance of Terms</h3>
                  <p className="text-muted-foreground">
                    By accessing or using the ZIBA Driver platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms govern your use of the ZIBA platform as a driver partner.
                  </p>
                </section>
                <section data-testid="section-terms-service">
                  <h3 className="font-semibold mb-1">2. Service Description</h3>
                  <p className="text-muted-foreground">
                    ZIBA provides a technology platform connecting independent drivers with riders seeking transportation. As a driver, you operate as an independent contractor, not an employee of ZIBA. You are responsible for providing transportation services to riders matched through the platform.
                  </p>
                </section>
                <section data-testid="section-terms-responsibilities">
                  <h3 className="font-semibold mb-1">3. Driver Responsibilities</h3>
                  <p className="text-muted-foreground">
                    You must maintain a valid driver's license, vehicle registration, and insurance at all times. You agree to treat riders with respect, follow all traffic laws, and maintain your vehicle in safe operating condition. You must not operate the platform while impaired.
                  </p>
                </section>
                <section data-testid="section-terms-earnings">
                  <h3 className="font-semibold mb-1">4. Earnings & Payouts</h3>
                  <p className="text-muted-foreground">
                    Earnings are calculated based on completed trips, including base fare, distance, and time components. ZIBA retains a service fee from each trip. Payouts are processed according to the schedule set by your regional director. You are responsible for your own tax obligations.
                  </p>
                </section>
                <section data-testid="section-terms-vehicle">
                  <h3 className="font-semibold mb-1">5. Vehicle Requirements</h3>
                  <p className="text-muted-foreground">
                    Your vehicle must meet ZIBA's safety and quality standards, including age, condition, and inspection requirements. Vehicle changes must be reported and approved by your regional director before you can continue accepting rides.
                  </p>
                </section>
                <section data-testid="section-terms-safety">
                  <h3 className="font-semibold mb-1">6. Safety</h3>
                  <p className="text-muted-foreground">
                    Safety is paramount. You must verify rider identity using ride PINs when required, report any incidents immediately through the app, and cooperate with any safety investigations. ZIBA provides in-app emergency features for your protection.
                  </p>
                </section>
                <section data-testid="section-terms-liability">
                  <h3 className="font-semibold mb-1">7. Limitation of Liability</h3>
                  <p className="text-muted-foreground">
                    ZIBA acts as a technology platform and is not a transportation provider. To the maximum extent permitted by law, ZIBA is not liable for incidents during rides. As an independent contractor, you are responsible for your own insurance and liability coverage.
                  </p>
                </section>
                <section data-testid="section-terms-modifications">
                  <h3 className="font-semibold mb-1">8. Modifications</h3>
                  <p className="text-muted-foreground">
                    ZIBA reserves the right to update these terms at any time. You will be notified of material changes. Continued use of the platform after changes constitutes acceptance of the updated terms.
                  </p>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Privacy Policy</CardTitle>
                <p className="text-xs text-muted-foreground">Last updated: February 2026</p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed">
                <section data-testid="section-privacy-collected">
                  <h3 className="font-semibold mb-1">1. Information We Collect</h3>
                  <p className="text-muted-foreground">
                    We collect information you provide directly, including your name, email, phone number, driver's license details, vehicle information, and bank account details. We also collect real-time location data, trip data, driving behavior metrics, and device information to provide and improve our services.
                  </p>
                </section>
                <section data-testid="section-privacy-usage">
                  <h3 className="font-semibold mb-1">2. How We Use Your Information</h3>
                  <p className="text-muted-foreground">
                    Your information is used to match you with riders, calculate fares and earnings, process payouts, monitor safety and driving quality, and communicate with you. We may also use data for fraud prevention, dispute resolution, and to comply with legal obligations.
                  </p>
                </section>
                <section data-testid="section-privacy-sharing">
                  <h3 className="font-semibold mb-1">3. Information Sharing</h3>
                  <p className="text-muted-foreground">
                    We share limited information with riders to facilitate trips, including your first name, vehicle details, profile photo, and real-time location during active rides. We share performance data with your regional director. We do not sell your personal data to third parties.
                  </p>
                </section>
                <section data-testid="section-privacy-security">
                  <h3 className="font-semibold mb-1">4. Data Security</h3>
                  <p className="text-muted-foreground">
                    We implement industry-standard security measures to protect your data. All data transmission is encrypted, and access to personal information is restricted to authorized personnel only. Financial data is handled in compliance with applicable regulations.
                  </p>
                </section>
                <section data-testid="section-privacy-retention">
                  <h3 className="font-semibold mb-1">5. Data Retention</h3>
                  <p className="text-muted-foreground">
                    We retain your data for as long as your driver account is active or as needed to provide services. Trip records and financial data may be retained longer for tax and regulatory compliance. You can request deletion of your account and associated data at any time.
                  </p>
                </section>
                <section data-testid="section-privacy-rights">
                  <h3 className="font-semibold mb-1">6. Driver Rights</h3>
                  <p className="text-muted-foreground">
                    You have the right to access, correct, or delete your personal data. You can manage your notification preferences and data sharing settings through the app. You may request a copy of all data we hold about you at any time.
                  </p>
                </section>
                <section data-testid="section-privacy-cookies">
                  <h3 className="font-semibold mb-1">7. Cookies & Tracking</h3>
                  <p className="text-muted-foreground">
                    We use session cookies and analytics to improve your experience. Location tracking is essential for ride matching and navigation. You can manage cookie preferences through your browser settings.
                  </p>
                </section>
                <section data-testid="section-privacy-contact">
                  <h3 className="font-semibold mb-1">8. Contact Us</h3>
                  <p className="text-muted-foreground">
                    For privacy inquiries, please contact our support team through the Help Center or email us at privacy@ziba.app. We aim to respond to all privacy requests within 30 days.
                  </p>
                </section>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
