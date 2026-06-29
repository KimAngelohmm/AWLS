-- ============================================================
-- Migration 022: Seed Test Accounts with Real Passwords
-- ============================================================
-- Updates placeholder password hashes with real bcrypt hashes
-- for testing purposes only
-- ============================================================

USE awlms;

-- Administrator Account (created in migration_020)
-- Email: admin@awlms.com | Password: Admin123!
UPDATE `users` SET `password_hash` = '$2a$10$3o6YnzOD9JEopecYrCHTmujOOR/jL4laciabsCSRuhD5Mj08823y6' WHERE `email` = 'admin@awlms.com';

-- HR Account
-- Email: ana.reyes@company.com | Password: HRPassword123!
UPDATE `users` SET `password_hash` = '$2a$10$6Wg7CzFfpKFR0XetY7HYWeq17PElcSkEzql8ad1kXX/jKX/Tcirda' WHERE `email` = 'ana.reyes@company.com';

-- Manager Account
-- Email: jose.dela.cruz@company.com | Password: ManagerPass123!
UPDATE `users` SET `password_hash` = '$2a$10$e2BIif/Bpn6oHSSak3tTg.IxDzIf7NJU99UG70nexs23eGA8nbxAa' WHERE `email` = 'jose.dela.cruz@company.com';

-- Employee Accounts
-- Email: francis.santos@company.com | Password: EmployeePass123!
UPDATE `users` SET `password_hash` = '$2a$10$bIzucXIHRpo/Tc4ZIM1LJ.PNUBJ9PKX5meYVAuyMPKFQQ7FuG5N9.' WHERE `email` = 'francis.santos@company.com';

UPDATE `users` SET `password_hash` = '$2a$10$bIzucXIHRpo/Tc4ZIM1LJ.PNUBJ9PKX5meYVAuyMPKFQQ7FuG5N9.' WHERE `email` = 'anya.mansilla@company.com';

UPDATE `users` SET `password_hash` = '$2a$10$bIzucXIHRpo/Tc4ZIM1LJ.PNUBJ9PKX5meYVAuyMPKFQQ7FuG5N9.' WHERE `email` = 'kim.badic@company.com';

UPDATE `users` SET `password_hash` = '$2a$10$bIzucXIHRpo/Tc4ZIM1LJ.PNUBJ9PKX5meYVAuyMPKFQQ7FuG5N9.' WHERE `email` = 'lena.garcia@company.com';

-- NOTE: For production, set unique strong passwords for each account.
-- Run: UPDATE users SET password_hash = bcrypt_hash('UniquePassword') WHERE email = 'user@email.com';
