import Link from "next/link";

export default function MechanicNotFound() {
  return (
    <main className="page-shell profile-shell">
      <section className="profile-card">
        <p className="eyebrow">Mechanic profile</p>
        <h1>Mechanic profile not found.</h1>
        <p className="intro">This provider is not available in the public MechanicMatchFL directory.</p>
        <Link className="secondary-action standalone-link" href="/">
          Back to Search
        </Link>
      </section>
    </main>
  );
}
