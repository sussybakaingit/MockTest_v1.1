# APPSC Departmental Test - CBT Mock Examination

An offline-capable, interactive Computer-Based Test (CBT) mock exam interface designed to emulate the official JEE Main / NTA examination portal. The exam is populated with the 100 questions from the APPSC Departmental Online Test conducted on 24th November 2020 (Subject Code: 141).

🌐 **Demo / Deployment**: Ready for static hosting platforms like Vercel, GitHub Pages, or Netlify.

---

## 🏛️ Exam Details
- **Subject Code**: 141 (Paper Code)
- **Test Date**: 24/11/2020
- **Total Questions**: 100 Multiple Choice Questions (MCQs)
- **Marking Scheme**: +1 for Correct, 0 for Incorrect (No Negative Marking)
- **Official Duration**: 120 Minutes (Configurable)

---

## ✨ Features

### 1. 🖥️ Authentic NTA/JEE CBT Interface
- **Left Side**: Question panel containing question text, question number, status badge, and clear radio options.
- **Right Side**: Collapsible Question Palette showing numbered grids for all 100 questions with live state indicators.
- **Top Bar**: Countdown timer, candidate name, subject tab, remaining time warning indicator, and dark mode / fullscreen toggles.
- **Bottom Navigation**: Previous, Next, Save & Next, Mark for Review & Next, Clear Response, and Submit Test.

### 2. 🎨 JEE-Style Color Coding
- ⬜ **Gray**: Not Visited
- 🟥 **Red**: Not Answered
- 🟩 **Green**: Answered
- 🟪 **Purple**: Marked for Review
- 🟪✓ **Purple with Checkmark**: Answered & Marked for Review (considered for evaluation)
- 🟧 **Orange Border**: Current Active Question

### 3. ⚙️ Custom Exam Settings (Landing Page)
- Input custom candidate name.
- Manually set exam duration in minutes.
- **Shuffling Options**: 
  - Randomize question order.
  - Randomize option order (correct answers are dynamically tracked and mapped correctly).

### 4. ⌨️ Accessibility & Shortcuts
- Navigate questions using **Left Arrow** (Previous) and **Right Arrow** (Save & Next).
- Zoom and scaling support using browser hotkeys.

### 5. 💾 Auto-Save Progress
- Responses and active timer state are automatically saved to `localStorage` every 10 seconds.
- Refreshing the browser or accidental closing will restore your ongoing session exactly where you left off.

### 6. 📊 Detailed Result Analytics & Scorecard
- Instantly calculated marks, percentage, and accuracy.
- Responsive graphical charts (Pie Chart & Bar Chart) built using vanilla Canvas (no external heavy dependencies).
- Time analytics: Fastest answered question, slowest answered question, average time per question, and total test duration.
- Official-style downloadable and printable scorecard.

### 7. 📖 Detailed Review Mode
- Review every question after submission.
- Highlighting of selected correct answers (Green) vs incorrect attempts (Red).
- Explanations display the correct answer and candidate choice.

---

## 🛠️ Technical Stack
- **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript
- **Graphics**: HTML5 Canvas (Zero external libraries for performance & offline reliability)
- **Typography**: Google Fonts (Inter)
- **Hosting Compatibility**: 100% static, requires no backend server.
git clone https://github.com/sussybakaingit/MockTest_v1.1.git
cd MockTest_v1.1
open index.html
```
