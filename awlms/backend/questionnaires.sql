-- Create questionnaire table
CREATE TABLE IF NOT EXISTS InterviewQuestionnaire (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_title VARCHAR(255) NOT NULL,
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_role_question (job_title, question_number),
  INDEX idx_job_title (job_title)
);

-- Insert all questionnaires
INSERT INTO InterviewQuestionnaire (job_title, question_number, question_text) VALUES
-- Sales Associate
('Sales Associate', 1, 'How would you approach a customer who seems unsure about what frame style suits them?'),
('Sales Associate', 2, 'A customer asks about the difference between polarized and anti-radiation lenses. How do you explain this simply?'),
('Sales Associate', 3, 'Which best describes your approach to upselling — recommending higher-priced items regardless, suggesting add-ons only when relevant, never recommending extras, or following a script?'),
('Sales Associate', 4, 'Describe a time you turned a hesitant customer into a buyer. What did you do?'),
('Sales Associate', 5, 'How comfortable are you achieving daily or weekly sales targets?'),
('Sales Associate', 6, 'A customer wants to return a frame they bought 2 weeks ago with no defect. How do you handle it?'),
('Sales Associate', 7, 'How many products can you confidently talk about after one week of product training?'),

-- Cashier
('Cashier', 1, 'A customer\'s card is declined but they insist the account has funds. How do you handle the situation?'),
('Cashier', 2, 'How do you ensure accuracy when processing cash transactions during a busy Saturday?'),
('Cashier', 3, 'Which POS or payment system have you used before?'),
('Cashier', 4, 'You notice the till is short by ₱200 at end of shift. What do you do?'),
('Cashier', 5, 'How do you stay calm and accurate during long queues at peak hours?'),
('Cashier', 6, 'A customer was overcharged and only noticed when they got home. How do you process the correction?'),
('Cashier', 7, 'What does good cashier etiquette look like to you during a transaction?'),

-- Optometrist
('Optometrist', 1, 'Walk us through how you conduct a standard comprehensive eye exam.'),
('Optometrist', 2, 'A patient presents with symptoms that may indicate early glaucoma. What is your next step?'),
('Optometrist', 3, 'How do you communicate a new prescription to a patient who is anxious about wearing glasses for the first time?'),
('Optometrist', 4, 'Which diagnostic instruments are you proficient with?'),
('Optometrist', 5, 'How do you handle a patient who disagrees with your diagnosis and insists they don\'t need glasses?'),
('Optometrist', 6, 'Describe your experience recommending lens coatings or add-ons (e.g. blue-light, photochromic) alongside a prescription.'),
('Optometrist', 7, 'How do you balance clinical accuracy with making the exam experience feel relaxed and friendly?'),

-- Visual Merchandiser
('Visual Merchandiser', 1, 'How do you decide which products to feature prominently in a store window display?'),
('Visual Merchandiser', 2, 'Sunnies Studios is launching a new pastel collection. Describe the display concept you would create.'),
('Visual Merchandiser', 3, 'Which tools or software have you used for layout planning?'),
('Visual Merchandiser', 4, 'How do you ensure a display stays on-brand while still feeling fresh each season?'),
('Visual Merchandiser', 5, 'A branch manager wants a display that maximizes traffic flow and highlights a promo. How do you balance both?'),
('Visual Merchandiser', 6, 'How do you measure whether a visual merchandising change actually worked?'),
('Visual Merchandiser', 7, 'Describe your process for collaborating with the marketing team on a product launch rollout.'),

-- Marketing Staff
('Marketing Staff', 1, 'How would you describe Sunnies Studios\' brand voice in three words, and how would you apply it to an Instagram caption?'),
('Marketing Staff', 2, 'Which platforms would you prioritize for a new Sunnies Face collection launch, and why?'),
('Marketing Staff', 3, 'Walk us through how you would plan a 30-day content calendar for Sunnies Café.'),
('Marketing Staff', 4, 'A campaign post received negative comments about product quality. How do you respond publicly?'),
('Marketing Staff', 5, 'How do you measure the success of an influencer marketing campaign?'),
('Marketing Staff', 6, 'Describe a digital campaign you worked on (or would design) that drove in-store foot traffic.'),
('Marketing Staff', 7, 'How do you stay updated with trends relevant to a Gen Z and millennial audience in the Philippines?'),

-- Store Manager
('Store Manager', 1, 'How do you motivate a team that is consistently missing sales targets?'),
('Store Manager', 2, 'Walk us through how you open and close a retail store at the start and end of the day.'),
('Store Manager', 3, 'A top-performing staff member is frequently late. How do you address this?'),
('Store Manager', 4, 'How do you handle stock discrepancies found during inventory count?'),
('Store Manager', 5, 'Which metric matters most to you as a store manager — sales revenue, customer satisfaction, staff morale, or inventory accuracy?'),
('Store Manager', 6, 'Describe how you would onboard a new team member in their first week.'),
('Store Manager', 7, 'How do you balance delivering results for HQ while keeping your team from burning out?');

-- Add facial_expression_data table to store expressions during interviews
CREATE TABLE IF NOT EXISTS InterviewFacialData (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  emotion VARCHAR(50),
  confidence DECIMAL(5, 3),
  expressions JSON,
  INDEX idx_applicant_id (applicant_id),
  INDEX idx_timestamp (timestamp)
);
