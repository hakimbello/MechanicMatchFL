import type { PublicLocale } from "../../src/i18n/locale.ts";
import { getPrivacyContent } from "../../src/i18n/privacy.ts";

export function LocalizedPrivacy({ locale }: { locale: PublicLocale }) {
  const content = getPrivacyContent(locale);
  return <main className="page-shell privacy-page">
    <section className="profile-card"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="intro">{content.intro}</p></section>
    {content.sections.map((section) => <section className="profile-card" key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
  </main>;
}
