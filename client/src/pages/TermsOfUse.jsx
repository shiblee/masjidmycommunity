import React from "react";
import LegalDocument from "../components/LegalDocument.jsx";

const sections = [
  {
    id: "acceptance",
    number: "01",
    title: "Acceptance of Terms",
    body: [
      "By accessing or using Masjid My Community (\"the Platform\"), including browsing campaigns, registering a masjid, or making a donation, you agree to be bound by these Terms of Use. If you do not agree, please do not use the Platform.",
      "These Terms apply to all visitors, donors, masjid administrators, and committee members who use the Platform in any capacity.",
    ],
  },
  {
    id: "service",
    number: "02",
    title: "Description of Service",
    body: [
      "Masjid My Community is a crowdfunding platform that connects verified masjids with donors who wish to fund construction, renovation, education, and community programs.",
      "We facilitate the collection and transfer of donations to registered masjid campaigns. We are not a bank, charity, or religious authority, and we do not independently verify the religious status of any fund type a donor selects.",
    ],
  },
  {
    id: "eligibility",
    number: "03",
    title: "Eligibility",
    body: [
      "You must be at least 18 years old, or the age of majority in your jurisdiction, to make a donation or register a masjid on the Platform.",
      "Masjid administrators registering a campaign must have the authority to act on behalf of the masjid committee they represent.",
    ],
  },
  {
    id: "registration",
    number: "04",
    title: "Masjid Registration & Verification",
    body: [
      "Masjids seeking to raise funds must complete our registration and verification process, including submitting committee details and supporting documentation.",
      "Masjid My Community reserves the right to approve, reject, suspend, or remove any masjid profile or campaign at its sole discretion, including where information provided is incomplete, inaccurate, or cannot be verified.",
    ],
  },
  {
    id: "donations",
    number: "05",
    title: "Donations",
    body: [
      "Donations made through the Platform are voluntary and, except where required by law or in cases of processing error, non-refundable once a campaign has received funds.",
      "Where you tag a donation as Zakat or Sadaqah, that designation is provided for your own record-keeping. You are responsible for determining whether a particular contribution satisfies your religious obligations; Masjid My Community does not provide religious rulings.",
      "Funds are held until campaign milestones are verified and are then released to the masjid, accompanied by an itemized expense report published on the campaign page.",
    ],
  },
  {
    id: "conduct",
    number: "06",
    title: "Prohibited Conduct",
    body: [
      "You agree not to: provide false or misleading information in a campaign or donor profile; use the Platform for any unlawful purpose; attempt to circumvent our verification or payment processes; or interfere with the proper functioning of the Platform.",
    ],
  },
  {
    id: "fees",
    number: "07",
    title: "Fees & Payment Processing",
    body: [
      "Donations are processed by third-party, PCI-DSS compliant payment processors. Standard payment processing fees may apply and, where charged, will be disclosed before you complete a donation.",
      "Masjid My Community does not store your full card or bank account details.",
    ],
  },
  {
    id: "ip",
    number: "08",
    title: "Intellectual Property",
    body: [
      "All content on the Platform, including the Masjid My Community name, logo, and design, is the property of Masjid My Community or its licensors. Masjids retain ownership of the photos and text they upload to their own campaigns, and grant Masjid My Community a license to display that content on the Platform.",
    ],
  },
  {
    id: "liability",
    number: "09",
    title: "Disclaimers & Limitation of Liability",
    body: [
      "The Platform is provided \"as is\" without warranties of any kind. Masjid My Community does not guarantee that any campaign will reach its funding goal or that a masjid will use funds exactly as described, though we require expense reporting as a condition of fund release.",
      "To the fullest extent permitted by law, Masjid My Community is not liable for any indirect, incidental, or consequential damages arising from your use of the Platform.",
    ],
  },
  {
    id: "termination",
    number: "10",
    title: "Termination",
    body: [
      "We may suspend or terminate your access to the Platform at any time, with or without notice, for conduct that violates these Terms or is otherwise harmful to other users or the Platform.",
    ],
  },
  {
    id: "law",
    number: "11",
    title: "Governing Law",
    body: [
      "These Terms are governed by the laws of the jurisdiction in which Masjid My Community is registered, without regard to conflict-of-law principles. Any disputes will first be addressed through good-faith negotiation before formal proceedings.",
    ],
  },
  {
    id: "changes",
    number: "12",
    title: "Changes to These Terms",
    body: [
      "We may update these Terms from time to time. Material changes will be reflected by an updated \"Last updated\" date below. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    id: "contact",
    number: "13",
    title: "Contact Us",
    body: [
      "Questions about these Terms can be sent to hello@masjidmycommunity.org, or through the Raise a Concern page for campaign-specific issues.",
    ],
  },
];

function TermsOfUse() {
  return (
    <LegalDocument
      title="Terms of Use"
      updated="January 1, 2026"
      intro="These Terms of Use govern your access to and use of Masjid My Community. Please read them carefully — by using the Platform, you agree to the terms below."
      sections={sections}
    />
  );
}

export default TermsOfUse;
