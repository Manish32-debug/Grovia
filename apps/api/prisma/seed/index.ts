/**
 * Grovia seed — idempotent and deterministic.
 *
 * Catalog rows are upserted on their natural keys, so re-running never
 * duplicates them. Generated order history is deleted and rebuilt each run
 * (identified by the SEED- order-number prefix) from a fixed PRNG seed, so the
 * association rules and Smart Basket predictions built from it in phase 11 are
 * reproducible rather than a different random draw every time.
 *
 *   pnpm db:seed
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { applyPercent } from '@grovia/shared';
import { categories } from './data/categories.js';
import { products, type SeedProduct } from './data/products.js';
import { coupons } from './data/coupons.js';
import { dateOnly, daysAgo, mulberry32, pick, randInt } from './helpers.js';

const prisma = new PrismaClient();
const rng = mulberry32(20260912);

const DELIVERY_FEE_PAISE = 3900;
const FREE_DELIVERY_THRESHOLD_PAISE = 49900;

/** Every seeded account uses this password. Never used outside development. */
const DEV_PASSWORD = 'Grovia@123';

const priceOf = (p: SeedProduct) => {
  const mrpPaise = p.mrp * 100;

  return {
    mrpPaise,
    pricePaise:
      mrpPaise -
      applyPercent(mrpPaise, p.discountPercent),
  };
};

async function seedCategories() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        gstBasis: c.gstBasis,
        displayOrder: c.displayOrder,
      },
      update: {
        name: c.name,
        gstBasis: c.gstBasis,
        displayOrder: c.displayOrder,
      },
    });
  }

  console.log(`  categories: ${categories.length}`);
}

async function seedProducts() {
  const categoryIdBySlug = new Map(
    (
      await prisma.category.findMany({
        select: {
          id: true,
          slug: true,
        },
      })
    ).map((c) => [c.slug, c.id]),
  );

  for (const p of products) {
    const categoryId =
      categoryIdBySlug.get(p.categorySlug);

    if (!categoryId) {
      throw new Error(
        `Unknown category "${p.categorySlug}" on product "${p.slug}"`,
      );
    }

    const { mrpPaise, pricePaise } = priceOf(p);

    const fields = {
      name: p.name,
      brand: p.brand ?? null,
      description: p.description ?? null,
      categoryId,
      unit: p.unit,
      mrpPaise,
      discountPercent: p.discountPercent,
      pricePaise,
      nutrition:
        (p.nutrition ?? null) as Prisma.InputJsonValue,
      tags: p.tags ?? [],
    };

    const product =
      await prisma.product.upsert({
        where: {
          slug: p.slug,
        },
        create: {
          slug: p.slug,
          ...fields,
        },
        update: fields,
      });

    await prisma.inventory.upsert({
      where: {
        productId: product.id,
      },
      create: {
        productId: product.id,
        stock: p.stock,
        reserved: 0,
        lowStockThreshold:
          p.lowStockThreshold ?? 10,
      },
      update: {
        stock: p.stock,
        lowStockThreshold:
          p.lowStockThreshold ?? 10,
      },
    });

    // Always replace the primary image so re-seeding updates image URLs.
    // This removes stale placeholder/random image records from earlier seeds.
    await prisma.productImage.deleteMany({
      where: {
        productId: product.id,
      },
    });

    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: p.imageUrl,
        alt: `${p.name}${p.brand ? ` by ${p.brand}` : ''}, ${p.unit}`,
        isPrimary: true,
        displayOrder: 0,
      },
    });
  }

  console.log(
    `  products: ${products.length} (with inventory and a primary image each)`,
  );
}

