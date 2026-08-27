import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

  await Promise.all(
    categories.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, icon: c.icon },
        create: c,
      })
    )
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

  console.log("Seed complete.");
  console.log("Test accounts (password for all: Password123!):");
  console.log(`  Owner: ${owner.email}`);
  console.log(`  Admin: ${admin.email}`);
  console.log(`  User:  ${regularUser.email}`);
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

// Controlled specialty vocabulary within each LAD category — the same 10
// terms per category already established as the canonical mapping for the
// searchString-based reclassification migration (see prisma/import-scraped.ts),
// reused here as user-facing filter options rather than free text so this
// doesn't refragment the same way raw scraped category names once did.
// Purely additive/idempotent via upsert; existing businesses are left with
// specialtyId: null until backfilled or self-tagged by an owner.
async function seedSpecialties() {
  const SPECIALTIES: Record<string, { name: string; slug: string }[]> = {
    lawyers: [
      { name: "Advocate", slug: "advocate" },
      { name: "Property Lawyer", slug: "property-lawyer" },
      { name: "Criminal Lawyer", slug: "criminal-lawyer" },
      { name: "Divorce Lawyer", slug: "divorce-lawyer" },
      { name: "Family Court Lawyer", slug: "family-court-lawyer" },
      { name: "Corporate Lawyer", slug: "corporate-lawyer" },
      { name: "Consumer Court Lawyer", slug: "consumer-court-lawyer" },
      { name: "Law Firm", slug: "law-firm" },
      { name: "Cheque Bounce Lawyer", slug: "cheque-bounce-lawyer" },
      { name: "Labour Lawyer", slug: "labour-lawyer" },
    ],
    accountants: [
      { name: "Chartered Accountant", slug: "chartered-accountant" },
      { name: "CA Firm", slug: "ca-firm" },
      { name: "Tax Consultant", slug: "tax-consultant" },
      { name: "GST Consultant", slug: "gst-consultant" },
      { name: "Income Tax Consultant", slug: "income-tax-consultant" },
      { name: "Auditor", slug: "auditor" },
      { name: "Accounting Firm", slug: "accounting-firm" },
      { name: "Bookkeeping Services", slug: "bookkeeping-services" },
      { name: "Company Secretary", slug: "company-secretary" },
      { name: "Financial Consultant", slug: "financial-consultant" },
    ],
    doctors: [
      { name: "General Physician", slug: "general-physician" },
      { name: "Dentist", slug: "dentist" },
      { name: "Gynaecologist", slug: "gynaecologist" },
      { name: "Orthopedic Doctor", slug: "orthopedic-doctor" },
      { name: "Pediatrician", slug: "pediatrician" },
      { name: "Dermatologist", slug: "dermatologist" },
      { name: "ENT Specialist", slug: "ent-specialist" },
      { name: "Cardiologist", slug: "cardiologist" },
      { name: "Eye Specialist", slug: "eye-specialist" },
      { name: "Psychiatrist", slug: "psychiatrist" },
    ],
  };

  const categories = await prisma.category.findMany({
    where: { slug: { in: Object.keys(SPECIALTIES) } },
    select: { id: true, slug: true },
  });

  let count = 0;
  for (const category of categories) {
    for (const specialty of SPECIALTIES[category.slug]) {
      await prisma.specialty.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: specialty.slug } },
        update: { name: specialty.name },
        create: { name: specialty.name, slug: specialty.slug, categoryId: category.id },
      });
      count += 1;
    }
  }

  console.log(`Seeded ${count} specialties across ${categories.length} categories.`);
}

main()
  .then(seedFaridabadRealBusinesses)
  .then(seedSpecialties)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
