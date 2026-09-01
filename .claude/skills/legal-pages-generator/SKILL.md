---
name: legal-pages-generator
description: Drafts non-binding, section-by-section first-draft frameworks for Privacy Policy, Terms of Service, Cookie Policy, and Refund/Cancellation Policy pages intended for legal counsel review, flagging India DPDP Act 2023 and GDPR considerations throughout while explicitly avoiding legal advice, compliance claims, or fabricated obligations.
when_to_use: Use whenever a user needs a structured first-draft legal page (Privacy Policy, Terms of Service, Cookie Policy, or Refund/Cancellation Policy) for a website or SaaS product that will subsequently be reviewed, customized, and approved by qualified legal counsel.
---

# Legal Pages Generator

## 1. Mission

This skill produces **structured legal-document drafting frameworks** — not final legal documents. It exists to accelerate the work of legal counsel by generating comprehensive, section-complete, well-organized first drafts of the four core SaaS legal pages, with visible jurisdiction-specific review prompts for India's Digital Personal Data Protection Act, 2023 ("DPDP Act") and the EU General Data Protection Regulation ("GDPR").

The skill:
- Structures legal pages into complete, standard section sets
- Organizes and sequences required content logically
- Identifies gaps and missing compliance considerations
- Flags jurisdiction-specific issues for counsel (without resolving them)
- Produces plain-English, readable, implementation-ready drafts
- Improves consistency across a company's legal page suite
- Supports a clean handoff to legal review workflows

The skill **must never**:
- Give legal advice or legal opinions
- Claim or imply compliance with any law or regulation
- Replace qualified legal counsel
- Make definitive legal interpretations ("this satisfies GDPR," "this is legally required")
- Fabricate legal obligations, statutes, or case law
- Guarantee enforceability of any clause
- Invent company-specific facts (addresses, retention periods, vendors, jurisdictions)

Every single output, regardless of format or length, must visibly and repeatedly reinforce that it is a **drafting framework requiring professional legal review** before publication or use.

---

## 2. Mandatory Legal Notice

Insert this notice at the top of every generated document (full-page mode) and reference it in every other output mode:

> **⚠️ Drafting Framework — Not Legal Advice**
> This document is a structured first-draft framework generated to accelerate legal documentation work. It is **not legal advice**, does not create an attorney-client relationship, does not guarantee legal compliance, and must not be published, relied upon, or treated as final until reviewed, revised, and approved by qualified legal counsel familiar with the organization's specific facts and applicable jurisdictions.

Never remove, shorten to the point of losing meaning, or omit this notice.

---

## 3. Plain-Language Summary Convention

Every full legal page begins with a clearly marked, visually distinct, **non-binding** summary box. Use this exact structure:

```markdown
### 📋 Plain-Language Summary (Informational Only — Not Part of the Legal Agreement)

**Purpose:** [One-sentence description of what this document governs]
**Who this applies to:** [Audience — e.g., visitors, registered users, academy admins, coaches]
**Key points:**
- [Point 1]
- [Point 2]
- [Point 3]
**Your key rights:** [Short summary of the most relevant rights]
**Effective date:** [Date]

*This summary is provided for convenience only and has no legal effect. In the event of any conflict or ambiguity, the full policy text below governs.*
```

Rules:
- Never let the summary contradict or narrow the full text.
- Never present the summary as sufficient on its own.
- Keep it to 5–8 lines maximum — brevity is the point.

---

## 4. Document Control & Version History

Every generated document must carry a document-control block, placed directly after the summary box:

```markdown
### 📜 Document Control

| Field | Value |
|---|---|
| Effective Date | [Date] |
| Last Updated | [Date] |
| Version | 0.1 (Draft) |
| Approval Status | Draft — Pending Legal Review |
| Legal Review Status | Pending |

#### Revision History

| Version | Date | Author | Change Summary | Legal Review Status |
|---|---|---|---|---|
| 0.1 | [Date] | AI-Generated Draft | Initial framework | Pending |
```

Every subsequent revision must append a new row rather than overwrite history. Never mark "Approval Status" or "Legal Review Status" as anything other than pending/draft unless the user explicitly states counsel has approved it.

---

## 5. Review Flag System

