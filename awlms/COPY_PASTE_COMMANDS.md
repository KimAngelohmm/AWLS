# ⚡ QUICKEST WAY TO RUN SYSTEM (Copy & Paste Commands)

## 🎯 OPTION 1: FASTEST (Copy commands one at a time)

### Step 1: Open Command Prompt as Administrator
```
Windows Key + R
Type: cmd
Press: Ctrl + Shift + Enter (to run as Admin)
```

### Step 2: Copy & Paste EACH command below (one at a time)

**Command 1 - Start MySQL:**
```cmd
net start MySQL80
```
Wait for: "The MySQL80 service was started successfully."

**Command 2 - Setup Backend:**
```cmd
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend" && npm install && npm run seed && node scripts/seed-sunnies-positions.js
```
Wait for completion (this takes ~1-2 minutes).

**Command 3 - Open New Command Prompt**
```
Windows Key + R
Type: cmd
Press: Enter
```

**Command 4 - Start Frontend:**
```cmd
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend" && npm install && npm run dev
```
Wait for: "Local: http://localhost:5173/"

### Step 3: Open Third Command Prompt

**Command 5 - Start Backend (in new window):**
```
Windows Key + R
Type: cmd
Press: Enter
```

Then paste:
```cmd
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend" && npm run dev
```
Wait for: "listening on http://localhost:5000"

### Step 4: Open Browser

Go to: **http://localhost:5173**

---

## 🎯 OPTION 2: USING BATCH FILES (Easier)

### Step 1: Open File Explorer
```
Windows Key + E
Navigate to: c:\Users\kiman\OneDrive\Documents\Figma\awlms\
```

### Step 2: Run Setup Script
```
Right-click: SETUP_ONLY.bat
Select: Run as administrator
Wait for completion (1-2 minutes)
```

### Step 3: Open Command Prompt #1
```
Windows Key + R
Type: cmd
Press: Enter
```

Paste:
```cmd
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend" && npm run dev
```

### Step 4: Open Command Prompt #2
```
Windows Key + R
Type: cmd
Press: Enter
```

Paste:
```cmd
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend" && npm run dev
```

### Step 5: Open Browser
```
http://localhost:5173
```

---

## ✅ SUCCESS INDICATORS

You'll see:

**Backend Terminal:**
```
AWLMS backend listening on http://localhost:5000
Database health check: PASSED
Connected to MySQL successfully
```

**Frontend Terminal:**
```
VITE v5.0.0 ready in 1234 ms
Local: http://localhost:5173/
```

**Browser:**
```
Sunnies Studios home page loads
25 job positions visible
No error messages
```

---

## 🧪 QUICK TEST

1. Browser shows http://localhost:5173
2. Click "View Openings"
3. See 25 positions
4. Click "Apply Now"
5. Register & fill form
6. Upload resume
7. Start interview
8. Grant webcam
9. Answer questions

---

## 🎮 LOGIN CREDENTIALS

```
HR:
  Email: hr@sunniesstudios.com
  Password: Demo123!

Manager:
  Email: manager@sunniesstudios.com
  Password: Demo123!

Employee:
  Email: employee@sunniesstudios.com
  Password: Demo123!
```

---

## 🛑 STOPPING

Press `Ctrl + C` in each terminal window, or close them.

---

## ❌ COMMON ISSUES

### "net start MySQL80" fails
```
1. Open Services (search in Windows)
2. Find MySQL80
3. Right-click → Properties → Start
4. Or install MySQL from https://dev.mysql.com/downloads/mysql/
```

### "npm not found"
```
1. Install Node.js: https://nodejs.org
2. Restart Command Prompt
3. Try again
```

### "Port already in use"
```
taskkill /IM node.exe /F
Then try again
```

### "Cannot find module"
```
Run: npm install
Then: npm run dev
```

---

## 📁 FILES CREATED FOR YOU

Batch files (in project root):
- `START_SYSTEM.bat` - Full automatic startup
- `SETUP_ONLY.bat` - Just setup (no server start)
- `START_BACKEND.bat` - Backend only
- `START_FRONTEND.bat` - Frontend only
- `SEED_DATABASE.bat` - Database seeding only
- `RUN_SYSTEM_STEPS.md` - Step-by-step guide

Documentation:
- In session folder: Multiple detailed guides

---

## 🚀 READY NOW?

**Choose your method:**

**Easy way:** Run `SETUP_ONLY.bat` then open 2 command prompts

**Manual way:** Copy & paste the commands above

**Result:** System running on http://localhost:5173

---

**LET'S GO!** 🎉
