import React from "react";
import LegalDocument from "../components/LegalDocument.jsx";

const sections = [
  {
    id: "introduction",
    number: "01",
    title: "Introduction",
    body: [
      "This Privacy Policy explains what information Masjid My Community (\"the Platform\") collects when you use it, how we use that information, and the choices available to you.",
      "It applies to donors, masjid administrators and committee members, and anyone else who visits the Platform.",
    ],
  },
  {
    id: "collect",
    number: "02",
    title: "Information We Collect",
    body: [
      "When you donate or create an account, we collect information you provide directly, such as your name, email address, and billing details.",
      "When a masjid registers on the Platform, we additionally collect committee contact details and any verification documents submitted.",
      "We also automatically collect limited technical information — such as browser type, device information, and pages visited — to help us operate, secure, and improve the Platform.",
    ],
  },
  {
    id: "use",
    number: "03",
    title: "How We Use Your Information",
    body: [
      "We use your information to process donations, verify masjid registrations, send receipts and campaign updates, respond to support requests, and keep the Platform secure and reliable.",
      "We do not sell your personal information to third parties.",
    ],
  },
  {
    id: "payments",
    number: "04",
    title: "Donation & Payment Information",
    body: [
      "Payment details are collected and processed by our PCI-DSS compliant payment processors. Masjid My Community does not store your full card or bank account numbers.",
      "Where you tag a contribution as Zakat or Sadaqah, that designation is stored with your donation record so it appears correctly in your giving history.",
    ],
  },
  {
    id: "sharing",
    number: "05",
    title: "Sharing Your Information",
    body: [
      "We share limited donation details — such as amount and date, never your payment credentials — with the masjid receiving funds, so committees can keep accurate records and publish expense reports.",
      "We may also share information with service providers who help us operate the Platform (payment processing, hosting, analytics), and where required to comply with the law.",
    ],
  },
  {
    id: "cookies",
    number: "06",
    title: "Cookies & Similar Technologies",
    body: [
      "We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the Platform is used. See our Cookie Policy for details and how to manage your preferences.",
    ],
  },
  {
    id: "security",
    number: "07",
    title: "Data Security",
    body: [
      "We use industry-standard safeguards, including encryption in transit, to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    id: "retention",
    number: "08",
    title: "Data Retention",
    body: [
      "We retain donation and account records for as long as necessary to meet legal, accounting, and reporting obligations, after which the information is securely deleted or anonymized.",
    ],
  },
  {
    id: "rights",
    number: "09",
    title: "Your Rights & Choices",
    body: [
      "Depending on where you live, you may have the right to access, correct, or request deletion of your personal information, and to opt out of marketing communications at any time.",
      "To exercise any of these rights, contact us using the details below.",
    ],
  },
  {
    id: "children",
    number: "10",
    title: "Children's Privacy",
    body: [
      "The Platform is not directed at children under 13, and we do not knowingly collect personal information from children.",
    ],
  },
  {
    id: "transfers",
    number: "11",
    title: "International Data Transfers",
    body: [
      "Because Masjid My Community connects donors and masjids across many countries, your information may be processed in a country other than your own. We take reasonable steps to protect information transferred internationally.",
    ],
  },
  {
    id: "changes",
    number: "12",
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Material changes will be reflected by an updated \"Last updated\" date below.",
    ],
  },
  {
    id: "contact",
    number: "13",
    title: "Contact Us",
    body: [
      "Questions about this Privacy Policy, or requests relating to your personal information, can be sent to hello@masjidmycommunity.org.",
    ],
  },
];

function PrivacyPolicy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="January 1, 2026"
      intro="This Privacy Policy explains what information Masjid My Community collects, how it's used, and the choices you have. Please read it alongside our Terms of Use."
      sections={sections}
    />
  );
}

export default PrivacyPolicy;