Review flags are **prompts for counsel**, never conclusions. Use this exact two-part convention: the flag itself, plus specific, answerable questions counsel can act on. Vague flags ("review this for DPDP") are a quality failure — flags must name the specific statutory concept and ask a concrete question.

### 5.1 DPDP Review Flag Format

```markdown
> **🔍 DPDP Review Flag — [Topic]**
> [One-sentence description of the relevant DPDP Act concept, stated neutrally, not as a legal conclusion.]
> **Questions for counsel:**
> - [Specific, answerable question 1]
> - [Specific, answerable question 2]
```

Trigger this flag at minimum for: notice requirements, consent validity (free/specific/informed/unconditional/unambiguous), legitimate uses under the Act, children's/minors' data and verifiable parental consent, Grievance Officer designation and process, consent withdrawal mechanics, Data Fiduciary responsibilities, Significant Data Fiduciary thresholds (DPIA, audits, data protection officer), retention limitation, breach notification obligations, and cross-border transfer restrictions/government notifications.

### 5.2 GDPR Review Flag Format

```markdown
> **🇪🇺 GDPR Review Flag — [Topic]**
> [One-sentence description of the relevant GDPR concept, stated neutrally.]
> **Questions for counsel:**
> - [Specific, answerable question 1]
> - [Specific, answerable question 2]
```

Trigger this flag at minimum for: Article 6 lawful basis per processing purpose, controller identification (Art. 13/14 disclosures), processor/subprocessor relationships and DPAs, legitimate interests balancing assessments, international transfer mechanisms (SCCs, adequacy decisions), the full Article 12–22 data subject rights set, DPO requirement under Art. 37–39, consent records and withdrawal mechanics, profiling/automated decision-making, and records of processing (Art. 30).

Never merge DPDP and GDPR flags into one — they are separate legal regimes with separate obligations, and conflating them is a listed failure mode.

---

## 6. Placeholder & Assumption Discipline

**Rule: when a fact is unknown, insert a placeholder. Never invent it.** This applies even when a plausible-sounding value would make the draft look more "finished" — a fabricated retention period or jurisdiction is worse than a visible gap, because it can silently become a false compliance claim.

Standard placeholder vocabulary (use consistently across all four documents):

[Company Name] [Registered Address] [Support Email]
[Grievance Officer] [Data Protection Officer] [Retention Period]
[Payment Provider] [Analytics Provider] [Third-Party Services]
[Subprocessors] [Applicable Jurisdiction] [Governing Law / Courts]
[Effective Date] [Age Threshold] [Cancellation Notice Period]

When a placeholder is filled with an assumption for illustrative purposes (e.g., in a worked example), explicitly label it:

```markdown
> **Assumption:** [value] — illustrative only; confirm with the business before use.
```

---

## 7. Section Architecture by Document

For each document, generate every listed section unless the user explicitly narrows scope. Each row below is a required section; apply DPDP/GDPR flags per §5 wherever the "Flag" column indicates.

### 7.1 Privacy Policy

| Section | Drafting Notes | Flag |
|---|---|---|
| Scope & Introduction | Define products/services covered and excluded | DPDP (notice), GDPR (controller ID) |
| Definitions | Personal data, sensitive personal data, processing, controller/fiduciary, data subject/principal | — |
| Information Collected | Split: provided directly / collected automatically / from third parties | DPDP, GDPR |
| Sensitive Personal Data | Framework only; never assume categories collected | DPDP, GDPR (Art. 9) |
| Children's Data | Age threshold, parental consent mechanics | DPDP (Sec. 9), GDPR (Art. 8) |
| Purpose of Processing | List purposes as specific, not generic ("business purposes" is a failure) | DPDP |
| Lawful Basis | Never assert one; ask counsel to confirm per purpose | GDPR (Art. 6) |
| Consent & Withdrawal | Mechanics of giving/withdrawing consent | DPDP, GDPR |
| Legitimate Interests | Only as a flagged placeholder, never asserted | GDPR (Art. 6(1)(f)) |
| Data Sharing | Categories of recipients (service providers, advisors, authorities, business transfers) | DPDP, GDPR (processor relationships) |
| Subprocessors | Table: name / purpose / location / data type; placeholder-only | GDPR (Art. 28) |
| International Transfers | Transfer mechanism placeholders (SCCs, adequacy) | DPDP (cross-border), GDPR (Ch. V) |
| Retention | Placeholder periods per data category; never invent numbers | DPDP, GDPR (storage limitation) |
| Security | Technical + organizational measures, described generically | DPDP (Sec. 8), GDPR (Art. 32) |
| Cookies & Analytics | Cross-reference the Cookie Policy; do not duplicate detail | — |
| Payment Providers | Placeholder only | — |
| Communications | Transactional vs. marketing, opt-out mechanics | — |
| User Rights | Access, correction, erasure, restriction, objection, portability, complaint | DPDP (Sec. 12–14), GDPR (Art. 12–22) |
| Grievance Mechanism | Officer contact + process + timelines | DPDP (Sec. 13) |
| Contact Details | Placeholder block | — |
| Policy Updates | Notification method for material changes | DPDP, GDPR |
| Governing Law | Placeholder | DPDP, GDPR |
| Effective Date / Last Updated | Document control block | — |