async function seedUsers() {
  const passwordHash =
    await hash(DEV_PASSWORD);

  const people = [
    {
      email: 'admin@grovia.test',
      name: 'Grovia Admin',
      role: 'ADMIN' as const,
    },
    {
      email: 'rider1@grovia.test',
      name: 'Karthik Raja',
      role: 'DELIVERY_PARTNER' as const,
    },
    {
      email: 'rider2@grovia.test',
      name: 'Suresh Kumar',
      role: 'DELIVERY_PARTNER' as const,
    },
    {
      email: 'aarthi@grovia.test',
      name: 'Aarthi Narayanan',
      role: 'CUSTOMER' as const,
    },
    {
      email: 'vikram@grovia.test',
      name: 'Vikram Shetty',
      role: 'CUSTOMER' as const,
    },
    {
      email: 'fatima@grovia.test',
      name: 'Fatima Beevi',
      role: 'CUSTOMER' as const,
    },
    {
      email: 'joel@grovia.test',
      name: 'Joel Mathew',
      role: 'CUSTOMER' as const,
    },
    {
      email: 'divya@grovia.test',
      name: 'Divya Ramesh',
      role: 'CUSTOMER' as const,
    },
  ];

  for (const person of people) {
    const user =
      await prisma.user.upsert({
        where: {
          email: person.email,
        },
        create: {
          ...person,
          passwordHash,
          emailVerifiedAt: new Date(),
          phone: '9840000000',
        },
        update: {
          name: person.name,
          role: person.role,
          emailVerifiedAt: new Date(),
        },
      });

    if (
      person.role ===
      'DELIVERY_PARTNER'
    ) {
      await prisma.deliveryPartner.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          vehicleType: 'Two-wheeler',
          currentZone: 'Chennai South',
        },
        update: {},
      });
    }

    if (person.role === 'CUSTOMER') {
      await prisma.cart.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
        },
        update: {},
      });

      await prisma.wishlist.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
        },
        update: {},
      });

      const addressCount =
        await prisma.address.count({
          where: {
            userId: user.id,
          },
        });

      if (addressCount === 0) {
        await prisma.address.create({
          data: {
            userId: user.id,
            label: 'HOME',
            contactName: person.name,
            contactPhone: '9840000000',
            line1: `${randInt(rng, 1, 90)}, Anna Nagar ${pick(
              rng,
              ['East', 'West'],
            )}`,
            line2: 'Near the water tank',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600040',
            isDefault: true,
          },
        });
      }
    }
  }

  console.log(
    `  users: ${people.length} (1 admin, 2 delivery partners, 5 customers)`,
  );
}

async function seedSlots() {
  const templates = [
    {
      startMinute: 8 * 60,
      endMinute: 10 * 60,
      capacity: 25,
    },
    {
      startMinute: 14 * 60,
      endMinute: 16 * 60,
      capacity: 30,
    },
    {
      startMinute: 16 * 60,
      endMinute: 18 * 60,
      capacity: 30,
    },
    {
      startMinute: 18 * 60,
      endMinute: 20 * 60,
      capacity: 35,
    },
  ];

  for (const t of templates) {
    const template =
      await prisma.slotTemplate.upsert({
        where: {
          startMinute_endMinute: {
            startMinute:
              t.startMinute,
            endMinute:
              t.endMinute,
          },
        },
        create: t,
        update: {
          capacity: t.capacity,
          isActive: true,
        },
      });

    // Seven days of instances. Phase 11 adds a rolling generator job.
    for (
      let offset = 0;
      offset < 7;
      offset++
    ) {
      const date = dateOnly(
        daysAgo(-offset),
      );

      await prisma.slotInstance.upsert({
        where: {
          templateId_date: {
            templateId:
              template.id,
            date,
          },
        },
        create: {
          templateId:
            template.id,
          date,
          capacity:
            t.capacity,
        },
        update: {
          capacity:
            t.capacity,
        },
      });
    }
  }

  console.log(
    `  delivery slots: ${templates.length} templates x 7 days`,
  );
}

async function seedCoupons() {
  const dairy =
    await prisma.category.findUnique({
      where: {
        slug: 'dairy',
      },
    });

  for (const c of coupons) {
    /*
     * Expired coupons still need a valid chronological range because the
     * database requires expiresAt > startsAt.
     *
     * For an expired coupon:
     *   startsAt = 2 days ago
     *   expiresAt = 1 day ago
     *
     * For active coupons:
     *   startsAt = yesterday
     *   expiresAt = daysValid from now
     */
    const startsAt =
      c.daysValid < 0
        ? daysAgo(2)
        : daysAgo(1);

    const expiresAt =
      c.daysValid < 0
        ? daysAgo(1)
        : daysAgo(-c.daysValid);

    const applicableCategoryIds =
      'categorySlugs' in c &&
      c.categorySlugs?.includes('dairy') &&
      dairy
        ? [dairy.id]
        : [];

    const fields = {
      description: c.description,
      discountType: c.discountType,
      value: c.value,
      minOrderPaise:
        c.minOrderPaise,
      maxDiscountPaise:
        c.maxDiscountPaise,
      perUserLimit:
        c.perUserLimit,
      usageLimit:
        c.usageLimit,
      startsAt,
      expiresAt,
      applicableCategoryIds,
      isActive:
        c.daysValid > 0,
    };

    await prisma.coupon.upsert({
      where: {
        code: c.code,
      },
      create: {
        code: c.code,
        ...fields,
      },
      update: fields,
    });
  }

  console.log(
    `  coupons: ${coupons.length} (including one expired, for negative-path tests)`,
  );
}

