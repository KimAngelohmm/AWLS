# 🚀 SUNNIES STUDIOS AWLMS - TERMINAL STARTUP GUIDE

## 📂 NEW BATCH FILES CREATED

In your project root: `c:\Users\kiman\OneDrive\Documents\Figma\awlms\`

```
START_SYSTEM.bat          ← RUN THIS FIRST (Starts everything automatically)
START_BACKEND.bat         ← Start backend only (Port 5000)
START_FRONTEND.bat        ← Start frontend only (Port 5173)
SEED_DATABASE.bat         ← Seed database with 25 positions
```

---

## 🎯 QUICKEST WAY TO RUN (Recommended)

### Option 1: One-Click Start (EASIEST)
1. Open Windows Explorer
2. Navigate to: `c:\Users\kiman\OneDrive\Documents\Figma\awlms\`
3. **Double-click: `START_SYSTEM.bat`**
4. Wait for browser to open automatically

**This will:**
✅ Start MySQL (if not running)
✅ Seed database (if needed)
✅ Start backend server (Port 5000)
✅ Start frontend server (Port 5173)
✅ Open browser automatically

---

## 🔧 ALTERNATIVE: Manual Terminal Startup

### Prerequisites (Do Once)
```cmd
REM Ensure Node.js modules installed
cd c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend
npm install

cd c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend
npm install
```

### Step 1: Start MySQL
```cmd
net start MySQL80
```

Or if above doesn't work:
- Search "Services" in Windows
- Find "MySQL80" 
- Right-click → Start

### Step 2: Seed Database (First Time Only)
```cmd
cd c:\Users\kiman\OneDrive\Documents\Figma\awlms
SEED_DATABASE.bat
```

Or manually:
```cmd
cd backend
npm run seed
node scripts/seed-sunnies-positions.js
```

### Step 3: Start Backend
**In Terminal 1:**
```cmd
cd c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend
npm run dev
```

**Expected output:**
```
AWLMS backend listening on http://localhost:5000
Database health check: PASSED
Connected to MySQL successfully
```

### Step 4: Start Frontend
**In Terminal 2:**
```cmd
cd c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 5: Open Browser
```
http://localhost:5173
```

---

## ✅ VERIFICATION CHECKLIST

After startup, check:

```
✓ Backend terminal shows: "listening on http://localhost:5000"
✓ Frontend terminal shows: "Local:   http://localhost:5173/"
✓ Browser opens automatically
✓ Page shows "Sunnies Studios" branding
✓ Job listings visible
✓ No red error messages
```

---

## 🎬 WHAT TO DO NEXT

### Test the System (5 minutes):
1. Click "View Openings" on home page
2. See 25 Sunnies Studios positions
3. Click "Apply Now" on any job
4. Fill out application
5. Upload resume
6. Start interview
7. Allow webcam access
8. Answer questions
9. Complete interview

### View HR Dashboard:
1. Click "Login" (top right)
2. Email: `hr@sunniesstudios.com`
3. Password: `Demo123!`
4. See your application in HR dashboard
5. View resume score and interview logs

### Check Email:
1. Look in your Gmail inbox
2. Should see:
   - "Application Received" email
   - "Interview Scheduled" email
3. Emails mention "Sunnies Studios"

---

## 🛑 STOPPING THE SYSTEM

### Method 1 (Easiest):
Close all terminal windows.

### Method 2 (Clean):
```cmd
taskkill /IM node.exe /F
```

### Method 3 (MySQL):
```cmd
net stop MySQL80
```

---

## ❌ TROUBLESHOOTING

### Issue: "MySQL service not found"
```
Solution:
1. Make sure MySQL 5.7+ is installed
2. Try: net start MySQL80
3. If error, try: net start MySQL57
4. Or install: https://dev.mysql.com/downloads/mysql/
```

### Issue: "Port 5000 already in use"
```
Solution:
taskkill /PID <PID> /F

Or change backend port in:
c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend\.env
PORT=5001
```

