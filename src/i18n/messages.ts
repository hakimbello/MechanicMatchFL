import type { PublicLocale } from "./locale.ts";

const en = {
  navigation: {
    home: "Find a mechanic",
    listBusiness: "List your business",
    privacy: "Privacy",
    providerAccount: "Provider Account",
    safetyReport: "Safety Report",
    languageLabel: "Language",
    english: "EN",
    spanish: "ES"
  },
  home: {
    region: "Miami-Dade and Broward",
    title: "Find the right mechanic for your car.",
    intro: "MechanicMatchFL helps South Florida drivers find relevant local repair providers based on vehicle, repair need, and ZIP code, including independent shops, mobile mechanics, and specialists.",
    providerCta: "Are you a mechanic? List your business",
    year: "Year",
    selectYear: "Select year",
    make: "Make",
    model: "Model",
    serviceNeed: "Repair or service need",
    zip: "ZIP code",
    zipHelp: "Enter a Miami-Dade or Broward ZIP.",
    submit: "Find My Mechanic",
    matches: "Matches",
    recommended: "Recommended mechanics",
    resultsPlaceholder: "Your results will appear here",
    searchHelp: "Search by vehicle, repair need, and ZIP code to see relevant providers.",
    showing: "Showing providers for {service} near {zip}.",
    result: "Result {number}",
    whyMatch: "Why {name} is a match",
    verified: "Verified",
    viewProfile: "View Profile",
    noMatches: "No matching mechanics found for this search yet.",
    noMatchesHelp: "Try a different repair need, vehicle make, or ZIP code."
  },
  profile: {
    back: "Back to Search",
    photoAlt: "{name} provider photo",
    trustLabel: "Provider trust and location details",
    verified: "Verified profile",
    claimed: "Claimed profile",
    contact: "Contact mechanic",
    contactUnavailable: "Contact information is not available for this provider yet.",
    whyMatched: "Why this mechanic matched",
    matchedFor: "Matched for",
    worksOn: "Works on",
    location: "Location",
    detailsLabel: "Provider details",
    services: "Services",
    vehicles: "Vehicles",
    details: "Provider details",
    feedback: "Customer feedback",
    reviews: "Reviews",
    review: "review",
    reviewsPlural: "reviews",
    starsSummary: "{rating} out of 5 stars from {count} reviews",
    stars: "{rating} / 5 stars",
    reviewsUnavailable: "Reviews are temporarily unavailable.",
    noReviews: "No published reviews yet.",
    verification: "Email ownership verified. Service not independently verified.",
    providerResponse: "Provider response",
    writeReview: "Write a review",
    reviewIntro: "Reviews require email ownership verification and administrator approval before publication.",
    providerTools: "Provider and safety tools",
    toolsHelp: "Provider ownership claims require administrator approval. Safety reports are confidential.",
    claimProvider: "Claim This Provider",
    reportSafety: "Report a Safety Incident"
  },
  reviewForm: {
    checkEmail: "Check your email",
    submitted: "Your review is not public. Use the single-use link within 30 minutes to verify email ownership, then it will await administrator moderation.",
    rating: "Rating",
    star: "star",
    stars: "stars",
    written: "Written review",
    honestHelp: "Describe your experience honestly. Negative reviews are allowed and assessed under the same moderation rules.",
    email: "Email",
    emailHelp: "Private. Used only to verify email ownership and prevent abuse.",
    displayName: "Public display name",
    displayNamePlaceholder: "Optional; otherwise Anonymous",
    verificationHelp: "Email verified means the reviewer controlled the email address. It does not verify a purchase, completed repair, or service relationship.",
    submitting: "Submitting...",
    submit: "Submit review",
    unavailable: "Review submission is temporarily unavailable. Please try again later.",
    emailUnavailable: "Review email verification is not available yet. Please try again later.",
    rateLimited: "Too many review attempts. Please try again later.",
    duplicate: "A review for this provider could not be submitted again.",
    inactiveProvider: "This provider is not currently eligible for reviews.",
    deliveryFailed: "The verification email could not be delivered. Please try again later."
  },
  verification: {
    eyebrow: "Review verification",
    title: "Verify email ownership",
    intro: "This confirms control of the email address only. It does not verify a purchase, repair, or service relationship.",
    preparing: "Preparing secure verification...",
    invalidLink: "This verification link is invalid. The review was not published.",
    button: "Verify email",
    verifiedTitle: "Email verified",
    verifiedBody: "The review is still private and now awaits administrator moderation.",
    expiredTitle: "Link expired",
    expiredBody: "The verification link expired. Submit the review again to receive a new link.",
    usedTitle: "Link already used",
    usedBody: "This single-use verification link has already been used.",
    invalidTitle: "Unable to verify",
    invalidBody: "The verification link is invalid. The review remains unpublished."
  },
  safety: {
    eyebrow: "Private safety reporting",
    title: "Report a safety concern",
    intro: "Use this confidential form for safety, harassment, fraud, or identity concerns. Reports and reporter contact details are not public. A report does not automatically remove a provider.",
    received: "Report received",
    receivedBody: "The report is private and will be reviewed by an administrator.",
    providerId: "Provider ID (optional)",
    category: "Incident category",
    choose: "Choose one",
    unsafeWork: "Unsafe work",
    harassment: "Harassment",
    fraud: "Fraud",
    identity: "Identity concern",
    other: "Other",
    description: "What happened?",
    reporterName: "Your name (optional and private)",
    reporterEmail: "Contact email (optional and private)",
    contactHelp: "Contact details are not shown to providers or the public.",
    submitting: "Submitting...",
    submit: "Submit Confidential Report",
    unavailable: "The confidential report could not be submitted."
  },
  listing: {
    back: "Back to Search",
    eyebrow: "Provider submission",
    title: "List your business",
    intro: "Submit a mechanic or automotive repair listing for review. Listings are not public until an administrator reviews and activates them.",
    submittedTitle: "Your profile was submitted for review.",
    submittedBody: "{name} is pending review and is not public yet. We do not promise a specific approval time during this development milestone.",
    errorTitle: "Submission could not be saved.",
    about: "About you and the business",
    businessName: "Provider or business name",
    phone: "Phone",
    email: "Email",
    providerType: "Provider type",
    chooseOne: "Choose one",
    workOn: "What do you work on?",
    services: "Services",
    compatibility: "Vehicle compatibility",
    allMakes: "All makes",
    selectedMakes: "Selected makes",
    makesServiced: "Makes serviced",
    specialtyMakes: "Specialty makes",
    optionalComma: "Optional, comma-separated",
    where: "Where do you work?",
    workLocation: "Work location",
    physical: "Physical shop",
    mobile: "Mobile mechanic",
    street: "Street address",
    city: "City",
    county: "County",
    zip: "ZIP",
    serviceZips: "Service ZIP codes",
    serviceZipsPlaceholder: "33161, 33311",
    serviceAreaHelp: "List exact ZIPs, or enter a base ZIP and radius below.",
    baseZip: "Base ZIP",
    radius: "Service radius (miles)",
    optional: "Optional",
    radiusPlaceholder: "Optional, 1-100",
    profile: "Profile details",
    description: "Business description",
    descriptionPlaceholder: "Describe the work you do. Claims are provider-reported.",
    experience: "Years of experience (optional)",
    languages: "Languages spoken (provider-reported)",
    english: "English",
    spanish: "Spanish",
    otherLanguage: "Another language",
    otherLanguagePlaceholder: "Optional",
    registration: "Registration or license number (optional and private until verified)",
    authorization: "Authorization",
    relationship: "Your relationship to this provider",
    myself: "Myself",
    myBusiness: "My business",
    family: "A family member",
    employee: "I work for this business",
    attest: "I confirm that I am authorized to submit this listing and that the information is accurate.",
    submitting: "Submitting...",
    submit: "Submit for review",
    unavailable: "Provider submission is temporarily unavailable. Please try again later."
  },
  validation: {
    searchYearRequired: "Choose your vehicle year.",
    searchYearInvalid: "Enter a real vehicle year.",
    searchMake: "Enter your vehicle make.",
    searchModel: "Enter your vehicle model.",
    searchService: "Choose the repair or service you need.",
    searchZip: "Enter a valid 5-digit ZIP code.",
    searchLaunchZip: "Enter a Miami-Dade or Broward ZIP code.",
    searchCoordinates: "Distance matching is not available for this ZIP yet. Try a nearby residential ZIP.",
    reviewProvider: "A provider is required.",
    reviewRating: "Choose a whole-number rating from 1 to 5 stars.",
    reviewMin: "Write at least 20 characters about your experience.",
    reviewMax: "Keep the review under 2000 characters.",
    reviewEmail: "Enter a valid email address.",
    reviewEmailMax: "Keep the email address under 254 characters.",
    reviewNameMax: "Keep the display name under 80 characters.",
    reviewRejected: "Review submission could not be accepted.",
    safetyCategory: "Choose an incident category.",
    safetyDescription: "Describe the incident in 40 to 4,000 characters.",
    safetyName: "Name is too long.",
    safetyEmail: "Enter a valid email address or leave it blank.",
    safetyRejected: "Submission could not be accepted."
  },
  presentation: {
    providerTypes: {
      "independent-auto-repair-shop": "Independent repair shop",
      "mobile-mechanic": "Mobile mechanic",
      "tire-service-shop": "Tire/service shop",
      "repair-specialist": "Repair specialist"
    },
    locationKinds: { physical: "Physical shop", mobile: "Mobile mechanic" },
    services: {
      "wont-start": "Won't Start", brakes: "Brakes", ac: "AC", tires: "Tires", engine: "Engine",
      transmission: "Transmission", electrical: "Electrical", suspension: "Suspension", maintenance: "Maintenance",
      "check-engine-light": "Check Engine Light", "other-not-sure": "Other / Not Sure"
    },
    specialties: {
      "general-repair": "General repair", engine: "Engine service", transmission: "Transmission specialist",
      brakes: "Brake service", "tires-wheels": "Tires and wheels", ac: "AC specialist",
      "electrical-diagnostics": "Electrical diagnostics", suspension: "Suspension service", maintenance: "Maintenance",
      "check-engine-diagnostics": "Check-engine diagnostics", diesel: "Diesel service", exhaust: "Exhaust service",
      "cooling-radiator": "Cooling and radiator", alignment: "Alignment"
    },
    servesArea: "Serves your area",
    allMakes: "Works on all makes",
    worksOnMake: "Works on {make}",
    searchWorksOnMake: "Works on {make} vehicles",
    nearbyShop: "Nearby shop",
    milesAway: "{distance} miles away",
    lessThanOne: "Less than 1",
    mobileZips: "Mobile mechanic serving selected ZIP codes",
    zipCodes: "ZIP codes {zips}",
    radius: "{radius} miles from {zip}",
    serves: "Serves {area}",
    unavailableArea: "Service area not available",
    selectedMakes: "selected makes",
    specializes: "Specializes in {makes}",
    providerReportedYears: "Provider-reported: {years} {unit}",
    year: "year",
    years: "years",
    providerReportedLanguages: "Provider-reported: {languages}",
    call: "Call Mechanic",
    email: "Email Mechanic",
    website: "Visit Website"
  },
  metadata: {
    homeTitle: "Find the right mechanic for your car",
    homeDescription: "Find local independent shops, mobile mechanics, and repair specialists in Miami-Dade and Broward matched to your vehicle, repair need, and ZIP code.",
    listingTitle: "List your mechanic business",
    listingDescription: "Submit a South Florida mechanic or automotive repair provider listing for review on MechanicMatchFL.",
    notFound: "Mechanic profile not found",
    safetyTitle: "Confidential safety report",
    verificationTitle: "Verify review email",
    privacyTitle: "Privacy"
  }
} as const;

