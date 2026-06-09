# 🚀 RUN THESE COMMANDS IN COMMAND PROMPT (cmd.exe)

## STEP 1: Open Command Prompt (Run as Administrator)

Press: Windows Key + R
Type: cmd
Press: Ctrl + Shift + Enter (to run as Admin)

---

## STEP 2: Start MySQL Service

Copy & Paste this command:

```
net start MySQL80
```

Expected output:
```
The MySQL80 service is starting.
The MySQL80 service was started successfully.
```

If it says "service already started", that's fine - just continue.

---

## STEP 3: Navigate to Backend & Install Dependencies

Copy & Paste:

```
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend" && npm install
```

Wait for it to complete (shows "added X packages").

---

## STEP 4: Seed Database

Copy & Paste:

```
npm run seed
```

Wait for it to complete.

---

## STEP 5: Seed Sunnies Studios Positions

Copy & Paste:

```
node scripts/seed-sunnies-positions.js
```

Expected output:
```
✓ Seeded: Store Associate - Sales
✓ Seeded: Optical Dispenser / Optometrist
... (25 total)

✅ Successfully seeded 25 Sunnies Studios job positions!
📧 Company email domain: @sunniesstudios.com
🏢 Departments: 7
```

---

## STEP 6: Start Backend Server

Copy & Paste:

```
npm run dev
```

Expected output:
```
AWLMS backend listening on http://localhost:5000
Database health check: PASSED
Connected to MySQL successfully
```

**KEEP THIS WINDOW OPEN** - Backend is running!

---

## STEP 7: Open NEW Command Prompt Window

Press: Windows Key + R
Type: cmd
Press: Enter

---

## STEP 8: Navigate to Frontend & Install

Copy & Paste:

```
cd "c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend" && npm install
```

Wait for completion.

---

## STEP 9: Start Frontend Server

Copy & Paste:

```
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**KEEP THIS WINDOW OPEN** - Frontend is running!

---

## STEP 10: Open Browser

Go to: **http://localhost:5173**

---

## ✅ THAT'S IT!

You should see:
- ✅ Sunnies Studios home page
- ✅ 25 job positions visible
- ✅ System fully functional

---

## 🎮 TEST THE SYSTEM

1. Click "View Openings"
2. See all 25 positions
3. Click "Apply Now" on any job
4. Register: test@example.com / Password123
5. Fill out application
6. Upload resume (any PDF)
7. Click "Start Interview"
8. Allow webcam
9. Answer interview questions

---

## 📊 YOU'LL HAVE 2 TERMINAL WINDOWS OPEN

**Window 1 - Backend (Port 5000):**
```
AWLMS backend listening on http://localhost:5000
Database health check: PASSED
Connected to MySQL successfully
```

**Window 2 - Frontend (Port 5173):**
```
VITE v5.0.0 ready in 1234 ms
Local: http://localhost:5173/
```

---

## 🎮 DEMO CREDENTIALS

To test HR features, use:

```
Email: hr@sunniesstudios.com
Password: Demo123!
```

---

## 🛑 TO STOP THE SYSTEM

**In each terminal window:**
- Press: Ctrl + C
- Or just close the window

---

## ❌ TROUBLESHOOTING

### "The MySQL80 service is not started"
```
Solution:
1. Open Services (search "Services" in Windows)
2. Find "MySQL80"
3. Right-click → Start
4. Or try: net start MySQL80
```

### "npm not found"
```
Solution:
1. Install Node.js from https://nodejs.org
2. Restart Command Prompt
3. Try the commands again
```

### "Port 5000 already in use"
```
Solution:
1. Close any other npm servers
2. Or run: taskkill /IM node.exe /F
3. Then try again
```

### "Cannot find module"
```
Solution:
1. Make sure npm install completed successfully
2. Run again: npm install
3. Then try: npm run dev
```

---

**Ready? Follow the 10 steps above!** 🚀
