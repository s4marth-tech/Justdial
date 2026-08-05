import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

async function main() {
  const categories = [
    { name: "Restaurants", slug: "restaurants", icon: "utensils" },
    { name: "Electricians", slug: "electricians", icon: "zap" },
    { name: "Plumbers", slug: "plumbers", icon: "wrench" },
    { name: "Doctors", slug: "doctors", icon: "stethoscope" },
    { name: "Salons & Spas", slug: "salons-spas", icon: "scissors" },
    { name: "Gyms & Fitness", slug: "gyms-fitness", icon: "dumbbell" },
    { name: "Home Cleaning Services", slug: "home-cleaning", icon: "sparkles" },
    { name: "Packers & Movers", slug: "packers-movers", icon: "truck" },
    { name: "Wedding Photographers", slug: "wedding-photographers", icon: "camera" },
  ];

  const categoryRecords = await Promise.all(
    categories.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, icon: c.icon },
        create: c,
      })
    )
  );
  const categoryBySlug = Object.fromEntries(
    categoryRecords.map((c) => [c.slug, c])
  );

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@justdial.test" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "owner@justdial.test",
      passwordHash,
      role: "BUSINESS_OWNER",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@justdial.test" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@justdial.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: "user@justdial.test" },
    update: {},
    create: {
      name: "Rahul Verma",
      email: "user@justdial.test",
      passwordHash,
      role: "USER",
    },
  });

  const businesses = [
    {
      slug: "spice-garden-restaurant-mumbai",
      name: "Spice Garden Restaurant",
      description: "Authentic North Indian and Mughlai cuisine in the heart of Mumbai.",
      categorySlug: "restaurants",
      phone: "+91 98200 11111",
      whatsapp: "+91 98200 11111",
      email: "contact@spicegarden.example",
      addressLine: "12 Linking Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      latitude: 19.0596,
      longitude: 72.8295,
    },
    {
      slug: "quickfix-electricians-mumbai",
      name: "QuickFix Electricians",
      description: "24/7 residential and commercial electrical repair services.",
      categorySlug: "electricians",
      phone: "+91 98200 22222",
      whatsapp: "+91 98200 22222",
      addressLine: "45 SV Road, Andheri West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400058",
      latitude: 19.1197,
      longitude: 72.8468,
    },
    {
      slug: "citycare-clinic-mumbai",
      name: "CityCare Clinic",
      description: "General physicians and family healthcare, walk-ins welcome.",
      categorySlug: "doctors",
      phone: "+91 98200 33333",
      email: "info@citycareclinic.example",
      addressLine: "8 Hill Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      latitude: 19.0544,
      longitude: 72.8258,
    },
    {
      slug: "glow-salon-spa-delhi",
      name: "Glow Salon & Spa",
      description: "Premium hair, skin, and spa treatments for men and women.",
      categorySlug: "salons-spas",
      phone: "+91 98100 44444",
      whatsapp: "+91 98100 44444",
      addressLine: "22 Khan Market",
      city: "Delhi",
      state: "Delhi",
      pincode: "110003",
      latitude: 28.5993,
      longitude: 77.2278,
    },
    {
      slug: "ironpeak-gym-delhi",
      name: "IronPeak Gym & Fitness",
      description: "Fully equipped gym with personal training and group classes.",
      categorySlug: "gyms-fitness",
      phone: "+91 98100 55555",
      addressLine: "7 Connaught Place",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      latitude: 28.6315,
      longitude: 77.2167,
    },
    {
      slug: "shreeplumbing-services-delhi",
      name: "Shree Plumbing Services",
      description: "Fast, reliable plumbing repairs and installations.",
      categorySlug: "plumbers",
      phone: "+91 98100 66666",
      whatsapp: "+91 98100 66666",
      addressLine: "19 Lajpat Nagar",
      city: "Delhi",
      state: "Delhi",
      pincode: "110024",
      latitude: 28.5677,
      longitude: 77.2434,
    },
    {
      slug: "sparklehome-cleaning-bengaluru",
      name: "SparkleHome Cleaning",
      description: "Deep cleaning and regular home upkeep services.",
      categorySlug: "home-cleaning",
      phone: "+91 98450 77777",
      whatsapp: "+91 98450 77777",
      addressLine: "5 Indiranagar 100ft Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      latitude: 12.9719,
      longitude: 77.6412,
    },
    {
      slug: "safemove-packers-movers-bengaluru",
      name: "SafeMove Packers & Movers",
      description: "Local and intercity relocation with careful handling.",
      categorySlug: "packers-movers",
      phone: "+91 98450 88888",
      addressLine: "31 Koramangala 5th Block",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560095",
      latitude: 12.9352,
      longitude: 77.6245,
    },
    {
      slug: "framewell-wedding-photography-bengaluru",
      name: "Framewell Wedding Photography",
      description: "Candid wedding photography and cinematic films.",
      categorySlug: "wedding-photographers",
      phone: "+91 98450 99999",
      whatsapp: "+91 98450 99999",
      email: "hello@framewell.example",
      website: "https://framewell.example",
      addressLine: "14 Church Street",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      latitude: 12.9758,
      longitude: 77.6045,
    },
    {
      slug: "urbanbite-cafe-bengaluru",
      name: "Urban Bite Cafe",
      description: "Cozy cafe serving continental breakfast and specialty coffee.",
      categorySlug: "restaurants",
      phone: "+91 98450 10101",
      addressLine: "2 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      latitude: 12.9756,
      longitude: 77.6068,
    },

    // ── Mumbai: fill remaining categories ──────────────────────────────────
    {
      slug: "reliable-plumbing-works-mumbai",
      name: "Reliable Plumbing Works",
      description: "Leak repairs, pipe fitting, and bathroom fixture installation.",
      categorySlug: "plumbers",
      phone: "+91 98200 12121",
      whatsapp: "+91 98200 12121",
      addressLine: "9 Kurla West Main Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400070",
      latitude: 19.0728,
      longitude: 72.8826,
    },
    {
      slug: "luxe-salon-spa-mumbai",
      name: "Luxe Salon & Spa",
      description: "Hair styling, skincare, and massage therapy for men and women.",
      categorySlug: "salons-spas",
      phone: "+91 98200 13131",
      addressLine: "18 Carter Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      latitude: 19.0668,
      longitude: 72.8258,
    },
    {
      slug: "powerhouse-fitness-mumbai",
      name: "PowerHouse Fitness",
      description: "Strength training, cardio, and certified personal trainers.",
      categorySlug: "gyms-fitness",
      phone: "+91 98200 14141",
      addressLine: "3 Juhu Tara Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400049",
      latitude: 19.0989,
      longitude: 72.8265,
    },
    {
      slug: "sparklehome-cleaning-mumbai",
      name: "SparkleHome Cleaning",
      description: "Deep cleaning, sofa shampooing, and regular home upkeep.",
      categorySlug: "home-cleaning",
      phone: "+91 98200 15151",
      whatsapp: "+91 98200 15151",
      addressLine: "27 Malad West Link Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400064",
      latitude: 19.1863,
      longitude: 72.8493,
    },
    {
      slug: "safemove-packers-movers-mumbai",
      name: "SafeMove Packers & Movers",
      description: "Local and intercity relocation with careful handling.",
      categorySlug: "packers-movers",
      phone: "+91 98200 16161",
      addressLine: "14 Ghatkopar East Station Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400077",
      latitude: 19.0857,
      longitude: 72.9081,
    },
    {
      slug: "framewell-wedding-photography-mumbai",
      name: "Framewell Wedding Photography",
      description: "Candid wedding photography and cinematic films.",
      categorySlug: "wedding-photographers",
      phone: "+91 98200 17171",
      email: "hello@framewell.example",
      website: "https://framewell.example",
      addressLine: "6 Powai Hiranandani Gardens",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400076",
      latitude: 19.1176,
      longitude: 72.9060,
    },

    // ── Delhi: fill remaining categories ───────────────────────────────────
    {
      slug: "spice-garden-restaurant-delhi",
      name: "Spice Garden Restaurant",
      description: "Authentic North Indian and Mughlai cuisine.",
      categorySlug: "restaurants",
      phone: "+91 98100 21212",
      whatsapp: "+91 98100 21212",
      addressLine: "31 Chandni Chowk",
      city: "Delhi",
      state: "Delhi",
      pincode: "110006",
      latitude: 28.6506,
      longitude: 77.2303,
    },
    {
      slug: "quickfix-electricians-delhi",
      name: "QuickFix Electricians",
      description: "24/7 residential and commercial electrical repair services.",
      categorySlug: "electricians",
      phone: "+91 98100 22323",
      whatsapp: "+91 98100 22323",
      addressLine: "10 Karol Bagh Main Market",
      city: "Delhi",
      state: "Delhi",
      pincode: "110005",
      latitude: 28.6519,
      longitude: 77.1909,
    },
    {
      slug: "citycare-clinic-delhi",
      name: "CityCare Clinic",
      description: "General physicians and family healthcare, walk-ins welcome.",
      categorySlug: "doctors",
      phone: "+91 98100 24242",
      email: "info@citycareclinic.example",
      addressLine: "5 Greater Kailash Part 1",
      city: "Delhi",
      state: "Delhi",
      pincode: "110048",
      latitude: 28.5494,
      longitude: 77.2425,
    },
    {
      slug: "sparklehome-cleaning-delhi",
      name: "SparkleHome Cleaning",
      description: "Deep cleaning, sofa shampooing, and regular home upkeep.",
      categorySlug: "home-cleaning",
      phone: "+91 98100 25252",
      whatsapp: "+91 98100 25252",
      addressLine: "16 Rohini Sector 9",
      city: "Delhi",
      state: "Delhi",
      pincode: "110085",
      latitude: 28.7128,
      longitude: 77.1170,
    },
    {
      slug: "safemove-packers-movers-delhi",
      name: "SafeMove Packers & Movers",
      description: "Local and intercity relocation with careful handling.",
      categorySlug: "packers-movers",
      phone: "+91 98100 26262",
      addressLine: "22 Dwarka Sector 12",
      city: "Delhi",
      state: "Delhi",
      pincode: "110078",
      latitude: 28.5921,
      longitude: 77.0460,
    },
    {
      slug: "framewell-wedding-photography-delhi",
      name: "Framewell Wedding Photography",
      description: "Candid wedding photography and cinematic films.",
      categorySlug: "wedding-photographers",
      phone: "+91 98100 27272",
      email: "hello@framewell.example",
      website: "https://framewell.example",
      addressLine: "9 Hauz Khas Village",
      city: "Delhi",
      state: "Delhi",
      pincode: "110016",
      latitude: 28.5535,
      longitude: 77.2003,
    },

    // ── Bengaluru: fill remaining categories ───────────────────────────────
    {
      slug: "quickfix-electricians-bengaluru",
      name: "QuickFix Electricians",
      description: "24/7 residential and commercial electrical repair services.",
      categorySlug: "electricians",
      phone: "+91 98450 31313",
      whatsapp: "+91 98450 31313",
      addressLine: "8 Jayanagar 4th Block",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560011",
      latitude: 12.9308,
      longitude: 77.5838,
    },
    {
      slug: "reliable-plumbing-works-bengaluru",
      name: "Reliable Plumbing Works",
      description: "Leak repairs, pipe fitting, and bathroom fixture installation.",
      categorySlug: "plumbers",
      phone: "+91 98450 32323",
      whatsapp: "+91 98450 32323",
      addressLine: "40 HSR Layout Sector 2",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560102",
      latitude: 12.9116,
      longitude: 77.6389,
    },
    {
      slug: "citycare-clinic-bengaluru",
      name: "CityCare Clinic",
      description: "General physicians and family healthcare, walk-ins welcome.",
      categorySlug: "doctors",
      phone: "+91 98450 33333",
      email: "info@citycareclinic.example",
      addressLine: "12 Whitefield Main Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560066",
      latitude: 12.9698,
      longitude: 77.7500,
    },
    {
      slug: "luxe-salon-spa-bengaluru",
      name: "Luxe Salon & Spa",
      description: "Hair styling, skincare, and massage therapy for men and women.",
      categorySlug: "salons-spas",
      phone: "+91 98450 34343",
      addressLine: "17 Malleshwaram 8th Cross",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560003",
      latitude: 13.0035,
      longitude: 77.5709,
    },
    {
      slug: "powerhouse-fitness-bengaluru",
      name: "PowerHouse Fitness",
      description: "Strength training, cardio, and certified personal trainers.",
      categorySlug: "gyms-fitness",
      phone: "+91 98450 35353",
      addressLine: "25 JP Nagar 6th Phase",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560078",
      latitude: 12.9038,
      longitude: 77.5852,
    },
  ];

  for (const [index, b] of businesses.entries()) {
    const { categorySlug, ...data } = b;
    const business = await prisma.business.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        ...data,
        status: "APPROVED",
        ownerId: owner.id,
        categoryId: categoryBySlug[categorySlug].id,
        openingHours: {
          mon: "9:00-21:00",
          tue: "9:00-21:00",
          wed: "9:00-21:00",
          thu: "9:00-21:00",
          fri: "9:00-21:00",
          sat: "10:00-22:00",
          sun: "10:00-18:00",
        },
      },
    });

    // Seed one review on every third business so the read-only reviews UI has data to show.
    if (index % 3 === 0) {
      await prisma.review.upsert({
        where: { businessId_userId: { businessId: business.id, userId: regularUser.id } },
        update: {},
        create: {
          businessId: business.id,
          userId: regularUser.id,
          rating: 4 + (index % 2),
          comment: "Great service, would recommend to others in the area.",
        },
      });

      const reviews = await prisma.review.findMany({ where: { businessId: business.id } });
      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await prisma.business.update({
        where: { id: business.id },
        data: { avgRating, reviewCount: reviews.length },
      });
    }
  }

  // ── Bulk-generated coverage: every category in 54 more major Indian
  // cities, built from templates rather than hand-listed (486 rows). These
  // don't get real Review rows like the flagship businesses above — that
  // would mean per-row aggregate queries against hundreds of rows, too slow
  // for a seed script — instead they get a plausible avgRating/reviewCount
  // set directly.
  const EXPANSION_CITIES: { name: string; state: string; lat: number; lng: number; pincode: string }[] = [
    { name: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178, pincode: "121001" },
    { name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266, pincode: "122001" },
    { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, pincode: "411001" },
    { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, pincode: "440001" },
    { name: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898, pincode: "422001" },
    { name: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781, pincode: "400601" },
    { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, pincode: "500001" },
    { name: "Warangal", state: "Telangana", lat: 17.9689, lng: 79.5941, pincode: "506002" },
    { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, pincode: "600001" },
    { name: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, pincode: "641001" },
    { name: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, pincode: "625001" },
    { name: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, pincode: "620001" },
    { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, pincode: "700001" },
    { name: "Howrah", state: "West Bengal", lat: 22.5958, lng: 88.2636, pincode: "711101" },
    { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, pincode: "380001" },
    { name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311, pincode: "395001" },
    { name: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812, pincode: "390001" },
    { name: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022, pincode: "360001" },
    { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, pincode: "302001" },
    { name: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243, pincode: "342001" },
    { name: "Kota", state: "Rajasthan", lat: 25.2138, lng: 75.8648, pincode: "324001" },
    { name: "Bikaner", state: "Rajasthan", lat: 28.0229, lng: 73.3119, pincode: "334001" },
    { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, pincode: "226001" },
    { name: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, pincode: "208001" },
    { name: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, pincode: "282001" },
    { name: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, pincode: "221001" },
    { name: "Meerut", state: "Uttar Pradesh", lat: 28.9845, lng: 77.7064, pincode: "250001" },
    { name: "Prayagraj", state: "Uttar Pradesh", lat: 25.4358, lng: 81.8463, pincode: "211001" },
    { name: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538, pincode: "201001" },
    { name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391, pincode: "201301" },
    { name: "Bareilly", state: "Uttar Pradesh", lat: 28.367, lng: 79.4304, pincode: "243001" },
    { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, pincode: "452001" },
    { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, pincode: "462001" },
    { name: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, pincode: "474001" },
    { name: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, pincode: "482001" },
    { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, pincode: "800001" },
    { name: "Gaya", state: "Bihar", lat: 24.7955, lng: 84.9994, pincode: "823001" },
    { name: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096, pincode: "834001" },
    { name: "Jamshedpur", state: "Jharkhand", lat: 22.8046, lng: 86.2029, pincode: "831001" },
    { name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245, pincode: "751001" },
    { name: "Cuttack", state: "Odisha", lat: 20.4625, lng: 85.8828, pincode: "753001" },
    { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, pincode: "530001" },
    { name: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648, pincode: "520001" },
    { name: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lng: 80.4365, pincode: "522001" },
    { name: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723, pincode: "143001" },
    { name: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573, pincode: "141001" },
    { name: "Jalandhar", state: "Punjab", lat: 31.326, lng: 75.5762, pincode: "144001" },
    { name: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794, pincode: "160001" },
    { name: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322, pincode: "248001" },
    { name: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362, pincode: "781001" },
    { name: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, pincode: "695001" },
    { name: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, pincode: "682001" },
    { name: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, pincode: "570001" },
    { name: "Hubballi", state: "Karnataka", lat: 15.3647, lng: 75.124, pincode: "580001" },
  ];

  // One reusable template per category — the same names already repeat
  // across Mumbai/Delhi/Bengaluru above, so this is consistent with the
  // existing pattern rather than a new one.
  const CATEGORY_TEMPLATES: Record<string, { name: string; description: string }> = {
    restaurants: { name: "Spice Garden Restaurant", description: "Authentic North Indian and Mughlai cuisine." },
    electricians: { name: "QuickFix Electricians", description: "24/7 residential and commercial electrical repair services." },
    plumbers: { name: "Reliable Plumbing Works", description: "Leak repairs, pipe fitting, and bathroom fixture installation." },
    doctors: { name: "CityCare Clinic", description: "General physicians and family healthcare, walk-ins welcome." },
    "salons-spas": { name: "Luxe Salon & Spa", description: "Hair styling, skincare, and massage therapy for men and women." },
    "gyms-fitness": { name: "PowerHouse Fitness", description: "Strength training, cardio, and certified personal trainers." },
    "home-cleaning": { name: "SparkleHome Cleaning", description: "Deep cleaning, sofa shampooing, and regular home upkeep." },
    "packers-movers": { name: "SafeMove Packers & Movers", description: "Local and intercity relocation with careful handling." },
    "wedding-photographers": { name: "Framewell Wedding Photography", description: "Candid wedding photography and cinematic films." },
  };

  function slugify(input: string) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Deterministic pseudo-random in [0, 1), seeded so re-running the seed
  // produces identical data instead of drifting.
  function pseudoRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  const generatedBusinesses: Prisma.BusinessCreateManyInput[] = [];
  EXPANSION_CITIES.forEach((city, cityIndex) => {
    const citySlug = slugify(city.name);
    categories.forEach((cat, catIndex) => {
      const template = CATEGORY_TEMPLATES[cat.slug];
      const seed = cityIndex * categories.length + catIndex;
      const latJitter = (pseudoRandom(seed) - 0.5) * 0.06;
      const lngJitter = (pseudoRandom(seed + 0.5) - 0.5) * 0.06;
      const avgRating = Number((3.5 + pseudoRandom(seed + 1) * 1.3).toFixed(1));
      const reviewCount = 5 + Math.floor(pseudoRandom(seed + 2) * 115);
      const phoneNumber = String(9800000000 + seed);

      generatedBusinesses.push({
        slug: `${slugify(template.name)}-${citySlug}`,
        name: template.name,
        description: template.description,
        categoryId: categoryBySlug[cat.slug].id,
        phone: `+91 ${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}`,
        addressLine: `${10 + (seed % 90)} MG Road`,
        city: city.name,
        state: city.state,
        pincode: city.pincode,
        latitude: city.lat + latJitter,
        longitude: city.lng + lngJitter,
        status: "APPROVED" as const,
        ownerId: owner.id,
        avgRating,
        reviewCount,
        openingHours: {
          mon: "9:00-21:00",
          tue: "9:00-21:00",
          wed: "9:00-21:00",
          thu: "9:00-21:00",
          fri: "9:00-21:00",
          sat: "10:00-22:00",
          sun: "10:00-18:00",
        },
      });
    });
  });

  const { count } = await prisma.business.createMany({
    data: generatedBusinesses,
    skipDuplicates: true,
  });

  console.log("Seed complete.");
  console.log(`  Flagship businesses: ${businesses.length}`);
  console.log(`  Generated businesses: ${count} (of ${generatedBusinesses.length} attempted)`);
  console.log("Test accounts (password for all: Password123!):");
  console.log(`  Owner: ${owner.email}`);
  console.log(`  Admin: ${admin.email}`);
  console.log(`  User:  ${regularUser.email}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚠ DEMO-ONLY DATA — competing businesses for the "get quotes from multiple
// businesses" broadcast feature.
//
// Every one of the 513 businesses seeded above maps to exactly one business
// per category+city combo (verified empirically before writing this block:
// `prisma.business.groupBy({ by: ["categoryId", "city"] })` — max count was
// 1, everywhere). A fan-out feature has nothing to fan out to without some
// deliberate overlap, so this block adds 2-4 extra competitors in a
// *handful* of category+city combos, purely so the broadcast feature is
// demonstrable locally.
//
// This section is purely additive — it does not modify, reorder, or
// interact with anything above — and can be deleted entirely without
// affecting the rest of the seed or the "real" 513-business dataset.
// ═══════════════════════════════════════════════════════════════════════════
async function seedBroadcastDemoCompetitors() {
  type DemoBusiness = {
    name: string;
    description: string;
    categorySlug: string;
    city: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
  };

  const demoBusinesses: DemoBusiness[] = [
    // Restaurants in Mumbai (existing: Spice Garden Restaurant) — 3 more, total 4.
    { name: "Mumbai Tiffin House", description: "Home-style thalis and tiffin delivery.", categorySlug: "restaurants", city: "Mumbai", state: "Maharashtra", pincode: "400050", lat: 19.062, lng: 72.831 },
    { name: "Bandra Bites Diner", description: "All-day breakfast and comfort food diner.", categorySlug: "restaurants", city: "Mumbai", state: "Maharashtra", pincode: "400050", lat: 19.057, lng: 72.827 },
    { name: "Coastal Curry Kitchen", description: "Konkan and coastal Maharashtrian seafood specialties.", categorySlug: "restaurants", city: "Mumbai", state: "Maharashtra", pincode: "400058", lat: 19.121, lng: 72.849 },

    // Doctors in Delhi (existing: CityCare Clinic) — 3 more, total 4.
    { name: "Delhi Family Health Center", description: "Family medicine and preventive care.", categorySlug: "doctors", city: "Delhi", state: "Delhi", pincode: "110003", lat: 28.601, lng: 77.23 },
    { name: "Wellness Point Clinic", description: "General physicians with same-day appointments.", categorySlug: "doctors", city: "Delhi", state: "Delhi", pincode: "110024", lat: 28.569, lng: 77.245 },
    { name: "MedFirst Diagnostics & Clinic", description: "Consultations plus in-house diagnostic lab.", categorySlug: "doctors", city: "Delhi", state: "Delhi", pincode: "110001", lat: 28.633, lng: 77.219 },

    // Electricians in Bengaluru (existing: QuickFix Electricians) — 3 more, total 4.
    { name: "Bright Spark Electricals", description: "Residential wiring and fixture installation.", categorySlug: "electricians", city: "Bengaluru", state: "Karnataka", pincode: "560038", lat: 12.974, lng: 77.643 },
    { name: "PowerFix Electrical Services", description: "Commercial and residential electrical repair.", categorySlug: "electricians", city: "Bengaluru", state: "Karnataka", pincode: "560095", lat: 12.937, lng: 77.627 },
    { name: "CircuitPro Electricians", description: "Panel upgrades, rewiring, and emergency callouts.", categorySlug: "electricians", city: "Bengaluru", state: "Karnataka", pincode: "560001", lat: 12.978, lng: 77.607 },

    // Plumbers in Pune (existing: Reliable Plumbing Works) — 4 more, total 5 (full N=5 demo).
    { name: "Pune Pipe Masters", description: "Leak detection and pipeline repair.", categorySlug: "plumbers", city: "Pune", state: "Maharashtra", pincode: "411001", lat: 18.523, lng: 73.861 },
    { name: "AquaFix Plumbing Co", description: "Bathroom fittings and water heater installation.", categorySlug: "plumbers", city: "Pune", state: "Maharashtra", pincode: "411004", lat: 18.516, lng: 73.849 },
    { name: "Metro Plumbing Solutions", description: "24/7 emergency plumbing across Pune.", categorySlug: "plumbers", city: "Pune", state: "Maharashtra", pincode: "411016", lat: 18.535, lng: 73.882 },
    { name: "FlowRight Plumbers", description: "New construction and renovation plumbing.", categorySlug: "plumbers", city: "Pune", state: "Maharashtra", pincode: "411038", lat: 18.503, lng: 73.822 },

    // Salons & Spas in Chennai (existing: Luxe Salon & Spa) — 3 more, total 4.
    { name: "Chennai Glow Studio", description: "Hair, skin, and bridal makeup studio.", categorySlug: "salons-spas", city: "Chennai", state: "Tamil Nadu", pincode: "600001", lat: 13.078, lng: 80.271 },
    { name: "Serenity Spa & Salon", description: "Massage therapy and salon services.", categorySlug: "salons-spas", city: "Chennai", state: "Tamil Nadu", pincode: "600004", lat: 13.06, lng: 80.259 },
    { name: "Elite Hair & Beauty Lounge", description: "Premium hairstyling and grooming lounge.", categorySlug: "salons-spas", city: "Chennai", state: "Tamil Nadu", pincode: "600018", lat: 13.032, lng: 80.245 },
  ];

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIdBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const owner = await prisma.user.findUnique({ where: { email: "owner@justdial.test" } });
  if (!owner) return;

  function slugify(input: string) {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  await prisma.business.createMany({
    data: demoBusinesses.map((b, index) => ({
      name: b.name,
      // "-demo-" in the slug is a second, independent marker (beyond this
      // block's comment) that a given row is demo-only competition data,
      // visible even from just the URL or a DB query.
      slug: `${slugify(b.name)}-demo-${slugify(b.city)}`,
      description: b.description,
      categoryId: categoryIdBySlug[b.categorySlug],
      phone: `+91 90${String(1000000 + index).slice(-7)}`,
      addressLine: `${10 + index} Demo Competitor Lane`,
      city: b.city,
      state: b.state,
      pincode: b.pincode,
      latitude: b.lat,
      longitude: b.lng,
      status: "APPROVED" as const,
      ownerId: owner.id,
      avgRating: 3.6 + (index % 5) * 0.25,
      reviewCount: 8 + index * 6,
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${demoBusinesses.length} demo competitor businesses for broadcast testing.`);
}