type DeepWiden<T> = T extends string ? string : T extends readonly unknown[]
  ? { [K in keyof T]: DeepWiden<T[K]> }
  : T extends object ? { [K in keyof T]: DeepWiden<T[K]> } : T;

export type PublicMessages = DeepWiden<typeof en>;

const es: PublicMessages = {
  navigation: {
    home: "Buscar un mecánico", listBusiness: "Registra tu negocio", privacy: "Privacidad",
    providerAccount: "Cuenta del proveedor", safetyReport: "Reporte de seguridad", languageLabel: "Idioma", english: "EN", spanish: "ES"
  },
  home: {
    region: "Miami-Dade y Broward", title: "Encuentra el mecánico adecuado para tu auto.",
    intro: "MechanicMatchFL ayuda a los conductores del sur de Florida a encontrar proveedores locales relevantes según el vehículo, la reparación y el código postal, incluidos talleres independientes, mecánicos móviles y especialistas.",
    providerCta: "¿Eres mecánico? Registra tu negocio", year: "Año", selectYear: "Selecciona el año", make: "Marca", model: "Modelo",
    serviceNeed: "Reparación o servicio necesario", zip: "Código postal", zipHelp: "Ingresa un código postal de Miami-Dade o Broward.",
    submit: "Buscar mecánico", matches: "Resultados", recommended: "Mecánicos recomendados", resultsPlaceholder: "Tus resultados aparecerán aquí",
    searchHelp: "Busca por vehículo, reparación y código postal para ver proveedores relevantes.", showing: "Proveedores para {service} cerca de {zip}.",
    result: "Resultado {number}", whyMatch: "Por qué {name} coincide", verified: "Verificado", viewProfile: "Ver perfil",
    noMatches: "Aún no hay mecánicos que coincidan con esta búsqueda.", noMatchesHelp: "Prueba otra reparación, marca o código postal."
  },
  profile: {
    back: "Volver a la búsqueda", photoAlt: "Foto del proveedor {name}", trustLabel: "Datos de confianza y ubicación del proveedor",
    verified: "Perfil verificado", claimed: "Perfil reclamado", contact: "Contactar al mecánico",
    contactUnavailable: "La información de contacto aún no está disponible.", whyMatched: "Por qué coincidió este mecánico",
    matchedFor: "Coincidencia por", worksOn: "Trabaja con", location: "Ubicación", detailsLabel: "Detalles del proveedor",
    services: "Servicios", vehicles: "Vehículos", details: "Detalles del proveedor", feedback: "Opiniones de clientes", reviews: "Reseñas",
    review: "reseña", reviewsPlural: "reseñas", starsSummary: "{rating} de 5 estrellas según {count} reseñas", stars: "{rating} / 5 estrellas",
    reviewsUnavailable: "Las reseñas no están disponibles temporalmente.", noReviews: "Aún no hay reseñas publicadas.",
    verification: "Propiedad del correo verificada. El servicio no fue verificado de forma independiente.", providerResponse: "Respuesta del proveedor",
    writeReview: "Escribe una reseña", reviewIntro: "Las reseñas requieren verificar el correo y aprobación administrativa antes de publicarse."
    ,providerTools: "Herramientas del proveedor y seguridad", toolsHelp: "Las reclamaciones de propiedad requieren aprobación administrativa. Los reportes de seguridad son confidenciales.",
    claimProvider: "Reclamar este proveedor", reportSafety: "Reportar un incidente de seguridad"
  },
  reviewForm: {
    checkEmail: "Revisa tu correo", submitted: "Tu reseña no es pública. Usa el enlace de un solo uso dentro de 30 minutos para verificar el correo; después quedará pendiente de moderación.",
    rating: "Calificación", star: "estrella", stars: "estrellas", written: "Reseña escrita",
    honestHelp: "Describe tu experiencia con honestidad. Se permiten reseñas negativas y se evalúan con las mismas reglas de moderación.",
    email: "Correo electrónico", emailHelp: "Privado. Solo se usa para verificar el correo y prevenir abuso.", displayName: "Nombre público",
    displayNamePlaceholder: "Opcional; de lo contrario, Anónimo", verificationHelp: "Correo verificado significa que la persona controlaba esa dirección. No verifica una compra, reparación o relación de servicio.",
    submitting: "Enviando...", submit: "Enviar reseña", unavailable: "El envío de reseñas no está disponible temporalmente. Inténtalo más tarde.",
    emailUnavailable: "La verificación por correo aún no está disponible. Inténtalo más tarde.", rateLimited: "Demasiados intentos de reseña. Inténtalo más tarde.",
    duplicate: "No se pudo enviar otra reseña para este proveedor.", inactiveProvider: "Este proveedor no es elegible para reseñas actualmente.",
    deliveryFailed: "No se pudo entregar el correo de verificación. Inténtalo más tarde."
  },
  verification: {
    eyebrow: "Verificación de reseña", title: "Verifica la propiedad del correo", intro: "Esto solo confirma el control de la dirección de correo. No verifica una compra, reparación o relación de servicio.",
    preparing: "Preparando verificación segura...", invalidLink: "Este enlace de verificación no es válido. La reseña no fue publicada.", button: "Verificar correo",
    verifiedTitle: "Correo verificado", verifiedBody: "La reseña sigue privada y ahora espera moderación administrativa.", expiredTitle: "Enlace vencido",
    expiredBody: "El enlace venció. Envía la reseña nuevamente para recibir otro.", usedTitle: "Enlace ya utilizado", usedBody: "Este enlace de un solo uso ya fue utilizado.",
    invalidTitle: "No se pudo verificar", invalidBody: "El enlace no es válido. La reseña permanece sin publicar."
  },
  safety: {
    eyebrow: "Reporte privado de seguridad", title: "Reporta una inquietud de seguridad",
    intro: "Usa este formulario confidencial para asuntos de seguridad, acoso, fraude o identidad. Los reportes y datos de contacto no son públicos. Un reporte no elimina automáticamente a un proveedor.",
    received: "Reporte recibido", receivedBody: "El reporte es privado y será revisado por un administrador.", providerId: "ID del proveedor (opcional)",
    category: "Categoría del incidente", choose: "Selecciona una", unsafeWork: "Trabajo inseguro", harassment: "Acoso", fraud: "Fraude",
    identity: "Problema de identidad", other: "Otro", description: "¿Qué ocurrió?", reporterName: "Tu nombre (opcional y privado)",
    reporterEmail: "Correo de contacto (opcional y privado)", contactHelp: "Los datos de contacto no se muestran a proveedores ni al público.",
    submitting: "Enviando...", submit: "Enviar reporte confidencial", unavailable: "No se pudo enviar el reporte confidencial."
  },
  listing: {
    back: "Volver a la búsqueda", eyebrow: "Registro de proveedor", title: "Registra tu negocio",
    intro: "Envía un taller o servicio de reparación para revisión. El perfil no será público hasta que un administrador lo revise y active.",
    submittedTitle: "Tu perfil fue enviado para revisión.", submittedBody: "{name} está pendiente de revisión y aún no es público. No prometemos un plazo específico de aprobación durante esta etapa.",
    errorTitle: "No se pudo guardar el registro.", about: "Sobre ti y el negocio", businessName: "Nombre del proveedor o negocio", phone: "Teléfono", email: "Correo electrónico",
    providerType: "Tipo de proveedor", chooseOne: "Selecciona una opción", workOn: "¿En qué trabajas?", services: "Servicios", compatibility: "Compatibilidad de vehículos", allMakes: "Todas las marcas",
    selectedMakes: "Marcas seleccionadas", makesServiced: "Marcas atendidas", specialtyMakes: "Marcas de especialidad", optionalComma: "Opcional, separadas por comas",
    where: "¿Dónde trabajas?", workLocation: "Lugar de trabajo", physical: "Taller físico", mobile: "Mecánico móvil", street: "Dirección", city: "Ciudad", county: "Condado", zip: "Código postal",
    serviceZips: "Códigos postales de servicio", serviceZipsPlaceholder: "33161, 33311", serviceAreaHelp: "Indica códigos exactos o una base y un radio.", baseZip: "Código postal base",
    radius: "Radio de servicio (millas)", optional: "Opcional", radiusPlaceholder: "Opcional, 1-100", profile: "Detalles del perfil", description: "Descripción del negocio",
    descriptionPlaceholder: "Describe el trabajo que realizas. Las afirmaciones son reportadas por el proveedor.", experience: "Años de experiencia (opcional)", languages: "Idiomas hablados (reportados por el proveedor)",
    english: "Inglés", spanish: "Español", otherLanguage: "Otro idioma", otherLanguagePlaceholder: "Opcional", registration: "Número de registro o licencia (opcional y privado hasta verificarse)",
    authorization: "Autorización", relationship: "Tu relación con este proveedor", myself: "Yo", myBusiness: "Mi negocio", family: "Un familiar", employee: "Trabajo para este negocio",
    attest: "Confirmo que tengo autorización para enviar este perfil y que la información es correcta.", submitting: "Enviando...", submit: "Enviar para revisión",
    unavailable: "El registro de proveedores no está disponible temporalmente. Inténtalo más tarde."
  },
  validation: {
    searchYearRequired: "Selecciona el año del vehículo.", searchYearInvalid: "Ingresa un año de vehículo válido.", searchMake: "Ingresa la marca del vehículo.",
    searchModel: "Ingresa el modelo del vehículo.", searchService: "Selecciona la reparación o servicio que necesitas.", searchZip: "Ingresa un código postal válido de 5 dígitos.",
    searchLaunchZip: "Ingresa un código postal de Miami-Dade o Broward.", searchCoordinates: "La búsqueda por distancia aún no está disponible para este código. Prueba uno residencial cercano.",
    reviewProvider: "Se requiere un proveedor.", reviewRating: "Selecciona una calificación entera de 1 a 5 estrellas.", reviewMin: "Escribe al menos 20 caracteres sobre tu experiencia.",
    reviewMax: "Mantén la reseña por debajo de 2000 caracteres.", reviewEmail: "Ingresa un correo válido.", reviewEmailMax: "Mantén el correo por debajo de 254 caracteres.",
    reviewNameMax: "Mantén el nombre público por debajo de 80 caracteres.", reviewRejected: "No se pudo aceptar la reseña.", safetyCategory: "Selecciona una categoría del incidente.",
    safetyDescription: "Describe el incidente en 40 a 4,000 caracteres.", safetyName: "El nombre es demasiado largo.", safetyEmail: "Ingresa un correo válido o déjalo en blanco.", safetyRejected: "No se pudo aceptar el envío."
  },
  presentation: {
    providerTypes: { "independent-auto-repair-shop": "Taller independiente", "mobile-mechanic": "Mecánico móvil", "tire-service-shop": "Taller de llantas y servicio", "repair-specialist": "Especialista en reparación" },
    locationKinds: { physical: "Taller físico", mobile: "Mecánico móvil" },
    services: { "wont-start": "No arranca", brakes: "Frenos", ac: "Aire acondicionado", tires: "Llantas", engine: "Motor", transmission: "Transmisión", electrical: "Sistema eléctrico", suspension: "Suspensión", maintenance: "Mantenimiento", "check-engine-light": "Luz de motor", "other-not-sure": "Otro / No estoy seguro" },
    specialties: { "general-repair": "Reparación general", engine: "Servicio de motor", transmission: "Especialista en transmisión", brakes: "Servicio de frenos", "tires-wheels": "Llantas y ruedas", ac: "Especialista en aire acondicionado", "electrical-diagnostics": "Diagnóstico eléctrico", suspension: "Servicio de suspensión", maintenance: "Mantenimiento", "check-engine-diagnostics": "Diagnóstico de luz de motor", diesel: "Servicio diésel", exhaust: "Servicio de escape", "cooling-radiator": "Enfriamiento y radiador", alignment: "Alineación" },
    servesArea: "Atiende tu área", allMakes: "Trabaja con todas las marcas", worksOnMake: "Trabaja con vehículos {make}", searchWorksOnMake: "Trabaja con vehículos {make}", nearbyShop: "Taller cercano", milesAway: "A {distance} millas", lessThanOne: "Menos de 1",
    mobileZips: "Mecánico móvil que atiende códigos seleccionados", zipCodes: "Códigos postales {zips}", radius: "{radius} millas desde {zip}", serves: "Atiende {area}", unavailableArea: "Área de servicio no disponible",
    selectedMakes: "marcas seleccionadas", specializes: "Se especializa en {makes}", providerReportedYears: "Reportado por el proveedor: {years} {unit}", year: "año", years: "años",
    providerReportedLanguages: "Reportado por el proveedor: {languages}", call: "Llamar al mecánico", email: "Enviar correo", website: "Visitar sitio web"
  },
  metadata: {
    homeTitle: "Encuentra el mecánico adecuado para tu auto", homeDescription: "Encuentra talleres independientes, mecánicos móviles y especialistas en Miami-Dade y Broward según tu vehículo, reparación y código postal.",
    listingTitle: "Registra tu negocio mecánico", listingDescription: "Envía un taller o proveedor de reparación del sur de Florida para revisión en MechanicMatchFL.",
    notFound: "Perfil del mecánico no encontrado", safetyTitle: "Reporte confidencial de seguridad", verificationTitle: "Verificar correo de reseña", privacyTitle: "Privacidad"
  }
};

