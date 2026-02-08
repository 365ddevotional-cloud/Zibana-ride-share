import { type LegalRegion } from "./country-profiles";

export interface LegalModule {
  id: string;
  title: string;
  globalContent: string;
  countryAddendums: Partial<Record<LegalRegion, string>>;
}

export const LEGAL_MODULES: LegalModule[] = [
  {
    id: "platform_role",
    title: "Platform Role Disclaimer",
    globalContent: "ZIBA operates as a digital technology marketplace that facilitates connections between riders and independent driver-partners. ZIBA does not provide transportation services directly, does not employ drivers, does not own vehicles, and does not supervise individual trips. ZIBA's role is limited to providing the technology platform and associated support services.",
    countryAddendums: {
      NG: "In accordance with Nigerian law, ZIBA operates as a technology intermediary. All driver-partners are independent contractors responsible for their own business obligations, including taxation and insurance.",
      SA: "Under South African law, ZIBA operates as an electronic communications service provider. Driver-partners are independent contractors and are responsible for compliance with applicable local transport regulations.",
      KE: "ZIBA operates in compliance with the Kenya Information and Communications Act. Transportation services are provided by independent driver-partners who are responsible for compliance with local transport licensing requirements.",
      UK: "ZIBA is registered as a technology platform in the United Kingdom. All services are provided in accordance with applicable UK consumer protection and data protection laws.",
      US: "ZIBA operates as a transportation network company (TNC) where applicable. Services are subject to federal and state regulations governing TNCs.",
    },
  },
  {
    id: "liability_limitation",
    title: "Limitation of Liability",
    globalContent: "ZIBA is not liable for any direct, indirect, incidental, special, or consequential damages arising from the use of transportation services arranged through the platform. All users use the platform and transportation services at their own risk. ZIBA does not guarantee the safety, reliability, timeliness, or quality of transportation services provided by driver-partners.",
    countryAddendums: {
      NG: "This limitation of liability is enforceable to the fullest extent permitted under Nigerian law. Users acknowledge that ZIBA bears no responsibility for road conditions, vehicle maintenance, or the actions of driver-partners.",
      EU: "This limitation of liability does not affect your statutory rights under applicable EU consumer protection laws. Nothing in these terms excludes or limits liability for death or personal injury caused by negligence.",
      UK: "Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation as required by UK law.",
    },
  },
  {
    id: "lost_item",
    title: "Lost Item Disclaimer",
    globalContent: "ZIBA provides a Lost & Found reporting system as a courtesy service. ZIBA does not guarantee the recovery of any lost items. Item retrieval is at the discretion of the driver-partner. ZIBA is not responsible for the condition, damage, loss, or theft of any items left in vehicles. Users are responsible for their personal belongings at all times.",
    countryAddendums: {},
  },
  {
    id: "accident_safety",
    title: "Accident & Safety Disclaimer",
    globalContent: "In the event of an accident or safety incident during a trip, users should contact local emergency services immediately. ZIBA provides an in-app SOS feature for emergencies. ZIBA is not liable for accidents, injuries, or property damage occurring during trips. All users acknowledge that transportation inherently involves risk.",
    countryAddendums: {
      NG: "Users are encouraged to report incidents to the Nigeria Police Force and relevant authorities. ZIBA cooperates with law enforcement investigations as required by Nigerian law.",
      SA: "In case of accidents, users should contact South African emergency services (10111 for police, 10177 for ambulance). ZIBA cooperates with the South African Police Service and relevant authorities.",
    },
  },
  {
    id: "director_driver_responsibility",
    title: "Director & Driver Responsibility",
    globalContent: "Directors and drivers using the ZIBA platform are independent contractors. Directors are responsible for managing their assigned driver cells in accordance with platform policies. Drivers are responsible for maintaining their vehicles, insurance, and professional conduct. Neither directors nor drivers are employees of ZIBA.",
    countryAddendums: {
      NG: "Directors and drivers must comply with all applicable Nigerian labour and tax regulations as independent contractors.",
    },
  },
  {
    id: "dispute_resolution",
    title: "Dispute Resolution",
    globalContent: "Disputes between users should first be reported through the in-app support system. ZIBA will review disputes and may mediate between parties. ZIBA's decision on dispute outcomes within the platform is final. For disputes not resolved through the platform, users may pursue legal remedies in accordance with applicable laws.",
    countryAddendums: {
      NG: "Unresolved disputes shall be subject to arbitration in Lagos, Nigeria, in accordance with the Arbitration and Conciliation Act.",
      UK: "Users in the UK may also use the European Commission's Online Dispute Resolution platform or contact the relevant ombudsman service.",
      US: "Disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, unless prohibited by applicable state law.",
    },
  },
  {
    id: "governing_law",
    title: "Governing Law",
    globalContent: "These terms are governed by the laws of the jurisdiction in which the services are provided. Users consent to the jurisdiction of the courts in the relevant jurisdiction for the resolution of disputes.",
    countryAddendums: {
      NG: "These terms are governed by the laws of the Federal Republic of Nigeria. The courts of Lagos State shall have exclusive jurisdiction.",
      SA: "These terms are governed by the laws of the Republic of South Africa. The courts of Gauteng Province shall have jurisdiction.",
      KE: "These terms are governed by the laws of the Republic of Kenya. The courts of Nairobi shall have jurisdiction.",
      UK: "These terms are governed by the laws of England and Wales.",
      US: "These terms are governed by the laws of the State of Delaware, without regard to conflict of law provisions.",
      FRANCOPHONE: "Ces conditions sont regies par les lois de la juridiction dans laquelle les services sont fournis.",
    },
  },
];

export function getLegalModules(legalRegion: LegalRegion): Array<{ id: string; title: string; content: string; hasAddendum: boolean }> {
  return LEGAL_MODULES.map((mod) => {
    const addendum = mod.countryAddendums[legalRegion];
    return {
      id: mod.id,
      title: mod.title,
      content: addendum ? `${mod.globalContent}\n\n${addendum}` : mod.globalContent,
      hasAddendum: !!addendum,
    };
  });
}

export function getLegalModule(moduleId: string, legalRegion: LegalRegion): { title: string; content: string; hasAddendum: boolean } | null {
  const mod = LEGAL_MODULES.find((m) => m.id === moduleId);
  if (!mod) return null;
  const addendum = mod.countryAddendums[legalRegion];
  return {
    title: mod.title,
    content: addendum ? `${mod.globalContent}\n\n${addendum}` : mod.globalContent,
    hasAddendum: !!addendum,
  };
}
