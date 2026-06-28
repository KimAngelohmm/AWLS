"""
Build PSF Knowledge Base JSON from Philippine Skills Framework PDFs.
Run: python scripts/build-psf-kb.py
Output: src/services/psfKnowledgeBase.json
"""
import pypdf, os, json, re

folder = r'c:\Users\kiman\OneDrive\Documents\Figma\Capstone Project\for work applicants'

NOISE = {
    'Philippine Skills Framework', 'Career Map', 'Skills Map', 'Skill Map',
    'Table of Contents', 'Technical Guide', 'Acknowledgments', 'Testimonial',
    'Introduction', 'Messages', 'About', 'Section', 'Continue to next page',
    'Use the buttons', 'to navigate', 'This e-book is interactive',
}

def clean_skill(s):
    # Remove trailing level markers left by regex
    s = re.sub(r'\s+Level\s*$', '', s).strip()
    s = re.sub(r'\^\s*$', '', s).strip()
    return s

def is_noise(s):
    if len(s) < 5 or len(s) > 75:
        return True
    if re.match(r'^\d', s):
        return True
    for n in NOISE:
        if n.lower() in s.lower():
            return True
    # Repeated words like "Engineer 2 Engineer 2"
    if re.search(r'(\b\w+\b).*\1.*\1', s):
        return True
    return False

def extract_competencies(text):
    fsc = []
    esc = []

    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) < 5:
            continue

        # FSC: lines ending with level numbers like "Data Analytics 2 2 4 5"
        if re.search(r'[A-Za-z]\s+\d(\s+\d)*\s*$', line):
            skill = re.sub(r'\s+\d[\d\s]*$', '', line).strip()
            skill = clean_skill(skill)
            if not is_noise(skill) and skill not in fsc:
                fsc.append(skill)

        # ESC: lines ending with Basic / Intermediate / Advanced
        elif re.search(r'(Basic|Intermediate|Advanced)\s*$', line):
            skill = re.sub(r'\s+(Basic|Intermediate|Advanced)\s*$', '', line).strip()
            skill = clean_skill(skill)
            if not is_noise(skill) and skill not in esc:
                esc.append(skill)

    return fsc, esc


files_info = [
    (
        'Philippine Skills Framework for Analytics and Artificial Intelligence.pdf',
        'Analytics and AI',
        ['Data Analyst', 'AI Engineer', 'Data Scientist', 'Business Intelligence Analyst',
         'Data Engineer', 'AI Researcher', 'Data Steward', 'Analytics Manager'],
        'Covers data analytics, machine learning, AI engineering, business intelligence, '
        'and data governance roles in the Philippine ICT sector.'
    ),
    (
        'Philippine Skills Framework for Contact Center and Business Process Management.pdf',
        'Contact Center and BPM',
        ['Customer Service Representative', 'Team Leader', 'Quality Analyst',
         'Operations Manager', 'BPO Trainer', 'Workforce Analyst'],
        'Covers customer service, BPO operations, quality assurance, and workforce '
        'management roles in the contact center industry.'
    ),
    (
        'Philippine Skills Framework for Global In-House Center.pdf',
        'Global In-House Center',
        ['IT Support Analyst', 'HR Shared Services Specialist', 'Finance Shared Services Analyst',
         'Supply Chain Analyst', 'Service Center Manager', 'Business Intelligence Analyst'],
        'Covers IT, HR, finance, and supply chain roles within global in-house centers '
        'and shared services organizations.'
    ),
    (
        'Philippine Skills Framework for Software Development and Security.pdf',
        'Software Development and Security',
        ['Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
         'Cybersecurity Analyst', 'QA Engineer', 'DevOps Engineer', 'Systems Architect',
         'Infrastructure Support Engineer', 'Database Administrator'],
        'Covers software engineering, cybersecurity, DevOps, QA, and infrastructure '
        'roles across software development delivery.'
    ),
    (
        'PSF - Business Development.pdf',
        'Business Development',
        ['Sales Associate', 'Marketing Specialist', 'Business Development Manager',
         'Account Manager', 'Partnership Manager', 'Brand Manager'],
        'Covers sales, marketing, partnership management, and brand development roles '
        'across industries.'
    ),
    (
        'PSF - Digital Art and Animation.pdf',
        'Digital Art and Animation',
        ['2D Animator', '3D Animator', 'Concept Artist', 'UI Designer',
         'Motion Graphics Artist', 'Animation Director'],
        'Covers pre-production, production, and post-production roles in digital art, '
        '2D/3D animation, and visual effects.'
    ),
    (
        'PSF - Electronics.pdf',
        'Electronics',
        ['Electronics Technician', 'Process Engineer', 'Quality Control Engineer',
         'Automation Engineer', 'Manufacturing Engineer'],
        'Covers semiconductor and electronics manufacturing, automation, quality control, '
        'and process engineering roles.'
    ),
    (
        'PSF - Game Development.pdf',
        'Game Development',
        ['Game Developer', 'Game Designer', 'Technical Artist', 'QA Tester',
         'Game Producer', 'Level Designer', 'Game Sound Designer'],
        'Covers game programming, design, art, production, QA, and sound design roles '
        'in the game development industry.'
    ),
    (
        'PSF - Health Information and Management.pdf',
        'Health Information Management',
        ['Medical Coder', 'Health Information Analyst', 'Clinical Data Specialist',
         'Healthcare Compliance Officer', 'Medical Records Manager'],
        'Covers health information management, medical coding, clinical data, and '
        'healthcare compliance roles for payer, provider, and life sciences sectors.'
    ),
    (
        'PSF - Human Capital Development.pdf',
        'Human Capital Development',
        ['HR Generalist', 'Recruiter', 'HR Business Partner', 'Learning and Development Specialist',
         'Compensation and Benefits Analyst', 'HR Manager', 'Chief HR Officer'],
        'Covers HR operations, talent management, learning and development, compensation, '
        'labor relations, and strategic HR leadership roles.'
    ),
    (
        'PSF - Supply Chain and Logistics.pdf',
        'Supply Chain and Logistics',
        ['Warehouse Associate', 'Logistics Coordinator', 'Freight Forwarder',
         'Supply Chain Analyst', 'Transportation Manager', 'Procurement Specialist'],
        'Covers warehouse management, transportation, freight forwarding, procurement, '
        'and logistics information systems roles.'
    ),
]

psf_kb = {}

for fname, domain, roles, description in files_info:
    path = os.path.join(folder, fname)
    reader = pypdf.PdfReader(path)
    total = len(reader.pages)
    text = ''
    for i in range(7, min(80, total)):
        t = reader.pages[i].extract_text() or ''
        text += t + '\n'

    fsc, esc = extract_competencies(text)
    psf_kb[domain] = {
        'description': description,
        'roles': roles,
        'functional_skills': fsc[:30],
        'enabling_skills': esc[:12],
    }
    print(domain + ': ' + str(len(fsc)) + ' FSC, ' + str(len(esc)) + ' ESC')

out_path = r'c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend\src\services\psfKnowledgeBase.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(psf_kb, f, ensure_ascii=False, indent=2)

print('\nSaved to ' + out_path)