export const PUBLIC_MESSAGES: Record<PublicLocale, PublicMessages> = { en, es };

export function getPublicMessages(locale: PublicLocale = "en"): PublicMessages {
  return PUBLIC_MESSAGES[locale] ?? PUBLIC_MESSAGES.en;
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function localizeKnownMessage(message: string | undefined, locale: PublicLocale): string | undefined {
  if (!message || locale === "en") return message;
  const enValues = Object.values(PUBLIC_MESSAGES.en.validation);
  const key = Object.keys(PUBLIC_MESSAGES.en.validation).find(
    (candidate) => PUBLIC_MESSAGES.en.validation[candidate as keyof typeof PUBLIC_MESSAGES.en.validation] === message
  ) as keyof typeof PUBLIC_MESSAGES.en.validation | undefined;
  if (key && enValues.includes(message)) return PUBLIC_MESSAGES.es.validation[key];
  return SPANISH_KNOWN_MESSAGES[message] ?? message;
}

const SPANISH_KNOWN_MESSAGES: Record<string, string> = {
  "Enter the provider or business name.": "Ingresa el nombre del proveedor o negocio.",
  "Keep the provider or business name under 120 characters.": "Mantén el nombre por debajo de 120 caracteres.",
  "Enter a valid 10-digit phone number.": "Ingresa un teléfono válido de 10 dígitos.",
  "Enter a valid email address.": "Ingresa un correo electrónico válido.",
  "Keep the email address under 254 characters.": "Mantén el correo por debajo de 254 caracteres.",
  "Choose a provider type.": "Selecciona un tipo de proveedor.",
  "Choose at least one service.": "Selecciona al menos un servicio.",
  "Choose all makes or enter the makes you service.": "Selecciona todas las marcas o indica las que atiendes.",
  "Keep makes serviced under 300 characters.": "Mantén las marcas atendidas por debajo de 300 caracteres.",
  "Keep specialty makes under 300 characters.": "Mantén las marcas de especialidad por debajo de 300 caracteres.",
  "Enter whole years of experience between 1 and 100.": "Ingresa años completos de experiencia entre 1 y 100.",
  "Choose English, Spanish, or enter another language.": "Selecciona inglés, español o ingresa otro idioma.",
  "Keep the other language under 60 characters.": "Mantén el otro idioma por debajo de 60 caracteres.",
  "Enter the shop street address.": "Ingresa la dirección del taller.",
  "Keep the shop street address under 160 characters.": "Mantén la dirección por debajo de 160 caracteres.",
  "Enter the shop city.": "Ingresa la ciudad del taller.",
  "Keep the shop city under 80 characters.": "Mantén la ciudad por debajo de 80 caracteres.",
  "Choose Miami-Dade or Broward.": "Selecciona Miami-Dade o Broward.",
  "The ZIP code does not match the selected county.": "El código postal no coincide con el condado seleccionado.",
  "Enter only comma-separated 5-digit ZIP codes.": "Ingresa solo códigos postales de 5 dígitos separados por comas.",
  "Use Miami-Dade or Broward residential ZIP codes with available distance coverage.": "Usa códigos residenciales de Miami-Dade o Broward con cobertura de distancia.",
  "Enter service ZIP codes or a base ZIP and service radius.": "Ingresa códigos de servicio o un código base y radio.",
  "Enter a Miami-Dade or Broward base ZIP code.": "Ingresa un código postal base de Miami-Dade o Broward.",
  "Distance matching is not available for this base ZIP.": "La búsqueda por distancia no está disponible para este código base.",
  "Enter a service radius from 1 to 100 miles.": "Ingresa un radio de servicio de 1 a 100 millas.",
  "Choose only Miami-Dade or Broward.": "Selecciona solo Miami-Dade o Broward.",
  "Choose physical shop or mobile mechanic.": "Selecciona taller físico o mecánico móvil.",
  "Choose your relationship to the business.": "Selecciona tu relación con el negocio.",
  "Confirm that you are authorized to create or manage this profile.": "Confirma que tienes autorización para crear o administrar este perfil.",
  "Enter a short description of at least 20 characters.": "Ingresa una descripción de al menos 20 caracteres.",
  "Keep the description under 500 characters.": "Mantén la descripción por debajo de 500 caracteres.",
  "Provider images are deferred for V1.": "Las imágenes del proveedor no se aceptan en este formulario."
};
