/** gstBasis is basis points: 500 = 5%. Unbranded staples are zero-rated in India. */
export const categories = [
  {
    slug: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    gstBasis: 0,
    displayOrder: 1,
    iconUrl:
      'https://alpinecardiology.com/wp-content/uploads/AC-Fruits-and-Vegetables.jpg',
  },
  {
    slug: 'dairy',
    name: 'Dairy',
    gstBasis: 500,
    displayOrder: 2,
    iconUrl:
      'https://media.istockphoto.com/id/544807136/photo/various-fresh-dairy-products.jpg?s=612x612&w=0&k=20&c=U5T70bi24itoTDive1CVonJbJ97ChyL2Pz1I2kOoSRo=',
  },
  {
    slug: 'bakery',
    name: 'Bakery',
    gstBasis: 500,
    displayOrder: 3,
    iconUrl:
      'https://www.atlanticse.com/cdn/shop/articles/types_of_bakeries.png?v=1776516817',
  },
  {
    slug: 'beverages',
    name: 'Beverages',
    gstBasis: 1200,
    displayOrder: 4,
    iconUrl:
      'https://midaswellnesshub.com/wp-content/uploads/2025/12/571b3ecb0e3c4b0ab1d6723d72df48c0_1080w-1200x675.jpg',
  },
  {
    slug: 'snacks',
    name: 'Snacks',
    gstBasis: 1200,
    displayOrder: 5,
    iconUrl:
      'https://static.vecteezy.com/system/resources/thumbnails/072/494/618/small/colorful-snack-assortment-with-chips-candy-and-pretzels-on-a-vibrant-background-photo.jpg',
  },
  {
    slug: 'staples',
    name: 'Staples',
    gstBasis: 0,
    displayOrder: 6,
    iconUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLHwHxkMo0BLvt2rHpj8ItkbBGI17qXwCsozoQezpV124hCOLINmTJZHA&s=10',
  },
  {
    slug: 'rice-grains',
    name: 'Rice & Grains',
    gstBasis: 0,
    displayOrder: 7,
    iconUrl:
      'https://media.gettyimages.com/id/175513745/photo/rice-background.jpg?s=612x612&w=gi&k=20&c=KM5fBFhcsb995PpvGxKVoYUpQ5udl9jfP-7cD6RU2V4=',
  },
  {
    slug: 'personal-care',
    name: 'Personal Care',
    gstBasis: 1800,
    displayOrder: 8,
    iconUrl:
      'https://images.verifiedmarketresearch.com/assets/Top-7-personal-care-product-companies-empowering-beauty-and-enhancing-well-being.jpg',
  },
  {
    slug: 'household',
    name: 'Household',
    gstBasis: 1800,
    displayOrder: 9,
    iconUrl:
      'https://t4.ftcdn.net/jpg/01/26/22/35/360_F_126223524_jmPiyWiPtuWJpYCyVtypcysV2ebS59lf.jpg',
  },
  {
    slug: 'frozen-foods',
    name: 'Frozen Foods',
    gstBasis: 1200,
    displayOrder: 10,
    iconUrl:
      'https://content.jdmagicbox.com/v2/comp/chennai/g8/044pxx44.xx44.240805181205.k8g8/catalogue/frosty-delitz-girigori-nagar-chennai-frozen-food-product-retailers-7DQ9qIkE2y.jpg',
  },
] as const;