### Issue: "Port 5173 already in use"
```
Solution:
Same as above for port 5173
```

### Issue: "Cannot find npm command"
```
Solution:
1. Ensure Node.js is installed: https://nodejs.org
2. Restart terminal after installation
3. Verify: npm -v
```

### Issue: "Database connection failed"
```
Solution:
1. Verify MySQL is running: tasklist | findstr mysql
2. Check credentials in backend/.env:
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=awlms
```

### Issue: "Jobs not showing"
```
Solution:
1. Run: SEED_DATABASE.bat
2. Verify: 
   mysql -u root -p -D awlms -e "SELECT COUNT(*) FROM JobPosition;"
3. Should show: 25 (or 27)
```

---

## 📊 SYSTEM ENDPOINTS

Once running:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Frontend | http://localhost:5173 | React app |
| Backend API | http://localhost:5000 | REST API |
| Health Check | http://localhost:5000/api/health | System status |
| Careers | http://localhost:5173/careers | Job listings |
| Login | http://localhost:5173/login | HR/Manager login |
| HR Dashboard | http://localhost:5173/hr/dashboard | HR panel |
| Manager Dashboard | http://localhost:5173/manager | Manager panel |
| Employee Dashboard | http://localhost:5173/employee | Employee panel |

---

## 🎁 DEMO CREDENTIALS

Use these to test the system:

```
HR Account:
  Email: hr@sunniesstudios.com
  Password: Demo123!
  Access: Full HR dashboard, recruitment, lifecycle

Manager Account:
  Email: manager@sunniesstudios.com
  Password: Demo123!
  Access: Team performance, evaluations

Employee Account:
  Email: employee@sunniesstudios.com
  Password: Demo123!
  Access: Profile, history, evaluations
```

---

## 📱 WHAT PANELISTS WILL SEE

When you run the system and demo:

1. **Home Page** - Sunnies Studios branding
2. **Careers** - 25 real job positions
3. **Application** - Resume upload, form filling
4. **Interview** - Webcam, questions, recording
5. **Monitoring** - Tab-switch detection, logging
6. **HR Dashboard** - Applicant review, scoring
7. **Email** - Notifications in inbox
8. **Lifecycle** - Complete employee timeline

---

## ⏱️ EXPECTED STARTUP TIME

```
MySQL:           < 5 seconds
Backend startup: 15-30 seconds
Frontend build:  30-60 seconds
Total:           ~2 minutes (first time)
                 ~30 seconds (subsequent)
```

---

## 🎯 QUICK SUMMARY

### ONE-CLICK START:
```
c:\Users\kiman\OneDrive\Documents\Figma\awlms\START_SYSTEM.bat
```

### Or THREE TERMINALS:
```
Terminal 1: net start MySQL80
Terminal 2: cd backend && npm run dev
Terminal 3: cd frontend && npm run dev
```

### Then:
```
http://localhost:5173
```

---

## 📞 IF SOMETHING GOES WRONG

Check these in order:

1. **Is MySQL running?**
   ```cmd
   tasklist | findstr mysql
   ```
   If not: `net start MySQL80`

2. **Is backend running?**
   Check terminal: Should see "listening on 5000"

3. **Is frontend running?**
   Check terminal: Should see "Local: http://localhost:5173"

4. **Do database tables exist?**
   ```cmd
   mysql -u root -p -D awlms -e "SHOW TABLES;"
   ```

5. **Are positions seeded?**
   ```cmd
   mysql -u root -p -D awlms -e "SELECT COUNT(*) FROM JobPosition;"
   ```
   Should show: 25+

---

## ✨ YOU'RE ALL SET!

Your Sunnies Studios AWLMS system is ready to run.

**Next action:** 
1. Run `START_SYSTEM.bat`
2. Wait for browser to open
3. Explore the system
4. Test workflows
5. Show panelists

**Total setup time: ~2 minutes** ⏱️

Good luck! 🚀
