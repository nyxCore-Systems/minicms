'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import VendorClickTracker from '@/components/VendorClickTracker'

interface Product {
  id: string
  label: string
  url: string
  image: string | null
  content: string | null
  tags: string[]
  vendor: {
    id: string
    name: string
    slug: string
    imageUrl: string | null
    logoUrl: string | null
  }
}

interface VendorGroup {
  vendorName: string
  vendorSlug: string
  vendorImage: string | null
  vendorLogo: string | null
  products: Product[]
}

function groupByVendor(products: Product[]): Map<string, VendorGroup> {
  const groups = new Map<string, VendorGroup>()
  for (const product of products) {
    const key = product.vendor.slug
    if (!groups.has(key)) {
      groups.set(key, {
        vendorName: product.vendor.name,
        vendorSlug: product.vendor.slug,
        vendorImage: product.vendor.imageUrl,
        vendorLogo: product.vendor.logoUrl,
        products: [],
      })
    }
    groups.get(key)!.products.push(product)
  }
  return groups
}

export default function ProductsBlock({ slug }: { slug: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || [])
        setTitle(data.title || slug)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="not-prose my-8 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-6 animate-pulse">
            <div className="w-2/5 aspect-[4/3] bg-neutral-200 rounded" />
            <div className="flex-1 space-y-3 py-4">
              <div className="h-6 w-1/2 bg-neutral-200 rounded" />
              <div className="h-4 w-3/4 bg-neutral-100 rounded" />
              <div className="h-4 w-1/3 bg-neutral-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) return null

  const vendorGroups = groupByVendor(products)
  let globalIndex = 0

  return (
    <div className="not-prose my-8">
      {title && (
        <h3 className="font-display text-2xl font-bold text-black mb-6">{title}</h3>
      )}
      <div className="space-y-16">
        {Array.from(vendorGroups.values()).map((group) => (
          <div key={group.vendorSlug}>
            <div className="flex items-center gap-3 pb-4 mb-8 border-b-[3px] border-black">
              {group.vendorLogo ? (
                <Image
                  src={group.vendorLogo}
                  alt={group.vendorName}
                  width={40}
                  height={40}
                  className="rounded-full object-cover grayscale"
                />
              ) : group.vendorImage ? (
                <Image
                  src={group.vendorImage}
                  alt={group.vendorName}
                  width={40}
                  height={40}
                  className="rounded-full object-cover grayscale"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                  <span className="text-sm font-bold text-black">
                    {group.vendorName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h4 className="text-xl font-display font-bold text-black tracking-tight">
                  {group.vendorName}
                </h4>
                <p className="text-xs text-black/50 uppercase tracking-widest">
                  {group.products.length}{' '}
                  {group.products.length === 1 ? 'Produkt' : 'Produkte'}
                </p>
              </div>
            </div>

            <div className="space-y-10">
              {group.products.map((product) => {
                const index = globalIndex++
                const imageLeft = index % 2 === 0

                return (
                  <div
                    key={product.id}
                    className={`flex flex-col ${imageLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 md:gap-10 items-stretch group`}
                  >
                    <div className="relative w-full md:w-2/5 aspect-[4/3] md:aspect-auto md:min-h-[280px] overflow-hidden bg-neutral-100 flex-shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.label}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                          <svg
                            className="w-16 h-16 text-neutral-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0020.25 4.5H3.75A2.25 2.25 0 001.5 6.75v11.25c0 1.242 1.008 2.25 2.25 2.25z"
                            />
                          </svg>
                        </div>
                      )}
                      {product.vendor.logoUrl && (
                        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full overflow-hidden bg-white shadow-md ring-1 ring-black/10">
                          <Image
                            src={product.vendor.logoUrl}
                            alt={product.vendor.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-2">
                      <h5 className="font-display text-2xl md:text-3xl font-bold text-black mb-3 leading-tight">
                        {product.label}
                      </h5>
                      {product.content && (
                        <p className="text-base text-black/60 mb-4 leading-relaxed line-clamp-3">
                          {product.content}
                        </p>
                      )}
                      {product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                          {product.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="px-3 py-1 text-xs font-medium text-black/70 bg-black/5 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <VendorClickTracker
                          vendorId={product.vendor.id}
                          clickType="product_click"
                          href={product.url}
                          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-black hover:bg-black/80 transition-colors"
                        >
                          Zum Hersteller-Shop
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </VendorClickTracker>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