/**
 * Baskets people actually buy together. The archetypes are what give the phase
 * 11 co-occurrence matrix real signal — a uniformly random basket produces
 * lift ≈ 1 for every pair and therefore no recommendations worth showing.
 */
const ARCHETYPES: Record<
  string,
  string[]
> = {
  breakfast: [
    'bread-white',
    'butter-100g',
    'eggs-12',
    'milk-toned-1l',
  ],
  southIndian: [
    'idli-rava-1kg',
    'urad-dal-500g',
    'curd-400g',
    'chilli-powder',
  ],
  weeklyStaples: [
    'ponni-rice-5kg',
    'toor-dal-1kg',
    'sunflower-oil-1l',
    'sugar-1kg',
    'salt-1kg',
  ],
  fresh: [
    'tomato-local',
    'onion-nashik',
    'potato',
    'carrot-ooty',
    'spinach-palak',
  ],
  teaTime: [
    'tea-dust-500g',
    'biscuits-marie',
    'rusk-toast',
    'milk-toned-1l',
  ],
  cleaning: [
    'dish-wash-liquid',
    'detergent-1kg',
    'garbage-bags',
  ],
};

async function seedOrderHistory() {
  // Rebuild rather than append, so the history is a pure function of the PRNG seed.
  const removed =
    await prisma.order.deleteMany({
      where: {
        orderNumber: {
          startsWith: 'SEED-',
        },
      },
    });

  const customers =
    await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
      },
      include: {
        addresses: {
          where: {
            deletedAt: null,
          },
          take: 1,
        },
      },
    });

  const catalog =
    await prisma.product.findMany({
      include: {
        category: {
          select: {
            gstBasis: true,
          },
        },
        images: {
          where: {
            isPrimary: true,
          },
          take: 1,
        },
      },
    });

  const bySlug = new Map(
    catalog.map((p) => [
      p.slug,
      p,
    ]),
  );

  const archetypeNames =
    Object.keys(ARCHETYPES);

  let orderCount = 0;
  let sequence = 0;

  for (const customer of customers) {
    const address =
      customer.addresses[0];

    if (!address) continue;

    const ordersForCustomer =
      randInt(rng, 8, 14);

    for (
      let i = 0;
      i < ordersForCustomer;
      i++
    ) {
      const placedAt =
        daysAgo(
          randInt(rng, 1, 90),
        );

      // One or two archetypes, most of their items, plus a little noise.
      const chosen =
        new Set<string>();

      const archetypeCount =
        rng() < 0.35
          ? 2
          : 1;

      for (
        let a = 0;
        a < archetypeCount;
        a++
      ) {
        for (
          const slug of
            ARCHETYPES[
              pick(
                rng,
                archetypeNames,
              )
            ] ?? []
        ) {
          if (rng() < 0.8) {
            chosen.add(slug);
          }
        }
      }

      for (
        let n = 0;
        n < randInt(rng, 0, 2);
        n++
      ) {
        chosen.add(
          pick(
            rng,
            catalog,
          ).slug,
        );
      }

      if (chosen.size === 0) {
        continue;
      }

      const items = [...chosen]
        .map((slug) =>
          bySlug.get(slug),
        )
        .filter(
          (
            p,
          ): p is NonNullable<
            typeof p
          > => Boolean(p),
        )
        .map((product) => {
          const quantity =
            randInt(rng, 1, 3);

          return {
            productId:
              product.id,
            nameSnapshot:
              product.name,
            brandSnapshot:
              product.brand,
            unitSnapshot:
              product.unit,
            imageSnapshot:
              product.images[0]
                ?.url ?? null,
            unitPricePaise:
              product.pricePaise,
            discountPaise: 0,
            quantity,
            lineTotalPaise:
              product.pricePaise *
              quantity,
            gstBasis:
              product.category
                .gstBasis,
          };
        });

      const subtotalPaise =
        items.reduce(
          (sum, it) =>
            sum +
            it.lineTotalPaise,
          0,
        );

      const taxPaise =
        items.reduce(
          (sum, it) =>
            sum +
            Math.round(
              (it.lineTotalPaise *
                it.gstBasis) /
                10000,
            ),
          0,
        );

      const deliveryFeePaise =
        subtotalPaise >=
        FREE_DELIVERY_THRESHOLD_PAISE
          ? 0
          : DELIVERY_FEE_PAISE;

      const discountPaise = 0;

      const totalPaise =
        subtotalPaise -
        discountPaise +
        deliveryFeePaise +
        taxPaise;

      const orderNumber =
        `SEED-${String(
          ++sequence,
        ).padStart(5, '0')}`;

      const deliveredAt =
        new Date(
          placedAt.getTime() +
            6 * 60 * 60 * 1000,
        );

      const order =
        await prisma.order.create({
          data: {
            orderNumber,
            userId:
              customer.id,
            status:
              'DELIVERED',
            addressSnapshot: {
              label:
                address.label,
              contactName:
                address.contactName,
              contactPhone:
                address.contactPhone,
              line1:
                address.line1,
              line2:
                address.line2,
              city:
                address.city,
              state:
                address.state,
              pincode:
                address.pincode,
            } satisfies Prisma.InputJsonObject,
            subtotalPaise,
            discountPaise,
            deliveryFeePaise,
            taxPaise,
            totalPaise,
            paymentMode:
              rng() < 0.7
                ? 'UPI_QR'
                : 'COD',
            placedAt,
            confirmedAt:
              new Date(
                placedAt.getTime() +
                  15 * 60 * 1000,
              ),
            deliveredAt,
            createdAt:
              placedAt,
            items: {
              create:
                items.map(
                  ({
                    gstBasis:
                      _gst,
                    ...item
                  }) => item,
                ),
            },
          },
        });

      const chain = [
        'PLACED',
        'CONFIRMED',
        'PACKING',
        'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ] as const;

      await prisma.orderStatusHistory.createMany(
        {
          data: chain.map(
            (
              toStatus,
              index,
            ) => ({
              orderId:
                order.id,
              fromStatus:
                index === 0
                  ? null
                  : chain[
                      index - 1
                    ],
              toStatus,
              createdAt:
                new Date(
                  placedAt.getTime() +
                    index *
                      60 *
                      60 *
                      1000,
                ),
              note:
                'Seeded history',
            }),
          ),
        },
      );

      await prisma.payment.create({
        data: {
          orderId:
            order.id,
          gatewayOrderId:
            `seed_${orderNumber}`,
          cfPaymentId:
            `seed_cf_${orderNumber}`,
          method:
            order.paymentMode,
          status:
            'SUCCESS',
          amountPaise:
            totalPaise,
          settledAt:
            placedAt,
          createdAt:
            placedAt,
        },
      });

      orderCount++;
    }
  }

  console.log(
    `  order history: ${orderCount} delivered orders across ${customers.length} customers` +
      (removed.count
        ? ` (replaced ${removed.count} from a previous run)`
        : ''),
  );
}

