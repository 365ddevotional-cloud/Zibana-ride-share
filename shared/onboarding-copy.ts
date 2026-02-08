import { type ToneStyle } from "./country-profiles";

export interface OnboardingCopy {
  welcomeHeadline: string;
  welcomeSubtext: string;
  safetyReassurance: string;
  paymentExplanation: string;
  supportReassurance: string;
  ctaText: string;
  ctaSubtext: string;
}

const ONBOARDING_COPY: Record<ToneStyle, OnboardingCopy> = {
  friendly: {
    welcomeHeadline: "Welcome to ZIBA!",
    welcomeSubtext: "Your reliable ride is just a tap away. We're here to get you where you need to go, safely and affordably.",
    safetyReassurance: "Your safety matters to us. Every driver is verified, and our support team is available around the clock to help you.",
    paymentExplanation: "Pay easily with your ZIBA wallet. Add funds and ride without worrying about cash. Simple, fast, and secure.",
    supportReassurance: "Got questions? Our ZIBA Support team is always ready to help. Just tap the support button anytime.",
    ctaText: "Let's Go!",
    ctaSubtext: "Find a nearby driver",
  },
  formal: {
    welcomeHeadline: "Welcome to ZIBA",
    welcomeSubtext: "A reliable transportation platform connecting you with verified driver-partners. Safe, efficient, and professional service.",
    safetyReassurance: "All driver-partners undergo verification. Our platform includes safety features and 24/7 support for your peace of mind.",
    paymentExplanation: "ZIBA uses a secure wallet-based payment system. Fund your wallet to pay for rides seamlessly. All transactions are processed securely.",
    supportReassurance: "Our customer support team is available to assist you. Access help through the in-app support feature at any time.",
    ctaText: "Request a Ride",
    ctaSubtext: "Connect with a verified driver",
  },
  neutral: {
    welcomeHeadline: "Welcome to ZIBA",
    welcomeSubtext: "Connect with trusted drivers for safe, reliable rides. Getting around has never been easier.",
    safetyReassurance: "Safety is a priority. All drivers are verified, and support is available when you need it.",
    paymentExplanation: "Use your ZIBA wallet to pay for rides. Add funds easily and enjoy cashless travel.",
    supportReassurance: "Need help? Reach our support team through the app anytime.",
    ctaText: "Get Started",
    ctaSubtext: "Find a driver near you",
  },
};

const DRIVER_ONBOARDING_COPY: Record<ToneStyle, OnboardingCopy> = {
  friendly: {
    welcomeHeadline: "Drive with ZIBA!",
    welcomeSubtext: "Earn money on your own schedule. Join thousands of drivers making a living with ZIBA.",
    safetyReassurance: "We care about your safety too. Emergency support, incident reporting, and a community that has your back.",
    paymentExplanation: "Keep 80% of every fare. Your earnings go straight to your wallet, and you can cash out anytime.",
    supportReassurance: "Need help on the road? Our driver support team is always just a tap away.",
    ctaText: "Start Driving",
    ctaSubtext: "Get started in minutes",
  },
  formal: {
    welcomeHeadline: "Drive with ZIBA",
    welcomeSubtext: "Join our network of professional driver-partners. Earn on your schedule with competitive compensation.",
    safetyReassurance: "Your safety is supported by our platform's emergency features, incident reporting system, and dedicated driver support team.",
    paymentExplanation: "Earn competitive rates with transparent fee structure. Earnings are deposited to your wallet and available for withdrawal.",
    supportReassurance: "Professional support is available through the driver app. Our team is ready to assist with any concerns.",
    ctaText: "Register Now",
    ctaSubtext: "Complete your driver registration",
  },
  neutral: {
    welcomeHeadline: "Drive with ZIBA",
    welcomeSubtext: "Earn on your schedule. Join verified drivers providing reliable transportation.",
    safetyReassurance: "Safety support includes emergency features, incident reporting, and dedicated driver assistance.",
    paymentExplanation: "Earn competitive rates. Your earnings are tracked in your wallet and available for withdrawal.",
    supportReassurance: "Driver support is available through the app whenever you need assistance.",
    ctaText: "Get Started",
    ctaSubtext: "Begin your driver journey",
  },
};

export function getOnboardingCopy(toneStyle: ToneStyle, role: "rider" | "driver" = "rider"): OnboardingCopy {
  if (role === "driver") {
    return DRIVER_ONBOARDING_COPY[toneStyle] || DRIVER_ONBOARDING_COPY.neutral;
  }
  return ONBOARDING_COPY[toneStyle] || ONBOARDING_COPY.neutral;
}
