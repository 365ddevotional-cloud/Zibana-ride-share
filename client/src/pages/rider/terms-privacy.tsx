import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Shield } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

export default function RiderTermsPrivacy() {
  const [, setLocation] = useLocation();

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-5 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Terms & Privacy</h1>
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
                  <section>
                    <h3 className="font-semibold mb-1">1. Acceptance of Terms</h3>
                    <p className="text-muted-foreground">
                      By accessing or using the ZIBA platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">2. Service Description</h3>
                    <p className="text-muted-foreground">
                      ZIBA provides a ride-hailing platform that connects riders with independent drivers. ZIBA does not provide transportation services directly. Drivers are independent contractors, not employees of ZIBA.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">3. User Accounts</h3>
                    <p className="text-muted-foreground">
                      You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old to use ZIBA services.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">4. Payments & Pricing</h3>
                    <p className="text-muted-foreground">
                      Fares are calculated based on distance, time, and local pricing rules. You agree to pay the displayed fare upon trip completion. ZIBA may charge cancellation fees for rides cancelled after driver acceptance.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">5. Rider Responsibilities</h3>
                    <p className="text-muted-foreground">
                      You must treat drivers with respect, follow local laws, and refrain from any harmful or fraudulent activity. Damage to a driver's vehicle may result in additional charges.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">6. Safety</h3>
                    <p className="text-muted-foreground">
                      ZIBA provides safety features including ride PINs, trip sharing, and emergency contacts. Always verify your driver and vehicle before entering. Use the in-app emergency features if you feel unsafe.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">7. Limitation of Liability</h3>
                    <p className="text-muted-foreground">
                      ZIBA acts as a technology platform connecting riders and drivers. To the maximum extent permitted by law, ZIBA is not liable for incidents during rides, as drivers are independent service providers.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">8. Modifications</h3>
                    <p className="text-muted-foreground">
                      ZIBA reserves the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.
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
                  <section>
                    <h3 className="font-semibold mb-1">1. Information We Collect</h3>
                    <p className="text-muted-foreground">
                      We collect information you provide directly, including your name, email, phone number, and payment details. We also collect trip data, location information, and device data to provide and improve our services.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">2. How We Use Your Information</h3>
                    <p className="text-muted-foreground">
                      Your information is used to provide ride services, process payments, improve safety, and communicate with you. We may also use data for fraud prevention and to comply with legal obligations.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">3. Information Sharing</h3>
                    <p className="text-muted-foreground">
                      We share limited information with drivers to facilitate your ride (such as your name, pickup location, and profile photo). We do not sell your personal data to third parties.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">4. Data Security</h3>
                    <p className="text-muted-foreground">
                      We implement industry-standard security measures to protect your data. All data transmission is encrypted, and access to personal information is restricted to authorized personnel only.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">5. Data Retention</h3>
                    <p className="text-muted-foreground">
                      We retain your data for as long as your account is active or as needed to provide services. You can request deletion of your account and associated data at any time through the app settings.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">6. Your Rights</h3>
                    <p className="text-muted-foreground">
                      You have the right to access, correct, or delete your personal data. You can manage your notification preferences and data sharing settings through the app. Contact us for any privacy-related requests.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1">7. Cookies & Tracking</h3>
                    <p className="text-muted-foreground">
                      We use session cookies and analytics to improve your experience. You can manage cookie preferences through your browser settings.
                    </p>
                  </section>
                  <section>
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
      </RiderLayout>
    </RiderRouteGuard>
  );
}
