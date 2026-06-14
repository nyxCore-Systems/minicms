import { NextResponse } from 'next/server'
import { getCategoryBySlug } from '@/lib/categories'
import { getProductsByTagSlug } from '@/lib/products-db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug parameter required' }, { status: 400 })
  }

  // Priority: category -> tag
  const category = await getCategoryBySlug(slug)
  if (category) {
    return NextResponse.json(
      { products: category.products, title: category.name },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  }

  const tagData = await getProductsByTagSlug(slug)
  if (tagData) {
    return NextResponse.json(
      { products: tagData.products, title: tagData.tag },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  }

  return NextResponse.json({ products: [], title: slug }, { status: 404 })
}
