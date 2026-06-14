export interface HelpContent {
  title: string
  description: string
  features: string[]
  tips: string[]
}

export const adminHelpContent: Record<string, HelpContent> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Übersicht über alle wichtigen Kennzahlen und Aktivitäten.',
    features: [
      'Besucherstatistiken',
      'Aktuelle Leads',
      'Umsatzübersicht',
      'Schnellzugriff auf häufige Aktionen',
    ],
    tips: [
      'Nutzen Sie das Dashboard als Startpunkt für Ihre tägliche Arbeit.',
    ],
  },
  leads: {
    title: 'Lead-Verwaltung',
    description: 'Alle eingehenden Kontaktanfragen und Leads verwalten.',
    features: [
      'Leads filtern und sortieren',
      'Status aktualisieren (Neu, In Bearbeitung, Abgeschlossen)',
      'Kontaktdaten einsehen',
      'Export-Funktionen',
    ],
    tips: [
      'Reagieren Sie schnell auf neue Leads — die Konversionsrate steigt mit schneller Antwortzeit.',
    ],
  },
  vendors: {
    title: 'Händler-Verwaltung',
    description:
      'Partnerhändler anlegen, bearbeiten und deren Produkte verwalten.',
    features: [
      'Händlerprofil bearbeiten',
      'Produkte zuweisen',
      'Affiliate-Tracking',
      'Klick-Statistiken',
    ],
    tips: [
      'Händler mit vollständigem Profil werden besser in der Suche gefunden.',
      'Nutzen Sie Tags für bessere Filterung.',
    ],
  },
  products: {
    title: 'Produktverwaltung',
    description:
      'Produkte aller Händler zentral verwalten und kategorisieren.',
    features: [
      'Produkte anlegen und bearbeiten',
      'Kategorien zuweisen',
      'Tags für Filterung',
      'Featured-Produkte hervorheben',
      'Bilder verwalten',
    ],
    tips: [
      'Featured-Produkte erscheinen prominent auf der Startseite.',
      'Verwenden Sie aussagekräftige Tags.',
    ],
  },
  categories: {
    title: 'Kategorien',
    description:
      'Produktkategorien erstellen und hierarchisch organisieren.',
    features: [
      'Kategorien anlegen',
      'Hierarchische Struktur (Unterkategorien)',
      'Sortierung anpassen',
      'Kategoriebilder',
    ],
    tips: [
      'Eine gute Kategoriestruktur verbessert die Navigation und SEO.',
    ],
  },
  ads: {
    title: 'Werbung',
    description: 'Werbebanner und Anzeigen für Händler verwalten.',
    features: [
      'Banner erstellen und platzieren',
      'CPM-Abrechnung',
      'Impressions-Tracking',
      'Zeitgesteuerte Kampagnen',
    ],
    tips: [
      'Nutzen Sie A/B-Tests mit verschiedenen Bannerformaten.',
    ],
  },
  sliders: {
    title: 'Slider-Manager',
    description:
      'Karussells und Slider mit verschiedenen Animationen und Inhalten erstellen.',
    features: [
      '6 Animationsstile (Slide, Fade, Cube, Flip, Coverflow, Cards)',
      '4 Layouts (Karussell, Grid, Laufband, Featured)',
      '5 Kartenstile',
      'Auto-Filter nach Tags, Kategorien, Händlern',
      'Sponsor-Tracking mit CPM-Abrechnung',
    ],
    tips: [
      'Slider können in Sektionen eingebunden werden.',
      'Verwenden Sie den Auto-Filter für dynamische Inhalte.',
    ],
  },
  seo: {
    title: 'SEO-Verwaltung',
    description: 'Suchmaschinenoptimierung und Keyword-Tracking.',
    features: [
      'Keyword-Tracking',
      'Suchvolumen-Analyse',
      'Ranking-Überwachung',
      'Meta-Daten-Verwaltung',
    ],
    tips: ['Überprüfen Sie regelmäßig Ihre Rankings.'],
  },
  content: {
    title: 'Seitenverwaltung',
    description:
      'Inhaltsseiten mit Markdown-Editor erstellen und bearbeiten.',
    features: [
      'Live-Vorschau',
      'Markdown-Editor',
      'Medien einbetten',
      'SEO-Metadaten',
      'Entwurf/Veröffentlicht-Status',
    ],
    tips: [
      'Nutzen Sie die :::slider-slug::: Syntax um Slider einzubetten.',
    ],
  },
  media: {
    title: 'Medienverwaltung',
    description: 'Bilder und Videos hochladen und verwalten.',
    features: [
      'Drag & Drop Upload',
      'Bildvorschau',
      'Video-Support',
      'Cloudinary-Integration',
    ],
    tips: ['Optimierte Bilder verbessern die Ladezeit.'],
  },
  sections: {
    title: 'Homepage-Sektionen',
    description:
      'Die Startseite modular zusammenbauen aus verschiedenen Sektionstypen.',
    features: [
      '10+ Sektionstypen',
      'Drag & Drop Sortierung',
      'Slider-Integration',
      'Hero-Slider mit Animationen',
      'Sichtbarkeit ein/ausschalten',
    ],
    tips: [
      'Slider aus dem Slider-Manager können direkt als Sektion eingebunden werden.',
      'Hero-Slider eignen sich perfekt als erste Sektion.',
    ],
  },
  menu: {
    title: 'Navigation',
    description:
      'Die Seitennavigation (Header/Footer) konfigurieren.',
    features: [
      'Menüpunkte anlegen',
      'Hierarchische Struktur',
      'Header/Footer Platzierung',
      'Sichtbarkeit steuern',
    ],
    tips: [
      'Eine klare Navigation verbessert die Benutzererfahrung.',
    ],
  },
  setup: {
    title: 'Seiteneinstellungen',
    description:
      'Globale Einstellungen wie Farben, Schriften und Logo konfigurieren.',
    features: [
      'Theme-Einstellungen',
      'Logo-Upload',
      'Farbschema',
      'Schriftarten',
      'Footer-Text',
    ],
    tips: [
      'Änderungen werden sofort auf der öffentlichen Seite sichtbar.',
    ],
  },
}
