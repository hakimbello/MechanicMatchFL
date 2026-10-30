import Link from "next/link";

export default function SpanishMechanicNotFound() {
  return <main className="page-shell profile-shell"><section className="profile-card"><p className="eyebrow">Perfil del mecánico</p><h1>No se encontró el perfil.</h1><p className="intro">Este proveedor no está disponible en el directorio público de MechanicMatchFL.</p><Link className="secondary-action standalone-link" href="/es">Volver a la búsqueda</Link></section></main>;
}