### 7.2 Terms of Service

| Section | Drafting Notes | Flag |
|---|---|---|
| Acceptance | Binding mechanics, update notice | — |
| Eligibility | Age minimum; entity authority to contract | DPDP (children) |
| Account Creation & Security | Accuracy obligation, credential responsibility | — |
| Acceptable Use / Prohibited Conduct | List categories, never invent specific prohibited acts beyond generic categories | — |
| Subscriptions, Pricing & Billing | Plans, currency, tax handling — placeholders for actual figures | — |
| Renewals & Cancellations | Auto-renewal mechanics, notice period placeholder | — |
| Intellectual Property | Company IP, limited license grant, restrictions | — |
| Customer Content / UGC | Ownership retained by customer; license granted to operate service | DPDP (fiduciary responsibility if content includes personal data) |
| APIs & Integrations | Usage terms, rate limits, third-party responsibility disclaimer | — |
| Third-Party Services | Non-liability for third-party acts | — |
| Disclaimers | "AS IS" language, no warranty of uninterrupted/error-free service | — |
| Limitation of Liability | Cap placeholder; carve-outs for fraud/death/injury flagged for counsel | — |
| Indemnification | Framework only | — |
| Suspension & Termination | Grounds, notice, effect on data | — |
| Governing Law & Dispute Resolution | Placeholder; note arbitration vs. courts as an open decision | — |
| Notices & Contact | Placeholder block | — |

### 7.3 Cookie Policy

| Section | Drafting Notes | Flag |
|---|---|---|
| Overview & Definitions | What a cookie/similar technology is | — |
| Cookie Categories | Strictly necessary, analytics, marketing, preference, security/functional | GDPR (consent per category) |
| Cookie Table | Name / purpose / duration / category — placeholder rows | — |
| Third-Party Cookies | Named-provider placeholders | GDPR (processor disclosure) |
| Duration | Session vs. persistent, placeholder lifespans | — |
| Browser Controls | Generic instructions, not product-specific claims | — |
| Consent Management & Banner Interaction | Describe how banner choices map to categories; cross-reference `cookie-consent-privacy-banner-specialist` | DPDP (consent), GDPR (consent) |
| Withdrawal of Consent | Mechanics and effect | — |
| Updates | Notification method | — |

### 7.4 Refund & Cancellation Policy

| Section | Drafting Notes | Flag |
|---|---|---|
| Subscriptions & Billing Cycle | Plan/cycle placeholders | — |
| Cancellation Process & Effective Date | Where/how to cancel; effect timing | — |
| Refund Eligibility | Conditions, placeholder windows | — |
| Non-Refundable Fees | Categories, not fabricated numbers | — |
| Exceptional Cases | Framework for discretionary refunds | — |
| Failed Payments | Retry/grace-period placeholders | — |
| Upgrades / Downgrades | Proration handling placeholder | — |
| Taxes | Statement that taxes are additional unless stated | — |
| Support & Contact | Placeholder block | — |
| Revisions | Version history reference | — |

---

## 8. Legal Review Handoff (Mandatory Closing Section)

Every draft — in every output mode except "outline only" — ends with this section:

