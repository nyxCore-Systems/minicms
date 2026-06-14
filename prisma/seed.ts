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
    data: { tenantId: tenant.id, label: 'Programm 2026', href: '/programm-2026', sortOrder: 2 },
  })

  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Künstler', href: '/kuenstler', sortOrder: 3 },
  })

  const rueckschau = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Rückschau', href: '/rueckschau', sortOrder: 4 },
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
    data: { tenantId: tenant.id, label: 'Presse', href: '/presse', sortOrder: 5 },
  })

  const unterstuetzung = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Unterstützung', href: '/unterstuetzung', sortOrder: 6 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: unterstuetzung.id, label: 'Ihre Spende', href: '/unterstuetzung/spende', sortOrder: 0 },
      { tenantId: tenant.id, parentId: unterstuetzung.id, label: 'Unsere Förderer', href: '/foerderer', sortOrder: 1 },
    ],
  })

  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Kontakt', href: '/kontakt', sortOrder: 7 },
  })

  // Footer
  const footerFestival = await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Festival', href: '#', location: 'footer', sortOrder: 0 },
  })
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, parentId: footerFestival.id, label: 'Programm 2026', href: '/programm-2026', location: 'footer', sortOrder: 0 },
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
    { slug: 'thorbjorn-risager', name: 'Thorbjørn Risager & The Black Tornado', origin: 'Dänemark', genres: ['Blues Rock', 'Soul'], featured: true },
    { slug: 'lebron-johnson', name: 'Lebron Johnson', origin: 'Italien', genres: ['Rock', 'Funk'], featured: true },
    { slug: 'killabeatmaker', name: 'Killabeatmaker', origin: 'Kolumbien', genres: ['Latin', 'Electronic'], featured: false },
    { slug: 'jed-thomas-band', name: 'Jed Thomas Band', origin: 'Großbritannien', genres: ['Heavy Blues Rock'], featured: false },
    { slug: 'rovar', name: 'ROVAR', origin: 'Münster', genres: ['Stoner', '70s Rock'], featured: false },
    { slug: 'nanny-goats', name: 'Nanny Goats', origin: 'Lüneburg', genres: ['Semi-Acoustic'], featured: false },
    { slug: 'the-klaxon', name: 'The Klaxon', origin: 'Kolumbien', genres: ['Ska', 'Latin'], featured: false },
  ]
  for (const [i, band] of lineup.entries()) {
    await prisma.artist.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: band.slug } },
      update: { name: band.name, origin: band.origin, genres: band.genres, isFeatured: band.featured, isPublished: true },
      create: {
        tenantId: tenant.id, slug: band.slug, name: band.name, origin: band.origin,
        genres: band.genres, isFeatured: band.featured, isPublished: true, isActive: true, sortOrder: i,
      },
    })
  }
  console.log(`Artists seeded: ${lineup.length}`)

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
