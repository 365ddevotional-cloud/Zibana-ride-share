# ZIBANA: Testers Community preparation

Source: user-supplied DartPDF Testers Community feedback. Its successful DartPDF test results do not certify ZIBANA. Apply the relevant usability recommendations to this app; PDF processing and document collaboration suggestions do not apply.

## Changes in this round

- First-use rider and driver tours with Next, Back, Skip, Finish, close and replay. Stored locally by tour version/audience; does not request rides, location or payment.
- Public `/guide` with searchable FAQs, clear launch status, feedback entry points, and tour replay. Linked from welcome and signed-in help.
- System theme is the fresh-device default; existing valid selections are preserved. Invalid/blocked browser storage falls back safely. Guest theme changes do not POST to an authenticated endpoint. Local choices are protected from late server preference responses. Native controls follow the resolved theme.
- Support tickets use the existing authenticated backend. Rider tickets now open details and replies. Driver help offers the same support/feedback channel. Failed loads show retry instead of a false empty state. No-related-trip selection sends null. Ticket creation and replies do not retry automatically, reducing accidental duplication. No tickets are submitted as part of deployment.
- Keyboard access for help categories and ticket lists; named search/support controls; zoom enabled; small-screen dialogs scroll; reduced motion respected.
- Public welcome copy and metadata identify prelaunch status instead of promising immediate bookings or same-day cash-outs.
- Existing code splitting is retained; guide loads separately. No new runtime dependencies, paid integrations, schema changes or fare changes.

## Before external testing

- Exercise a real authorized rider and driver account: sign-in, role restrictions, profile saving, vehicle changes/review, support creation/replies and account deletion.
- Test a signed Android build on physical devices, including back navigation, font scaling, permissions denied, offline/reconnect and reinstall. Browser testing does not replace device testing.
- Check the complete bundled Android build matches the web version; this repository update alone does not publish an AAB to Google Play.
- Verify submitted Play Console Data safety, app access instructions, privacy policy, target audience, and listing match actual behavior. Do not include credentials in the repository.
- Keep live booking, Keke and payment launch gates closed. The separate payment readiness and approved Keke tariff documents remain authoritative for those launch blockers.
- Measure the built app on a low-end Android phone and slow network. Existing large bundle warnings remain a performance follow-up; no claim of universal device compatibility is made.

## Store description draft for this prelaunch build

App name: ZIBANA Ride

Short description:
Explore ZIBANA rider accounts, driver registration, safety tools and support.

Full description:
ZIBANA is preparing a ride-hailing experience for riders and drivers. This preview lets you explore the app and prepare your account while local launch and payment checks are completed. Live ride bookings are currently closed.

GET STARTED WITH CONFIDENCE
- Follow a short rider or driver walkthrough, and replay it whenever you need.
- Find answers in searchable help topics and check launch status.
- Choose Light, Dark or System theme to suit your device.

PREPARE YOUR ACCOUNT
- Set up your rider account or driver profile.
- Nigerian drivers can declare a car or Keke (tricycle) vehicle category.
- Vehicle changes require a fresh review. Registration does not guarantee approval, income or trip availability.

HELP AND FEEDBACK
- Send an account question, bug report or feature suggestion through support tickets after signing in.
- Read replies and follow up in the app.
- Review safety guidance, privacy information and terms.

LAUNCH AVAILABILITY
Ride booking depends on service readiness and local approval. Keke bookings remain closed pending permitted routes and verified payment settlement. Owner-approved tariffs are published, but live charging has not started. Payment and cash-out availability depend on verified provider setup. In an emergency, contact local emergency services directly.

## Feature-focused screenshot plan

Capture only the actual release build using dedicated test accounts; obscure private details. These captions are a plan, not fabricated screenshots or a Play Console upload.

1. Welcome — "Get ready for ZIBANA"; include the prelaunch status.
2. Quick tour — "A clear start for riders and drivers"; show a real tour step.
3. Help & launch status — "Answers when you need them"; show FAQ search.
4. Appearance — "Light, Dark or your device theme"; use real views in both themes.
5. Support & feedback — "Report, follow up, improve"; use a harmless test ticket only after authorized test setup.
6. Driver vehicle category — "Car and Keke registration"; retain the bookings-pending message.

Do not advertise live rides, tested settlement, guaranteed pickup times, earnings, instant payouts or Keke availability in screenshots before those flows are verified. Marketing videos can use the same genuine tour screens with prelaunch status visible; no paid advertising is started.
