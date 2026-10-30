import type { PublicLocale } from "./locale.ts";

type PrivacyContent = { eyebrow: string; title: string; intro: string; sections: Array<{ title: string; paragraphs: string[] }> };

const content: Record<PublicLocale, PrivacyContent> = {
  en: {
    eyebrow: "Privacy", title: "How MechanicMatchFL handles information",
    intro: "This describes the current application. MechanicMatchFL does not sell customer information or operate payments, bookings, quote bidding, subscriptions, or customer accounts.",
    sections: [
      { title: "Public provider information", paragraphs: ["Public profiles contain approved business information for active, non-suspended providers. Private submissions, ownership evidence, internal notes, registration details, administrator records, and moderation history are not public.", "Business names, addresses, service areas, descriptions, experience, and languages may be provider-reported. Provider-authored descriptions are not automatically translated."] },
      { title: "Searches and analytics", paragraphs: ["Search uses the same active-provider, service, vehicle, and geographic rules in English and Spanish.", "Vercel Web Analytics receives limited product events. We do not intentionally send raw ZIP codes, names, emails, phone numbers, vehicle models, free-form messages, or arbitrary query strings to analytics."] },
      { title: "Provider submissions and accounts", paragraphs: ["Provider submissions are validated on the server and stored privately for administrator review. Listings do not become public until authorized approval and activation.", "Ownership claims require an authenticated Supabase user and explicit administrator approval. Public business details are not proof of ownership."] },
      { title: "Customer reviews", paragraphs: ["Reviews collect a 1–5 star rating, written feedback, an optional public name, and a private email. An expiring, single-use link verifies email ownership only, not a purchase or completed service.", "Reviews remain private until verification and administrator approval. Public review data excludes email, tokens, abuse metadata, and moderation notes."] },
      { title: "Provider photos", paragraphs: ["Authenticated users with an approved ownership claim may submit a photo. Original, pending, rejected, and removed images remain private. Only an approved normalized image for an active, non-suspended provider is publicly delivered.", "The application validates content, size, dimensions, and format, strips metadata, and uses opaque storage keys. Private paths and signed URLs are not public."] },
      { title: "Safety reports, disputes, and appeals", paragraphs: ["Safety reports, reporter contact details, disputes, ownership evidence, appeals, and investigation history are confidential by default.", "A negative review, dispute, or report does not automatically suspend or remove a provider. Suspension and reinstatement are administrator-controlled and audited."] }
    ]
  },
  es: {
    eyebrow: "Privacidad", title: "Cómo MechanicMatchFL maneja la información",
    intro: "Esto describe la aplicación actual. MechanicMatchFL no vende información de clientes ni ofrece pagos, reservas, subastas de cotizaciones, suscripciones o cuentas de clientes.",
    sections: [
      { title: "Información pública del proveedor", paragraphs: ["Los perfiles públicos contienen información aprobada de proveedores activos y no suspendidos. Los registros privados, evidencia de propiedad, notas internas, datos administrativos e historial de moderación no son públicos.", "Los nombres comerciales, direcciones, áreas de servicio, descripciones, experiencia e idiomas pueden ser reportados por el proveedor. Las descripciones del proveedor no se traducen automáticamente."] },
      { title: "Búsquedas y analítica", paragraphs: ["La búsqueda usa las mismas reglas de proveedor activo, servicio, vehículo y geografía en inglés y español.", "Vercel Web Analytics recibe eventos limitados. No enviamos intencionalmente códigos postales exactos, nombres, correos, teléfonos, modelos, mensajes libres ni consultas arbitrarias."] },
      { title: "Registros y cuentas de proveedores", paragraphs: ["Los registros se validan en el servidor y se guardan de forma privada para revisión. No se publican hasta su aprobación y activación autorizadas.", "Las reclamaciones de propiedad requieren un usuario autenticado de Supabase y aprobación administrativa explícita. Los datos comerciales públicos no prueban la propiedad."] },
      { title: "Reseñas de clientes", paragraphs: ["Las reseñas incluyen una calificación de 1 a 5, comentario, nombre público opcional y correo privado. Un enlace de un solo uso verifica únicamente la propiedad del correo, no una compra o servicio.", "Las reseñas permanecen privadas hasta la verificación y aprobación. Los datos públicos excluyen correo, tokens, metadatos de abuso y notas de moderación."] },
      { title: "Fotos de proveedores", paragraphs: ["Usuarios autenticados con propiedad aprobada pueden enviar una foto. Los originales y las imágenes pendientes, rechazadas o retiradas permanecen privados. Solo se entrega una imagen normalizada y aprobada de un proveedor activo y no suspendido.", "La aplicación valida contenido, tamaño, dimensiones y formato, elimina metadatos y usa claves opacas. Las rutas privadas y URL firmadas no son públicas."] },
      { title: "Reportes de seguridad, disputas y apelaciones", paragraphs: ["Los reportes, datos de contacto, disputas, evidencia, apelaciones e historial de investigación son confidenciales por defecto.", "Una reseña negativa, disputa o reporte no suspende ni elimina automáticamente a un proveedor. La suspensión y reinstalación son decisiones administrativas auditadas."] }
    ]
  }
};

export function getPrivacyContent(locale: PublicLocale): PrivacyContent { return content[locale]; }