async function seedReviews() {
  const delivered =
    await prisma.order.findMany({
      where: {
        status:
          'DELIVERED',
        orderNumber: {
          startsWith:
            'SEED-',
        },
      },
      include: {
        items: {
          select: {
            productId: true,
          },
        },
      },
      take: 120,
    });

  const bodies = [
    'Arrived fresh and well packed.',
    'Good quality for the price. Will reorder.',
    'Exactly as described. Delivery was on time.',
    'Decent, though the pack was slightly smaller than I expected.',
    'Have been buying this weekly for a while now.',
  ];

  let created = 0;

  for (const order of delivered) {
    for (
      const item of order.items
    ) {
      if (rng() > 0.18) {
        continue;
      }

      const rating =
        rng() < 0.72
          ? randInt(rng, 4, 5)
          : randInt(rng, 2, 3);

      try {
        await prisma.review.create({
          data: {
            userId:
              order.userId,
            productId:
              item.productId,
            orderId:
              order.id,
            rating,
            body: pick(
              rng,
              bodies,
            ),
            isVerifiedPurchase:
              true,
            status:
              'APPROVED',
          },
        });

        created++;
      } catch {
        // @@unique([userId, productId]) — this customer already reviewed it.
      }
    }
  }

  // Denormalised aggregates, recomputed from the source of truth.
  const grouped =
    await prisma.review.groupBy({
      by: ['productId'],
      where: {
        status:
          'APPROVED',
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });

  for (const g of grouped) {
    await prisma.product.update({
      where: {
        id: g.productId,
      },
      data: {
        ratingAvg:
          Math.round(
            (g._avg.rating ??
              0) *
              10,
          ) / 10,
        ratingCount:
          g._count._all,
      },
    });
  }

  console.log(
    `  reviews: ${created} verified reviews across ${grouped.length} products`,
  );
}

async function main() {
  console.log(
    'Seeding Grovia…',
  );

  await seedCategories();
  await seedProducts();
  await seedUsers();
  await seedSlots();
  await seedCoupons();
  await seedOrderHistory();
  await seedReviews();

  console.log(
    `\nDone. Every seeded account signs in with: ${DEV_PASSWORD}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() =>
    prisma.$disconnect(),
  );