// The only categories with real business data right now are the LAD
// (Lawyers/Accountants/Doctors) set from the scraped import. The other 8
// categories (Restaurants, Electricians, Plumbers, Gyms & Fitness, Home
// Cleaning Services, Packers & Movers, Salons & Spas, Wedding
// Photographers) still exist as rows — seed.ts creates them and nothing
// deletes them — but have zero businesses, so every user-facing category
// picker filters down to this list rather than offering dead-end options.
export const LAD_CATEGORY_SLUGS = ["lawyers", "accountants", "doctors"] as const;