```markdown
---
## ⚖️ Legal Review & Handoff

### Outstanding Questions for Counsel
- [Question requiring a legal judgment call]
- [Question requiring confirmation of a business fact]

### Organization-Specific Placeholders to Resolve
- [ ] [Company Name]
- [ ] [Registered Address]
- [ ] [Grievance Officer / DPO contact]
- [ ] [Retention periods]
- [ ] [Subprocessor list]
- [ ] [Applicable jurisdiction / governing law]

### Jurisdiction Review
- [ ] India — DPDP Act 2023
- [ ] EU/EEA/UK — GDPR
- [ ] [Other jurisdictions the business operates in]

### Counsel Review Checklist
- [ ] Lawful basis confirmed per processing purpose
- [ ] Retention periods validated against statutory/tax requirements
- [ ] Liability cap and carve-outs reviewed for enforceability
- [ ] Cross-border transfer mechanism confirmed
- [ ] Grievance/DPO contact details finalized
- [ ] Consistency checked against the other three legal pages

### Pending Legal Decisions & Risk Areas
- [Decision or risk item 1]

### Implementation Checklist (Product/Engineering)
- [ ] Placeholder values replaced across all published pages
- [ ] Cookie banner categories match Cookie Policy
- [ ] Footer links updated (see `footer-navigation-architect`)
- [ ] Data-subject request handling (access/erasure/export) implemented

### Sign-Off
| Role | Name | Date |
|---|---|---|
| Drafted by | AI-generated framework | [Date] |
| Legal Counsel | [Name] | |
| Business Owner | [Name] | |
```

---

## 9. Output Format Modes

Select the mode based on what the user asks for; default to **Full Legal Page** if unspecified.

| Mode | Description |
|---|---|
| Full legal page | Complete draft: summary box, document control, all sections with flags, handoff section |
| Outline only | Headings and one-line descriptions per section, with flags noted inline — no full prose |
| Annotated draft | Full prose plus inline drafting-rationale comments explaining *why* a clause/section exists |
| Developer handoff | Focused on implementation surface: what needs a UI, an API endpoint, or a data flow (e.g., export/delete request handling, cookie banner category mapping) |
| Legal review draft | Maximizes visible flags and open questions; minimizes narrative — built for fast counsel scanning |
| Marketing website version | Simplified, reader-friendly phrasing suitable for public display; summary box emphasized |
| SaaS documentation version | Markdown formatted for a docs/help-center platform, with anchors and cross-links between the four pages |

---

## 10. Workflow: Step-by-Step Generation Process

1. Identify which document(s) are requested and the target jurisdictions (default: India + note GDPR applicability as a flag if the business may have EU users).
2. Gather available business facts from context; for everything else, insert placeholders per §6 — do not ask the user to fill every gap before drafting unless the request is fundamentally ambiguous.
3. Draft the summary box (§3) and document control block (§4).
4. Draft each required section from the relevant table in §7, inserting DPDP/GDPR review flags per §5 wherever a section touches a flagged concept.
5. Cross-check terminology consistency (e.g., "User" vs. "Customer" vs. "Data Principal") across all sections and across documents if multiple are generated in the same session.
6. Append the Legal Review Handoff (§8).
7. Run the Quality Checklist (§11) before delivering.
8. If the request implies related work (cookie banner UX, footer placement, deeper regulatory analysis), note the relevant related skill per §13 rather than attempting that work here.

---

## 11. Quality Assurance Checklist

Before delivering any output, verify:

- [ ] Mandatory legal notice present and unaltered in meaning
- [ ] Plain-language summary box present (full-page and marketing modes)
- [ ] Document control block with version/revision history present
- [ ] Every required section from the relevant §7 table is present
- [ ] All missing facts are placeholders, never invented values
- [ ] DPDP and GDPR flags appear wherever §5 requires them, each with concrete questions
- [ ] No sentence claims or implies compliance, enforceability, or legal sufficiency
- [ ] Terminology is consistent throughout
- [ ] Plain English used; legalese minimized without losing precision
- [ ] Legal Review Handoff section present and complete
- [ ] Cross-references to related skills included where relevant

---

## 12. Failure Prevention — Common Mistakes

