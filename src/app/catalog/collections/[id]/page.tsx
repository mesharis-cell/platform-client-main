'use client';

/**
 * Collection Detail Page
 * Dedicated page for collection with full item list and add-to-cart
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useCatalogCollection } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Layers,
  Tag,
  ChevronRight,
  Package,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ClientNav } from '@/components/client-nav';
import { CollectionItemsList } from '@/components/catalog/collection-items-list';

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useCatalogCollection(id);

  const collection = data?.collection;

  if (isLoading) {
    return (
      <ClientNav>
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-8 w-48 mb-8" />
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </ClientNav>
    );
  }

  if (!collection) {
    return (
      <ClientNav>
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <Card className="max-w-md w-full p-10 text-center">
            <Layers className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold mb-3">Collection not found</h2>
            <p className="text-muted-foreground mb-6">
              The collection you're looking for doesn't exist or has been removed
            </p>
            <Link href="/catalog">
              <Button className="gap-2 font-mono">
                <ArrowLeft className="h-4 w-4" />
                Back to Catalog
              </Button>
            </Link>
          </Card>
        </div>
      </ClientNav>
    );
  }

  return (
    <ClientNav>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="max-w-6xl mx-auto px-8 py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 font-mono">
            <Link href="/catalog" className="hover:text-foreground transition-colors">
              Catalog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{collection.name}</span>
          </div>

          {/* Collection Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" className="font-mono">
                <Layers className="w-3 h-3 mr-1.5" />
                Collection
              </Badge>
              {collection.brand && (
                <Badge variant="outline" className="font-mono gap-1.5">
                  <Tag className="w-3 h-3" />
                  {collection.brand.name}
                </Badge>
              )}
              <Badge variant="outline" className="font-mono">
                {collection.category}
              </Badge>
            </div>

            <h1 className="text-5xl font-bold mb-4 text-foreground">
              {collection.name}
            </h1>

            {collection.description && (
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {collection.description}
              </p>
            )}
          </div>

          {/* Collection Images */}
          {collection.images.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              {collection.images.slice(0, 3).map((image, index) => (
                <div
                  key={index}
                  className="aspect-video rounded-lg overflow-hidden border border-border relative"
                >
                  <Image
                    src={image}
                    alt={`${collection.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Collection Items List with Add to Cart */}
          <CollectionItemsList collectionId={collection.id} />
        </div>
      </div>
    </ClientNav>
  );
}
