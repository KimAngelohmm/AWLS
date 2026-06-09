/**
 * Sunnies Studios Job Positions Seed Script
 * Seeds realistic job positions matching company's actual hiring needs
 * Run from backend: node scripts/seed-sunnies-positions.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const SUNNIES_POSITIONS = [
  // RETAIL & STORE OPERATIONS
  {
    title: 'Store Associate - Sales',
    department: 'Retail & Store Operations',
    description: 'Join our frontline retail team at Sunnies Studios. Provide exceptional customer service, demonstrate eyewear products, and drive sales. This role is perfect for customer-focused individuals who love helping people find the perfect pair of sunglasses.',
    requirements: JSON.stringify(['Customer service experience', 'Sales skills', 'Product knowledge', 'Communication excellence']),
    salary_range: '22000 - 28000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Optical Dispenser / Optometrist',
    department: 'Retail & Store Operations',
    description: 'Work in our Sunnies Specs optical stores. Handle eye prescriptions, frame fitting, and optical consultations. Ideal for optometrists or experienced optical dispensers passionate about eye care.',
    requirements: JSON.stringify(['Optometry certification/license', 'Prescription knowledge', 'Frame fitting expertise', 'Eye care software']),
    salary_range: '30000 - 45000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Store Manager',
    department: 'Retail & Store Operations',
    description: 'Lead a Sunnies Studios store location. Oversee daily operations, manage team performance, maintain inventory, and achieve sales targets. This is a leadership role for experienced retail managers.',
    requirements: JSON.stringify(['Store management experience', 'Team leadership', 'Sales targets achievement', 'Inventory management']),
    salary_range: '40000 - 60000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Visual Merchandiser',
    department: 'Retail & Store Operations',
    description: 'Create stunning store displays and product arrangements that showcase our eyewear and accessories. Bring our brand aesthetic to life through creative visual merchandising.',
    requirements: JSON.stringify(['Visual merchandising experience', 'Creative design sense', 'Retail knowledge', 'Trend awareness']),
    salary_range: '25000 - 35000 PHP',
    email_domain: '@sunniesstudios.com',
  },

  // CREATIVE & DESIGN
  {
    title: 'Graphic Designer',
    department: 'Creative & Design',
    description: 'Design packaging, marketing materials, and campaign visuals for Sunnies Studios. Work with our creative team to bring brand campaigns to life.',
    requirements: JSON.stringify(['Adobe Creative Suite proficiency', '2+ years design experience', 'Packaging design knowledge', 'Brand identity understanding']),
    salary_range: '35000 - 50000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Product Designer',
    department: 'Creative & Design',
    description: 'Join our in-house design team to create eyewear frame designs. We design 200+ styles in-house. Work with CAD, 3D modeling, and bring innovative frame concepts to reality.',
    requirements: JSON.stringify(['CAD/3D modeling skills', 'Frame design experience', 'Manufacturing knowledge', 'Trend analysis']),
    salary_range: '45000 - 65000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Art Director / Creative Director',
    department: 'Creative & Design',
    description: 'Lead our creative vision. Direct brand identity, campaign aesthetics, and creative team strategy. This role requires a strong creative eye and leadership capabilities.',
    requirements: JSON.stringify(['Creative leadership experience', 'Campaign direction', 'Brand identity expertise', 'Team management']),
    salary_range: '55000 - 80000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Content Creator / Photographer / Videographer',
    department: 'Creative & Design',
    description: 'Create engaging content for our strong social media presence (Instagram/TikTok). Shoot professional photos and videos for campaigns.',
    requirements: JSON.stringify(['Photography/videography equipment skills', 'Social media content experience', 'Video editing proficiency', 'Creative portfolio']),
    salary_range: '28000 - 42000 PHP',
    email_domain: '@sunniesstudios.com',
  },

  // SUPPLY CHAIN & OPERATIONS
  {
    title: 'Inventory Controller / Stock Coordinator',
    department: 'Supply Chain & Operations',
    description: 'Manage inventory systems and stock tracking across our operations. Ensure accurate inventory counts and system management.',
    requirements: JSON.stringify(['Inventory management software', 'Stock tracking experience', 'Accuracy focus', 'Warehouse systems']),
    salary_range: '24000 - 32000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Warehouse Staff / Logistics Coordinator',
    department: 'Supply Chain & Operations',
    description: 'Handle order fulfillment, shipping/receiving, and logistics coordination. Support our supply chain operations.',
    requirements: JSON.stringify(['Warehouse operations experience', 'Physical capability', 'Organization skills', 'Logistics knowledge']),
    salary_range: '20000 - 27000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Procurement Officer',
    department: 'Supply Chain & Operations',
    description: 'Manage vendor relationships and negotiate supplier contracts. Optimize procurement costs and ensure quality sourcing.',
    requirements: JSON.stringify(['Vendor negotiation experience', 'Procurement software', 'Supplier relationship management', 'Cost optimization']),
    salary_range: '35000 - 50000 PHP',
    email_domain: '@sunniesstudios.com',
  },

  // BEAUTY & COSMETICS (Sunnies Face)
  {
    title: 'Beauty Advisor / Makeup Artist',
    department: 'Beauty & Cosmetics',
    description: 'Join our Sunnies Face team. Conduct beauty demos, makeup applications, and support product campaigns in-store.',
    requirements: JSON.stringify(['Makeup application skills', 'Customer engagement experience', 'Product knowledge', 'Campaign participation ability']),
    salary_range: '23000 - 30000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Product Development Specialist',
    department: 'Beauty & Cosmetics',
    description: 'Work on formulation, testing, and sourcing of beauty products for Sunnies Face. Support R&D initiatives.',
    requirements: JSON.stringify(['Chemistry/cosmetics knowledge', 'Product testing experience', 'Supplier sourcing', 'Quality assurance']),
    salary_range: '38000 - 55000 PHP',
    email_domain: '@sunniesstudios.com',
  },

  // FOOD & BEVERAGE (Sunnies Cafe)
  {
    title: 'Barista / Café Crew',
    department: 'Food & Beverage',
    description: 'Prepare specialty coffee and serve customers at Sunnies Café. Deliver excellent customer service in our café locations.',
    requirements: JSON.stringify(['Coffee machine experience', 'Customer service background', 'Food safety knowledge', 'Speed and accuracy']),
    salary_range: '18000 - 24000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Kitchen Staff / Food Preparer',
    department: 'Food & Beverage',
    description: 'Support our café operations with food preparation and kitchen management.',
    requirements: JSON.stringify(['Food prep experience', 'Kitchen equipment knowledge', 'Food safety certification', 'Team coordination']),
    salary_range: '19000 - 25000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Café Manager',
    department: 'Food & Beverage',
    description: 'Manage Sunnies Café operations, oversee team, and ensure quality control and excellent customer service.',
    requirements: JSON.stringify(['Café management experience', 'Food safety standards', 'Team leadership', 'Customer service excellence']),
    salary_range: '32000 - 48000 PHP',
    email_domain: '@sunniesstudios.com',
  },

  // MARKETING & DIGITAL
  {
    title: 'Social Media Manager',
    department: 'Marketing & Digital',
    description: 'Manage our strong Instagram and TikTok presence. Create content, engage community, and develop social strategy.',
    requirements: JSON.stringify(['Instagram/TikTok expertise', 'Content creation strategy', 'Engagement metrics understanding', 'Influencer collaboration']),
    salary_range: '32000 - 48000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Digital Marketing Specialist',
    department: 'Marketing & Digital',
    description: 'Manage paid ads (Google, Facebook, TikTok), SEO/SEM, and campaign optimization.',
    requirements: JSON.stringify(['Google Ads & Facebook Ads expertise', 'SEO/SEM knowledge', 'Analytics platform usage', 'Campaign optimization']),
    salary_range: '35000 - 52000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'E-commerce Manager',
    department: 'Marketing & Digital',
    description: 'Manage our online store and international shipping. Optimize e-commerce platform performance.',
    requirements: JSON.stringify(['E-commerce platform experience', 'International logistics', 'Conversion optimization', 'Inventory management']),
    salary_range: '40000 - 60000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Influencer / PR Coordinator',
    department: 'Marketing & Digital',
    description: 'Manage influencer partnerships and PR campaigns. Support brand positioning and media relations.',
    requirements: JSON.stringify(['Influencer management experience', 'PR campaign planning', 'Media relations', 'Brand positioning knowledge']),
    salary_range: '30000 - 45000 PHP',
    email_domain: '@sunniesstudios.com',
  },

  // CORPORATE / HQ
  {
    title: 'HR & Recruitment Officer',
    department: 'Corporate & HQ',
    description: 'Lead recruitment initiatives and employee relations for Sunnies Studios. Support HR operations and compliance.',
    requirements: JSON.stringify(['Recruitment experience', 'HRIS software knowledge', 'Employment law understanding', 'Candidate relationship management']),
    salary_range: '35000 - 50000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Accounting & Finance Staff',
    department: 'Corporate & HQ',
    description: 'Support our finance operations, including accounting records, auditing, and tax compliance.',
    requirements: JSON.stringify(['Accounting software skills', 'Financial reporting experience', 'Audit process knowledge', 'Tax compliance background']),
    salary_range: '32000 - 48000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'IT / Web Developer',
    department: 'Corporate & HQ',
    description: 'Build and maintain our virtual try-on technology and online store. Support our e-commerce platform.',
    requirements: JSON.stringify(['React/Node.js proficiency', 'Web development experience', 'E-commerce platform knowledge', 'AR/VR interest']),
    salary_range: '55000 - 80000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Customer Service Representative',
    department: 'Corporate & HQ',
    description: 'Handle customer inquiries, order support, and problem resolution across all Sunnies Studios channels.',
    requirements: JSON.stringify(['Customer service background', 'Problem-solving ability', 'Communication excellence', 'Multi-language capability']),
    salary_range: '22000 - 30000 PHP',
    email_domain: '@sunniesstudios.com',
  },
  {
    title: 'Business Development / Expansion Manager',
    department: 'Corporate & HQ',
    description: 'Lead market expansion efforts in Vietnam and Southeast Asia. Identify strategic partnerships and growth opportunities.',
    requirements: JSON.stringify(['Business development experience', 'International market knowledge', 'Southeast Asia familiarity', 'Partnership development']),
    salary_range: '50000 - 75000 PHP',
    email_domain: '@sunniesstudios.com',
  },
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
  });

  try {
    // Check if positions already seeded
    const [[{ cnt }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM JobPosition WHERE title LIKE '%Store Associate%'"
    );
    if (cnt > 0) {
      console.log('Sunnies Studios positions already seeded. Skipping.');
      await conn.end();
      return;
    }

    // Get or create departments
    const departments = new Map();
    for (const position of SUNNIES_POSITIONS) {
      const deptName = position.department;
      if (!departments.has(deptName)) {
        const deptId = uuidv4();
        await conn.query(
          'INSERT INTO departments (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id',
          [deptId, deptName]
        );
        departments.set(deptName, deptId);
      }
    }

    // Get HR user for created_by
    const [hrRows] = await conn.query(
      "SELECT id FROM users WHERE email = 'hr@sunniesstudios.com' LIMIT 1"
    );
    const hrId = hrRows[0]?.id || uuidv4();

    // Insert positions
    let inserted = 0;
    for (const position of SUNNIES_POSITIONS) {
      const jobId = uuidv4();
      const deptId = departments.get(position.department);

      await conn.query(
        `INSERT INTO JobPosition 
         (id, title, description, competency_requirements, department_id, created_by_user_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')`,
        [
          jobId,
          position.title,
          position.description,
          position.requirements,
          deptId,
          hrId,
        ]
      );
      inserted++;
      console.log(`✓ Seeded: ${position.title}`);
    }

    console.log(`\n✅ Successfully seeded ${inserted} Sunnies Studios job positions!`);
    console.log(`📧 Company email domain: @sunniesstudios.com`);
    console.log(`🏢 Departments: ${departments.size}`);

  } catch (err) {
    console.error('Error seeding positions:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
