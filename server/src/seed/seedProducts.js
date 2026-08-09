import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";

dotenv.config();

// 5 product categories, each with 10 quality/price variants of the same item
const TIERS = [
  { tier: "Economy",      mult: 0.55, rating: 3.6 },
  { tier: "Basic",        mult: 0.7,  rating: 3.8 },
  { tier: "Standard",     mult: 0.85, rating: 4.0 },
  { tier: "Standard+",    mult: 1.0,  rating: 4.1 },
  { tier: "Advanced",     mult: 1.2,  rating: 4.2 },
  { tier: "Premium",      mult: 1.45, rating: 4.4 },
  { tier: "Premium+",     mult: 1.7,  rating: 4.5 },
  { tier: "Pro",          mult: 2.0,  rating: 4.6 },
  { tier: "Pro Max",      mult: 2.4,  rating: 4.8 },
  { tier: "Elite",        mult: 2.9,  rating: 4.9 },
];

const CATEGORIES = [
  { category: "Electronics",     item: "Wireless Headphones", basePrice: 1800, imgSeed: "headphones" },
  { category: "Footwear",        item: "Running Shoes",       basePrice: 1500, imgSeed: "shoes" },
  { category: "Fashion",         item: "Cotton T-Shirt",      basePrice: 400,  imgSeed: "tshirt" },
  { category: "Home & Kitchen",  item: "Non-Stick Cookware Set", basePrice: 2200, imgSeed: "cookware" },
  { category: "Fitness",         item: "Yoga Mat",            basePrice: 700,  imgSeed: "yogamat" },
];

const buildProducts = () => {
  const products = [];
  for (const cat of CATEGORIES) {
    TIERS.forEach((t, idx) => {
      products.push({
        name: `${cat.item} - ${t.tier}`,
        description: `${t.tier} tier ${cat.item.toLowerCase()} in the ${cat.category} range.`,
        category: cat.category,
        qualityTier: t.tier,
        price: Math.round(cat.basePrice * t.mult),
        image: `https://picsum.photos/seed/${cat.imgSeed}${idx}/400`,
        stock: 100 - idx * 5,
        rating: t.rating,
      });
    });
  }
  return products;
};

const run = async () => {
  await connectDB();
  const products = buildProducts();
  await Product.deleteMany();
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products across ${CATEGORIES.length} categories (10 variants each)`);
  process.exit();
};

run();