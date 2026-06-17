import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const prisma = new PrismaClient()

const TENANT_SLUG = 'e-ventschau'

async function main() {
  console.log('Seeding e-Ventschau database...')

  // ── Tenant ──────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: { name: 'e-Ventschau e. V.', domain: 'e-ventschau.de' },
    create: {
      slug: TENANT_SLUG,
      name: 'e-Ventschau e. V.',
      domain: 'e-ventschau.de',
    },
  })
  console.log('Tenant:', tenant.slug)

  // ── Users ───────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin2024!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@e-ventschau.de' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@e-ventschau.de',
      name: 'Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  const editorPassword = await bcrypt.hash('editor2024!', 12)
  const editor = await prisma.user.upsert({
    where: { email: 'editor@e-ventschau.de' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'editor@e-ventschau.de',
      name: 'Redaktion',
      password: editorPassword,
      role: UserRole.EDITOR,
    },
  })

  const superAdminPassword = await bcrypt.hash('super2024!', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@e-ventschau.de' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'super@e-ventschau.de',
      name: 'Super Admin',
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  })
  console.log('Users:', admin.email, editor.email, superAdmin.email)

  for (const [user, role] of [
    [admin, UserRole.ADMIN],
    [editor, UserRole.EDITOR],
    [superAdmin, UserRole.SUPER_ADMIN],
  ] as const) {
    await prisma.tenantUser.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: {},
      create: { userId: user.id, tenantId: tenant.id, role },
    })
  }

  // ── Site settings ───────────────────────────────────────
  await prisma.siteSettings.upsert({
    where: { tenantId: tenant.id },
    update: { themeSlug: 'eventschau', siteName: 'e-Ventschau' },
    create: {
      tenantId: tenant.id,
      siteName: 'e-Ventschau',
      themeSlug: 'eventschau',
      defaultDarkMode: false,
      primaryColor: '#0E5A57',
      accentColor: '#E0A11E',
      backgroundColor: '#FAFAF6',
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
      locale: 'de',
      logoMode: 'text',
      ctaButtonLabel: 'Spenden',
      ctaButtonHref: '/unterstuetzung',
      footerText:
        'Das e-Ventschau-Benefiz-Festival – internationale Live-Musik für den guten Zweck in Ventschau, Landkreis Lüneburg.',
    },
  })
  console.log('Site settings created')

  // ── Menu (header + footer) ──────────────────────────────
  await prisma.menuItem.deleteMany({ where: { tenantId: tenant.id } })

  // Header
  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Start', href: '/', sortOrder: 0 },
  })
  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Über uns', href: '/informationen', sortOrder: 1 },
  })
  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Programm 2026', href: '/events/e-ventschau-2026', sortOrder: 2 },
  })

  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Events', href: '/events', sortOrder: 3 },
  })

  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Künstler', href: '/kuenstler', sortOrder: 4 },
  })

  const rueckschau = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Rückschau', href: '/rueckschau', sortOrder: 5 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2024', href: '/rueckschau/programm-2024', sortOrder: 0 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2023', href: '/rueckschau/programm-2023', sortOrder: 1 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2022', href: '/rueckschau/programm-2022', sortOrder: 2 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2019', href: '/rueckschau/programm-2019', sortOrder: 3 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2018', href: '/rueckschau/programm-2018', sortOrder: 4 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2017', href: '/rueckschau/programm-2017', sortOrder: 5 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Programm 2016', href: '/rueckschau/programm-2016', sortOrder: 6 },
      { tenantId: tenant.id, parentId: rueckschau.id, label: 'Festival-Filme', href: '/festival-filme', sortOrder: 7 },
    ],
  })

  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Presse', href: '/presse', sortOrder: 6 },
  })

  const unterstuetzung = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Unterstützung', href: '/unterstuetzung', sortOrder: 7 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: unterstuetzung.id, label: 'Ihre Spende', href: '/unterstuetzung/spende', sortOrder: 0 },
      { tenantId: tenant.id, parentId: unterstuetzung.id, label: 'Unsere Förderer', href: '/foerderer', sortOrder: 1 },
    ],
  })

  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Kontakt', href: '/kontakt', sortOrder: 8 },
  })

  // Footer
  const footerFestival = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Festival', href: '#', location: 'footer', sortOrder: 0 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: footerFestival.id, label: 'Programm 2026', href: '/events/e-ventschau-2026', location: 'footer', sortOrder: 0 },
      { tenantId: tenant.id, parentId: footerFestival.id, label: 'Über uns', href: '/informationen', location: 'footer', sortOrder: 1 },
      { tenantId: tenant.id, parentId: footerFestival.id, label: 'Rückschau', href: '/rueckschau', location: 'footer', sortOrder: 2 },
      { tenantId: tenant.id, parentId: footerFestival.id, label: 'Festival-Filme', href: '/festival-filme', location: 'footer', sortOrder: 3 },
    ],
  })

  const footerMitmachen = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Mitmachen', href: '#', location: 'footer', sortOrder: 1 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: footerMitmachen.id, label: 'Unterstützung', href: '/unterstuetzung', location: 'footer', sortOrder: 0 },
      { tenantId: tenant.id, parentId: footerMitmachen.id, label: 'Ihre Spende', href: '/unterstuetzung/spende', location: 'footer', sortOrder: 1 },
      { tenantId: tenant.id, parentId: footerMitmachen.id, label: 'Unsere Förderer', href: '/foerderer', location: 'footer', sortOrder: 2 },
      { tenantId: tenant.id, parentId: footerMitmachen.id, label: 'Kontakt', href: '/kontakt', location: 'footer', sortOrder: 3 },
    ],
  })

  const footerLegal = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Rechtshinweise', href: '#', location: 'footer', sortOrder: 2 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: footerLegal.id, label: 'Impressum', href: '/impressum', location: 'footer', sortOrder: 0 },
      { tenantId: tenant.id, parentId: footerLegal.id, label: 'Datenschutz und AGB', href: '/datenschutz', location: 'footer', sortOrder: 1 },
    ],
  })
  console.log('Menu items created (header + footer)')

  // ── Artists (Line-up 2026) ──────────────────────────────
  const lineup = [
    { slug: 'thorbjorn-risager', name: 'Thorbjørn Risager & The Black Tornado', origin: 'Dänemark', genres: ['Blues Rock', 'Soul'], featured: true, heroImage: 'https://e-ventschau.de/wp-content/uploads/2026/05/Thorbjorn-Risager-The-Black-Tornado-Daenemark-scaled.jpg' },
    { slug: 'lebron-johnson', name: 'Lebron Johnson', origin: 'Italien', genres: ['Rock', 'Funk'], featured: true, heroImage: 'https://e-ventschau.de/wp-content/uploads/2026/05/Lebron-Johnson-Italien.jpg' },
    { slug: 'killabeatmaker', name: 'Killabeatmaker', origin: 'Kolumbien', genres: ['Latin', 'Electronic'], featured: false, heroImage: 'https://e-ventschau.de/wp-content/uploads/2026/05/BMB4449-scaled-1-scaled.jpg' },
    { slug: 'jed-thomas-band', name: 'Jed Thomas Band', origin: 'Großbritannien', genres: ['Heavy Blues Rock'], featured: false, heroImage: 'https://e-ventschau.de/wp-content/uploads/2023/05/Jed-Thomas_small_CR_JRoberts.jpg' },
    { slug: 'rovar', name: 'ROVAR', origin: 'Münster', genres: ['Stoner', '70s Rock'], featured: false, heroImage: 'https://e-ventschau.de/wp-content/uploads/2026/05/Rovar-1.jpg' },
    { slug: 'nanny-goats', name: 'Nanny Goats', origin: 'Lüneburg', genres: ['Semi-Acoustic'], featured: false, heroImage: 'https://e-ventschau.de/wp-content/uploads/2026/05/Nanny-Goats-Sofa.jpg' },
    { slug: 'the-klaxon', name: 'The Klaxon', origin: 'Kolumbien', genres: ['Ska', 'Latin'], featured: false, heroImage: 'https://e-ventschau.de/wp-content/uploads/2026/05/The-Klaxon-2025-Edit.png' },
  ]
  for (const [i, band] of lineup.entries()) {
    await prisma.artist.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: band.slug } },
      update: { name: band.name, origin: band.origin, genres: band.genres, isFeatured: band.featured, isPublished: true, heroImage: band.heroImage },
      create: {
        tenantId: tenant.id, slug: band.slug, name: band.name, origin: band.origin,
        genres: band.genres, isFeatured: band.featured, isPublished: true, isActive: true, sortOrder: i, heroImage: band.heroImage,
      },
    })
  }
  console.log(`Artists seeded: ${lineup.length}`)

  // ── Event: e-Ventschau 2026 ─────────────────────────────
  const festival = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'e-ventschau-2026' } },
    update: {
      title: 'e-Ventschau 2026', subtitle: '11. Benefiz-Festival',
      startDate: new Date('2026-08-07T17:00:00+02:00'), endDate: new Date('2026-08-08T23:59:00+02:00'),
      locationName: 'Resthof Thiele, Ventschau', locationAddress: '21368 Ventschau, Landkreis Lüneburg',
      excerpt: 'Zwei Tage internationale Live-Musik für den guten Zweck.',
      eventType: 'festival', isPublished: true, isFeatured: true,
    },
    create: {
      tenantId: tenant.id, slug: 'e-ventschau-2026',
      title: 'e-Ventschau 2026', subtitle: '11. Benefiz-Festival', eventType: 'festival',
      startDate: new Date('2026-08-07T17:00:00+02:00'), endDate: new Date('2026-08-08T23:59:00+02:00'),
      locationName: 'Resthof Thiele, Ventschau', locationAddress: '21368 Ventschau, Landkreis Lüneburg',
      excerpt: 'Zwei Tage internationale Live-Musik für den guten Zweck.',
      isPublished: true, isFeatured: true, isActive: true, sortOrder: 0,
    },
  })

  // children: delete-then-recreate (idempotent re-seed)
  await prisma.appearance.deleteMany({ where: { eventId: festival.id } })
  await prisma.priceTier.deleteMany({ where: { eventId: festival.id } })
  await prisma.stage.deleteMany({ where: { eventId: festival.id } })

  const haupt = await prisma.stage.create({ data: { eventId: festival.id, name: 'Hauptbühne', color: '#b87333', sortOrder: 0 } })
  const zelt = await prisma.stage.create({ data: { eventId: festival.id, name: 'Zeltbühne', color: '#7c9a6c', sortOrder: 1 } })

  const bySlug = (slug: string) =>
    prisma.artist.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } })

  const [risager, lebron, killa, jed, rovar, nanny, klaxon] = await Promise.all([
    bySlug('thorbjorn-risager'), bySlug('lebron-johnson'), bySlug('killabeatmaker'),
    bySlug('jed-thomas-band'), bySlug('rovar'), bySlug('nanny-goats'), bySlug('the-klaxon'),
  ])

  const eventAppearances: { stageId: string; artistId?: string; title?: string; role: string; startTime: Date }[] = [
    // Freitag 07.08.
    { stageId: haupt.id, artistId: nanny?.id, role: 'support', startTime: new Date('2026-08-07T18:00:00+02:00') },
    { stageId: haupt.id, artistId: rovar?.id, role: 'support', startTime: new Date('2026-08-07T19:00:00+02:00') },
    { stageId: zelt.id, artistId: klaxon?.id, role: 'support', startTime: new Date('2026-08-07T19:00:00+02:00') },
    { stageId: haupt.id, artistId: jed?.id, role: 'support', startTime: new Date('2026-08-07T20:30:00+02:00') },
    { stageId: zelt.id, artistId: killa?.id, role: 'guest', startTime: new Date('2026-08-07T20:30:00+02:00') },
    { stageId: haupt.id, artistId: risager?.id, role: 'headliner', startTime: new Date('2026-08-07T22:00:00+02:00') },
    // Samstag 08.08.
    { stageId: haupt.id, title: 'Soundcheck & Begrüßung', role: 'break', startTime: new Date('2026-08-08T17:30:00+02:00') },
    { stageId: haupt.id, artistId: lebron?.id, role: 'support', startTime: new Date('2026-08-08T19:00:00+02:00') },
    { stageId: zelt.id, artistId: nanny?.id, role: 'support', startTime: new Date('2026-08-08T19:00:00+02:00') },
    { stageId: haupt.id, artistId: killa?.id, role: 'headliner', startTime: new Date('2026-08-08T21:30:00+02:00') },
  ]
  for (const [i, a] of eventAppearances.entries()) {
    await prisma.appearance.create({
      data: {
        eventId: festival.id, stageId: a.stageId,
        artistId: a.artistId ?? null, title: a.title ?? null,
        role: a.role, startTime: a.startTime, sortOrder: i,
      },
    })
  }

  await prisma.priceTier.createMany({
    data: [
      { eventId: festival.id, name: 'Festival-Pass (2 Tage)', price: 39, currency: 'EUR', sortOrder: 0 },
      { eventId: festival.id, name: 'Tagesticket', price: 22, currency: 'EUR', sortOrder: 1 },
      { eventId: festival.id, name: 'Early-Bird Festival-Pass', price: 29, currency: 'EUR', validFrom: new Date('2026-01-01T00:00:00+01:00'), validUntil: new Date('2026-04-30T23:59:00+02:00'), sortOrder: 2 },
      { eventId: festival.id, name: 'Förder-Ticket (Spende)', price: null, currency: 'EUR', sortOrder: 3 },
    ],
  })
  console.log(`Event seeded: e-Ventschau 2026 with ${eventAppearances.length} appearances`)

  // ── Content pages from src/content/*.md ─────────────────
  const contentDir = path.join(process.cwd(), 'src/content')
  const mdFiles = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'))
    : []

  let pageCount = 0
  for (const file of mdFiles) {
    const raw = fs.readFileSync(path.join(contentDir, file), 'utf8')
    const { data, content } = matter(raw)

    const slug: string = data.slug || file.replace(/\.md$/, '')
    const route: string = data.path || `/${slug}`
    const title: string = data.title || slug
    const description: string | null = data.description || null

    await prisma.page.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: {
        title,
        path: route,
        content,
        metaTitle: title,
        metaDescription: description,
        isPublished: true,
      },
      create: {
        tenantId: tenant.id,
        slug,
        path: route,
        title,
        content,
        metaTitle: title,
        metaDescription: description,
        isPublished: true,
      },
    })
    pageCount++
    console.log(`Page seeded: ${slug} → ${route}`)
  }

  console.log(`Seeding complete. ${pageCount} pages.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
