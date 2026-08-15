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
      let specs = {};
      if (cat.category === "Electronics") {
        const isHigh = idx >= 5;
        specs = {
          "Battery Life": isHigh ? "40 Hours" : "12 Hours",
          "Noise Cancelling": isHigh ? "Active (ANC) Smart Hybrid" : "Passive Isolation Only",
          "Connectivity": isHigh ? "Bluetooth 5.3 + Multipoint" : "Bluetooth 4.2",
          "Warranty": idx >= 8 ? "3 Years" : isHigh ? "2 Years" : "6 Months",
        };
      } else if (cat.category === "Footwear") {
        const isHigh = idx >= 5;
        specs = {
          "Sole Material": isHigh ? "Carbon Fiber Reinforced Rubber" : "Standard EVA Foam",
          "Breathability": isHigh ? "Ultra-Mesh Airknit" : "Standard Canvas",
          "Arch Support": isHigh ? "Orthotic-grade High Cushioning" : "Flat Foam Pad",
          "Warranty": idx >= 8 ? "1.5 Years" : isHigh ? "1 Year" : "3 Months",
        };
      } else if (cat.category === "Fashion") {
        const isHigh = idx >= 5;
        specs = {
          "Fabric": isHigh ? "100% Pima Organic Cotton" : "Polyester-Cotton Blend",
          "Fit": isHigh ? "Tailored Premium Fit" : "Regular Box Fit",
          "Stitching": isHigh ? "Reinforced Double Lock" : "Single Overlock",
          "Warranty": isHigh ? "1 Year Color Stay" : "30 Days Fade Limit",
        };
      } else if (cat.category === "Home & Kitchen") {
        const isHigh = idx >= 5;
        specs = {
          "Base Material": idx >= 8 ? "Tri-ply Heavy Stainless Steel" : isHigh ? "Hard Anodized Aluminum" : "Pressed Sheet Aluminum",
          "Coating Layers": idx >= 8 ? "6-Layer Diamond Granite Coating" : isHigh ? "3-Layer Titanium non-stick" : "Single Layer PTFE",
          "Handle Type": idx >= 8 ? "Riveted Stay-Cool Stainless Steel" : isHigh ? "Stay-Cool Bakelite Premium" : "Basic Welded Plastic",
          "Warranty": idx >= 8 ? "5 Years" : isHigh ? "3 Years" : "6 Months",
        };
      } else if (cat.category === "Fitness") {
        const isHigh = idx >= 5;
        specs = {
          "Thickness": idx >= 8 ? "10mm High-Density Cushion" : isHigh ? "6mm Comfort Layer" : "3mm Basic Foam",
          "Material": idx >= 8 ? "Natural Eco-Friendly Rubber" : isHigh ? "TPE Dual-Color Texture" : "Standard PVC Plastic",
          "Anti-slip": isHigh ? "Double-sided Premium grip" : "Single-sided wave texture",
          "Strap Included": isHigh ? "Yes (Premium Cotton Carrier)" : "Yes (Basic Elastic Loop)",
        };
      }

      products.push({
        name: `${cat.item} - ${t.tier}`,
        description: `${t.tier} tier ${cat.item.toLowerCase()} in the ${cat.category} range.`,
        category: cat.category,
        qualityTier: t.tier,
        price: Math.round(cat.basePrice * t.mult),
        image: `https://picsum.photos/seed/${cat.imgSeed}${idx}/400`,
        stock: 100 - idx * 5,
        rating: t.rating,
        specifications: specs,
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