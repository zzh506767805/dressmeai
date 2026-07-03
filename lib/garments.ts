export type GarmentCategory = 'dresses' | 'tops' | 'outerwear';

export interface Garment {
  id: string;
  // Public path under /garments; must resolve to an absolute URL reachable by
  // the DashScope API when used for generation.
  image: string;
  category: GarmentCategory;
  // Key into the landing.garmentGallery.items translation namespace.
  nameKey: string;
}

export const GARMENTS: Garment[] = [
  { id: 'dress-floral', image: '/garments/dress-floral.jpg', category: 'dresses', nameKey: 'dressFloral' },
  { id: 'dress-black', image: '/garments/dress-black.jpg', category: 'dresses', nameKey: 'dressBlack' },
  { id: 'top-white-blouse', image: '/garments/top-white-blouse.jpg', category: 'tops', nameKey: 'topWhiteBlouse' },
  { id: 'sweater-beige', image: '/garments/sweater-beige.jpg', category: 'tops', nameKey: 'sweaterBeige' },
  { id: 'jacket-denim', image: '/garments/jacket-denim.jpg', category: 'outerwear', nameKey: 'jacketDenim' },
  { id: 'coat-camel', image: '/garments/coat-camel.jpg', category: 'outerwear', nameKey: 'coatCamel' },
  { id: 'shirt-white-oxford', image: '/garments/shirt-white-oxford.jpg', category: 'tops', nameKey: 'shirtWhiteOxford' },
  { id: 'blazer-navy', image: '/garments/blazer-navy.jpg', category: 'outerwear', nameKey: 'blazerNavy' },
  { id: 'tshirt-grey', image: '/garments/tshirt-grey.jpg', category: 'tops', nameKey: 'tshirtGrey' },
  { id: 'hoodie-black', image: '/garments/hoodie-black.jpg', category: 'tops', nameKey: 'hoodieBlack' },
  { id: 'jacket-leather', image: '/garments/jacket-leather.jpg', category: 'outerwear', nameKey: 'jacketLeather' },
  { id: 'shirt-linen-blue', image: '/garments/shirt-linen-blue.jpg', category: 'tops', nameKey: 'shirtLinenBlue' },
];

export function garmentAbsoluteUrl(garment: Garment): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com';
  return `${base}${garment.image}`;
}