Never do the following:
- State or imply that a document "complies with" DPDP, GDPR, or any law
- Give a definitive legal interpretation ("this clause is enforceable in India")
- Invent company facts: name, address, retention period, vendor names, jurisdiction
- Omit required sections from §7 to save space
- Skip review flags because a section "seems standard"
- Use absolute legal language ("guarantee," "always enforceable," "fully compliant")
- Draw jurisdiction-specific legal conclusions instead of flagging for counsel
- Conflate DPDP Act concepts with GDPR concepts, or use one flag type for the other's trigger
- Copy generic boilerplate verbatim without adapting structure to the business context
- Present the plain-language summary as legally sufficient on its own
- Mark "Approval Status" or "Legal Review Status" as anything but pending without explicit confirmation

---

## 13. Cross-Skill Coordination

- **`regulatory-compliance-checker`** — recommend when the user needs a deeper compliance-gap assessment of a specific feature, data flow, or workflow rather than page drafting itself. This skill drafts the page framework; that skill validates specific implementation compliance.
- **`cookie-consent-privacy-banner-specialist`** — recommend when the user needs the actual banner UX, consent-category mapping, or technical consent-management implementation referenced in the Cookie Policy's "Consent Management" section.
- **`footer-navigation-architect`** — recommend when the user needs these legal pages properly linked and positioned in site navigation/footer structure.

Mention these proactively at the end of a draft when the draft references functionality (a cookie banner, a data-export feature, footer placement) that falls outside this skill's scope.

---

## 14. Reference Environment & Worked Examples

Illustrative context (India-first B2B SaaS, arts/sports academy management platform; React Native Expo PWA, Next.js, Supabase PostgreSQL + Edge Functions, Vercel). Treat all values below as illustrative placeholders, never as factual commitments.

**Summary box example:**
```markdown
> ### 📋 Plain-Language Summary (Informational Only)
> **Purpose:** Explains how [Company Name] collects and uses data to help you run your arts/sports academy.
> **Who this applies to:** Academy administrators, instructors, students, and parents using the platform.
> **Key points:** We collect student and attendance records to power scheduling and fee tracking; data is stored with [Cloud/Database Provider]; administrators can request export or deletion.
> **Your key rights:** Access, correction, deletion, and grievance escalation, subject to applicable law.
> **Effective date:** [Date]
> *This summary is informational only. The full policy governs.*
```

**DPDP flag example:**
```markdown
> **🔍 DPDP Review Flag — Children's Data**
> The platform may process data belonging to students under 18.
> **Questions for counsel:**
> - What age threshold triggers verifiable parental consent under the Act's final rules?
> - Does the current onboarding flow capture that consent in a verifiable way?
> - Could the volume/nature of children's data processed trigger Significant Data Fiduciary obligations?
```

**GDPR flag example:**
```markdown
> **🇪🇺 GDPR Review Flag — International Transfers**
> Data may be processed or stored outside the EEA if EU users are served.
> **Questions for counsel:**
> - Does GDPR apply given the current and planned user base?
> - If so, what transfer mechanism (SCCs, adequacy) applies to current subprocessors?
```

**Placeholder-handling example (Refund Policy):**
```markdown
To cancel, go to **Settings → Billing → Cancel Subscription**. Cancellations submitted before [Notice Period] of the billing cycle take effect at the end of the current cycle. For manual cancellation, contact [Support Email].
> **Note:** [Notice Period] and [Support Email] require business confirmation before publication.
```

**Version history example:**
```markdown
| Version | Date | Change Summary | Legal Review Status |
|---|---|---|---|
| 0.1 | [Date] | Initial drafting framework | Pending |
```

**Legal Review Handoff snippet:**
```markdown
### Outstanding Questions for Counsel
- Does the liability cap (proposed: 12 months of fees paid) hold up under applicable contract law for a B2B SaaS relationship?
- Should a clause address AI-generated content (e.g., auto-generated schedules/reports) separately?
```

---

## 15. Completion Standard

A successful output from this skill:
- Contains zero fabricated company facts — only placeholders
- Contains zero compliance claims or legal conclusions
- Includes every required section for the requested document(s)
- Includes DPDP and GDPR review flags, each with concrete counsel-facing questions, wherever §5 requires them
- Opens with the plain-language summary and document control block (full-page/marketing modes)
- Closes with the complete Legal Review & Handoff section
- Explicitly and repeatedly states that professional legal review is required before use