// ═══════════════════════════════════════════════════════════════════════
// ⚠ REAL, SOURCED DATA — Faridabad doctors, lawyers, and accountants.
//
// Unlike every other block in this file, these are NOT placeholder/demo
// businesses — name, address, and phone number for each were verified via
// public directory listings (Practo, JustDial, Sulekha, ICAI-linked firm
// sites, individual clinic/firm websites, etc.) as of when this was
// written, specifically so a real user could call and book an appointment.
// The source URL for each is preserved in a trailing comment for
// traceability. `avgRating`/`reviewCount` are deliberately left at 0 (the
// column defaults) rather than invented — no real review data was
// collected, and making up star ratings for real businesses would be
// actively misleading in a way placeholder demo data isn't.
//
// `ownerId` is left unset (null) — these are unclaimed directory listings,
// same as how a real citywide directory works, not accounts anyone has
// registered. Coordinates are approximate per-sector centers (Faridabad
// addresses are sector-based), not exact geocodes.
//
// Purely additive: adds two new categories (Lawyers, Accountants) via
// upsert and one createMany with skipDuplicates — does not touch any
// other block in this file.
// ═══════════════════════════════════════════════════════════════════════
async function seedFaridabadRealBusinesses() {
  const lawyers = await prisma.category.upsert({
    where: { slug: "lawyers" },
    update: {},
    create: { name: "Lawyers", slug: "lawyers", icon: "scale" },
  });
  const accountants = await prisma.category.upsert({
    where: { slug: "accountants" },
    update: {},
    create: { name: "Accountants", slug: "accountants", icon: "calculator" },
  });
  const doctorsCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "doctors" } });

  // Approximate centers for the Faridabad sectors/localities that appear
  // below (Faridabad addresses are sector-based) — not exact geocodes.
  const SECTOR_COORDS: Record<string, [number, number]> = {
    "8": [28.416, 77.31],
    "16": [28.4041, 77.3119],
    "16a": [28.4041, 77.3119],
    "10": [28.394, 77.308],
    nit: [28.3776, 77.3131],
    "21a": [28.399, 77.302],
    "21b": [28.399, 77.302],
    "21d": [28.399, 77.302],
    "15": [28.407, 77.305],
    "15a": [28.407, 77.305],
    "19": [28.398, 77.316],
    "31": [28.37, 77.335],
    "12": [28.385, 77.307],
    "20": [28.395, 77.32],
    "33": [28.36, 77.33],
    "28": [28.385, 77.325],
    "30": [28.375, 77.32],
    "7": [28.42, 77.305],
    "81": [28.445, 77.335],
  };
  const FARIDABAD_CENTER: [number, number] = [28.4089, 77.3178];

  function coordsForSector(sector: string | undefined, index: number): [number, number] {
    const match = sector ? SECTOR_COORDS[sector.toLowerCase()] : undefined;
    if (match) return match;
    // Small deterministic spread so unmapped entries aren't all stacked on
    // one point.
    const offset = ((index % 7) - 3) * 0.004;
    return [FARIDABAD_CENTER[0] + offset, FARIDABAD_CENTER[1] + offset];
  }

  function slugify(input: string) {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  type Entry = {
    name: string;
    description: string;
    address: string;
    pincode: string;
    phone: string;
    sector?: string;
  };

  const doctors: Entry[] = [
    // https://www.sarvodayahospital.com/hospitals/sarvodaya-hospital-sec-8-faridabad
    { name: "Sarvodaya Hospital & Research Centre", description: "Multi-specialty hospital.", address: "YMCA Road, near Escorts Mujesar Metro Station, Sector 8", pincode: "121006", phone: "0129-4184444", sector: "8" },
    // https://metrohospitalfaridabad.com/contact-us/
    { name: "Metro Hospital & Heart Institute", description: "Multi-specialty and cardiac hospital.", address: "Sector 16 Rd, Nirman Kunj, ADB PWD Colony, Sector 16A", pincode: "121002", phone: "+91-129-691-1111", sector: "16a" },
    // https://www.parkhospital.in/contact
    { name: "Park Hospital", description: "Multi-specialty hospital.", address: "Opposite Court, J Block, Sector 10 (DLF)", pincode: "121006", phone: "0129-4200000", sector: "10" },
    // https://www.fortishealthcare.com/location/fortis-escorts-hospital-faridabad
    { name: "Fortis Escorts Hospital", description: "Multi-specialty hospital.", address: "Neelam Bata Road, AC Nagar, New Industrial Township", pincode: "121001", phone: "0129-2466179", sector: "nit" },
    // https://www.mappls.com/8kt37c
    { name: "QRG Health City", description: "Multi-specialty hospital.", address: "Plot No. 1, Sector 16", pincode: "121002", phone: "0129-4330000", sector: "16" },
    // https://faridabad.nic.in/public-utility/asian-institute-of-medical-science/
    { name: "Asian Institute of Medical Sciences", description: "Multi-specialty hospital.", address: "Badkhal Flyover Road, Sector 21A", pincode: "121001", phone: "0129-4253000", sector: "21a" },
    // https://goyalhospitalfaridabad.com/contact/
    { name: "Goyal Hospital", description: "Multi-specialty hospital and surgery centre.", address: "Plot No. 2, Opposite Hanuman Temple, Sector 8, Surdas Park", pincode: "121006", phone: "0129-4883584", sector: "8" },
    // https://www.dragarwal.com/eye-hospitals/faridabad/
    { name: "Dr Agarwal's Eye Hospital", description: "Ophthalmologist / eye hospital.", address: "SCO No. 16, HUDA Market, Sector 16", pincode: "121002", phone: "9594924026", sector: "16" },
    // https://www.hexahealth.com/faridabad/hospital/centre-for-sight-eye-hospital-faridabad
    { name: "Centre for Sight Eye Hospital", description: "Ophthalmologist / eye hospital.", address: "Plot No. 1, HUDA Market No. 1, beside Hanuman Mandir, Sector 16A", pincode: "121002", phone: "8065827392", sector: "16a" },
    // https://www.entspecialistfaridabad.com/
    { name: "Thukral ENT Clinic", description: "ENT specialist — Dr. Anil Thukral.", address: "Shop No. 39, near Post Office, Sector 16 HUDA Market", pincode: "121002", phone: "9990944465", sector: "16" },
    // https://uniquedentalclinicfaridabad.com/
    { name: "Unique Dental Clinic", description: "Dentist.", address: "Shop No. 21, near Sanjha Chulha, Sector 19", pincode: "121001", phone: "09810843243", sector: "19" },
    // https://deepdentalcare.com/contactus.php
    { name: "Deep Dental Care & Treatment Centre", description: "Dentist.", address: "SCF 61, First Floor, above Vodafone Store, Sector 15", pincode: "121007", phone: "+91-9811241992", sector: "15" },
    // https://www.freemedicalinfo.in/drnishthagupta8
    { name: "The Gynae Clinic & Ultrasound Centre", description: "Gynecologist / obstetrician — Dr. Nishtha Gupta.", address: "795/796, Sector 8", pincode: "121006", phone: "98993 24311", sector: "8" },
    // https://www.bajajfinservhealth.in/hospitals/faridabad/handa-medical-centre-sector-16
    { name: "Handa Medical Centre", description: "Orthopedic — Dr. Harish Handa.", address: "Site No. 1, Nursing Home, HUDA Staff Colony, Sector 16", pincode: "121002", phone: "0129-4073185", sector: "16" },
    // https://www.mappls.com/ct45bc
    { name: "Mittal Hospital", description: "Orthopedic and gynaecology — Dr. Puneet Mittal.", address: "1498, HUDA Staff Colony, Sector 16", pincode: "121002", phone: "+91 9810085631", sector: "16" },
    // https://faridabadmedicalcenter.com/
    { name: "Faridabad Medical Center – The Children Hospital", description: "Pediatrician — Dr. Sanjeev Kumar.", address: "Plot No. 458, Sector 21B, near Ryan International School, Railway Rd, Fatehpur Chandela", pincode: "121001", phone: "+91 9891001441", sector: "21b" },
    // https://clinicdermatech.com/blog/clinic-dermatech-announces-launch-of-its-faridabad-branch/
    { name: "Clinic Dermatech", description: "Dermatologist / skin clinic.", address: "LG-04, Crown Plaza (Mall), Sector 15A, near Neelam Chowk Ajronda Metro Station", pincode: "121001", phone: "0129-4340506", sector: "15a" },
  ];

  const lawyerEntries: Entry[] = [
    // https://www.legalserviceindia.com/lawyers/faridabad.htm
    { name: "D. Bhattacharya, Advocate", description: "Civil litigation, arbitration, and property law.", address: "Office No. 700-C, 7th Floor, SRS Tower, Mathura Road, Sector 31", pincode: "121003", phone: "+91-9899814806", sector: "31" },
    // https://www.legalserviceindia.com/lawyers/faridabad.htm
    { name: "Faridabad Lawyers and Associates", description: "Divorce, criminal, consumer, and property law.", address: "Chamber No. A1098, Judicial Court Complex, Anuvrat Marg, Sector 12", pincode: "121007", phone: "+91-9873628941", sector: "12" },
    // https://www.bakshiandassociates.com/ , https://threebestrated.in/divorce-lawyers-in-faridabad-hr
    { name: "Bakshi & Associates", description: "Family, divorce, property, corporate, and consumer law — Advocate Sunil Kumar Bakshi.", address: "2043, HUDA Staff Colony, Sector 16", pincode: "121002", phone: "+91-9811680103", sector: "16" },
    // https://threebestrated.in/criminal-case-lawyers-in-faridabad-hr
    { name: "Advocate Manoj Chaudhary", description: "Criminal lawyer.", address: "11, Pravesh Marg, Friends Colony, Sector 20", pincode: "121002", phone: "+91-9310155557", sector: "20" },
    // https://tiwariandassociates.in/ , https://threebestrated.in/corporate-lawyers-in-faridabad-hr
    { name: "Tiwari & Associates Law Firm", description: "Criminal, corporate, and financial law — Advocate Deependra Pati Tiwari.", address: "5C/44, Office No. 6, 2nd Floor, Shahid Sukhdev Marg, NH-5, NIT", pincode: "121001", phone: "+91-9818017578", sector: "nit" },
    // https://threebestrated.in/property-case-lawyers-in-faridabad-hr
    { name: "Advocate Manmeet Kaur", description: "Criminal, property, divorce, and consumer law.", address: "Seat No. 147, South Wing, District Court, Sector 12", pincode: "121007", phone: "+91-9958277779", sector: "12" },
    // https://www.justdial.com/Faridabad/GANESH-SHARMA-RIDDHI-LEGAL-CONSULTANTS-Near-Gbn-School-Faridabad-Nit/011PXX11-XX11-180212223609-Q1L5_BZDET
    { name: "Riddhi Legal Consultants", description: "Criminal, anticipatory bail, divorce, and property law — Ganesh Sharma.", address: "Flat No. 1517, 2nd Floor, Sector 21D, near GBN School, Ajronda Chowk, NIT", pincode: "121001", phone: "070435-08957", sector: "21d" },
    // https://threebestrated.in/property-case-lawyers-in-faridabad-hr
    { name: "Advocate Praveen Mishra", description: "Property lawyer.", address: "House No. FCA 706, Gali No. 5, Block-C, SGM Nagar", pincode: "121001", phone: "+91-9891515860" },
    // https://threebestrated.in/consumer-court-lawyers-in-faridabad-hr
    { name: "J.P. Singla & Associates", description: "Consumer court, corporate, family, and criminal law.", address: "Chamber No. 452, District & Sessions Court, Sector 12", pincode: "121007", phone: "+91-8178076921", sector: "12" },
    // https://www.bnblegal.com/faridabad/legal-expertise/
    { name: "B&B Associates LLP", description: "Corporate, criminal, civil, and matrimonial law.", address: "91, Sector 15", pincode: "121007", phone: "+91-7710777770", sector: "15" },
    // https://www.apnafaridabad.com/2019/04/list-of-faridabad-advocates-specialization-profile-contact-address.html
    { name: "LN Parashar, Advocate", description: "Criminal lawyer.", address: "Chamber No. 382, District Court, Sector 12", pincode: "121007", phone: "+91-9818379315", sector: "12" },
    { name: "Vishvendra Attri, Advocate", description: "Criminal lawyer.", address: "Chamber No. 288, District Court, Sector 12", pincode: "121007", phone: "+91-9999825596", sector: "12" },
    { name: "Hitesh Parashar, Advocate", description: "Criminal and civil lawyer.", address: "Chamber No. 382, District Court, Sector 12", pincode: "121007", phone: "+91-9811210480", sector: "12" },
    { name: "Ravinder Parashar, Advocate", description: "Criminal lawyer.", address: "Chamber No. 653, District Court, Sector 12", pincode: "121007", phone: "+91-9212519311", sector: "12" },
    { name: "Advocate Thomas", description: "General legal practice.", address: "Chamber No. 113, District Court, Sector 12", pincode: "121007", phone: "+91-9910059310", sector: "12" },
  ];

  const accountantEntries: Entry[] = [
    // https://cagsn.com/
    { name: "GSN & Co.", description: "Chartered accountant — audit, income tax, GST, business registration.", address: "5A-BP/14, near Banke Bihari Mandir, N.I.T.", pincode: "121001", phone: "9999660455", sector: "nit" },
    // https://www.kumarsanjay.com/about-us.html
    { name: "Kumar Sanjay & Associates", description: "Chartered accountant — audit & assurance, taxation, company law.", address: "SCF-32, First Floor, HUDA Market No. 1, Sector 16-A", pincode: "121002", phone: "+91 129 407 2066", sector: "16a" },
    // https://gkkediaandco.com/contact/
    { name: "G.K. Kedia & Co. (Faridabad Branch)", description: "Audit & assurance, income tax, GST, company law, startups.", address: "8th Floor, BH-828 Puri Business Hub, 81 High Street, Sector 81", pincode: "121002", phone: "+91 98102 19530", sector: "81" },
    // http://www.camanishbanga.com/
    { name: "CA Manish Banga & Associates", description: "Chartered accountant — tax & audit.", address: "974, Sector 10", pincode: "121006", phone: "+91 82852 12052", sector: "10" },
    // https://www.finacbooks.com/faridabad/ca/mohit-makhija-associates/2115
    { name: "Mohit Makhija & Associates", description: "GST return, income tax return, TDS return.", address: "3rd Floor, 341, Om Shubham Tower, Neelam Bata Road, NIT", pincode: "121001", phone: "+91 98996 80585", sector: "nit" },
    // https://faridabad-online.com/business-directory/chartered-accountants
    { name: "Vandana Bansal & Associates", description: "Cost accounting and chartered accountant services.", address: "939/18, HBC", pincode: "121001", phone: "9891232140" },
    { name: "Tax Gyan.in", description: "Tax filing and GST consultancy.", address: "301, Sector 28", pincode: "121001", phone: "9810150489", sector: "28" },
    { name: "Santosh Gupta & Co.", description: "Chartered accountant.", address: "SCF-30P, Part-1, Market Sector-16A", pincode: "121002", phone: "0129-4079111", sector: "16a" },
    { name: "Meenu Gupta & Associates", description: "Chartered accountant.", address: "7/235, Gopi Colony, NIT", pincode: "121001", phone: "9811122240", sector: "nit" },
    { name: "K Gopal Sharma & Co.", description: "Chartered accountant.", address: "412, II Floor, I.P. Colony, Sector 30", pincode: "121003", phone: "9811081940", sector: "30" },
    { name: "Jindal Jitender & Co.", description: "Chartered accountant.", address: "Shop No. 143-144, Om Shubham Tower, Neelam Bata Road", pincode: "121001", phone: "0129-4008412", sector: "nit" },
    { name: "Jangir SS & Associates", description: "Chartered accountant.", address: "197, IPC, Sector 33", pincode: "121001", phone: "9716601411", sector: "33" },
    { name: "Devendar Agarwal", description: "Chartered accountant.", address: "527/7B, Sector 7", pincode: "121006", phone: "9210464706", sector: "7" },
    { name: "CST & Associates", description: "Chartered accountant.", address: "Shop No. 30, Basement, near OBC Bank, Sector 7 HUDA Market", pincode: "121006", phone: "8447437967", sector: "7" },
    { name: "Centralised Business Solutions", description: "Chartered accountant / tax consultancy.", address: "H.No. 2487, Sector 8", pincode: "121006", phone: "9717105008", sector: "8" },
  ];

  const groups: { entries: Entry[]; categoryId: string }[] = [
    { entries: doctors, categoryId: doctorsCategory.id },
    { entries: lawyerEntries, categoryId: lawyers.id },
    { entries: accountantEntries, categoryId: accountants.id },
  ];

  let index = 0;
  const data = groups.flatMap(({ entries, categoryId }) =>
    entries.map((entry) => {
      const [latitude, longitude] = coordsForSector(entry.sector, index++);
      return {
        name: entry.name,
        slug: `${slugify(entry.name)}-faridabad`,
        description: entry.description,
        categoryId,
        phone: entry.phone,
        addressLine: entry.address,
        city: "Faridabad",
        state: "Haryana",
        pincode: entry.pincode,
        latitude,
        longitude,
        status: "APPROVED" as const,
      };
    })
  );

  await prisma.business.createMany({ data, skipDuplicates: true });

  console.log(
    `Seeded ${data.length} real, sourced Faridabad businesses (${doctors.length} doctors, ${lawyerEntries.length} lawyers, ${accountantEntries.length} accountants).`
  );
}

main()
  .then(seedBroadcastDemoCompetitors)
  .then(seedFaridabadRealBusinesses)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
