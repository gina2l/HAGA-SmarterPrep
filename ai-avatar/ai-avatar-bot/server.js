// =================================================================
//      server.js (HYBRID ADAPTIVE & DEEP LEARNING ENABLED)
// =================================================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const os = require('os');
const { GoogleGenAI } = require('@google/genai');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');

// =================================================================
// DATABASE SETUP
// =================================================================
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'interview_trainer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// =================================================================
// APP SETUP
// =================================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not defined');
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const CURRENT_MODEL = 'gemini-2.5-flash';

// =================================================================
// GLOBAL STATE
// =================================================================
let knowledgeBase = "";
let chatHistory = [];
let jobDescription = "";
let interviewerPersona = { gender: "neutral", personality: "professional", tone: "professional" };
let interviewDifficulty = "medium"; // dynamically updated

// =================================================================
// MULTER SETUP
// =================================================================
const uploadDir = path.join(os.tmpdir(), 'ai-avatar-uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

// =================================================================
// HELPERS
// =================================================================
async function getActiveInterviewId(userId) {
  const uid = parseInt(userId);
  if (isNaN(uid)) return null;
  const [rows] = await db.query(
    'SELECT id FROM interviews WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [uid]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * ADAPTIVE LOGIC: Fetches latest behavior metrics
 */
async function getBehaviorAnalysis(interviewId) {
  try {
    const [rows] = await db.query(
      `SELECT emotion, posture_alert, eye_contact
       FROM behaviormetrics
       WHERE interview_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [interviewId]
    );

    if (rows.length === 0) {
      return { score: 10, status: "Normal", eyeScore: 10, postureScore: 10 };
    }

    const latest = rows[0];
    const eye = (latest.eye_contact || "").trim();
    const posture = (latest.posture_alert || "").trim();
    const emotion = (latest.emotion || "").trim();

    let issues = [];
    let score = 10;

    let eyeScore = eye === "Good" ? 10 : 4;
    let postureScore = posture === "Good Posture" ? 10 : 4;

    if (eye !== "Good") issues.push("not making eye contact (looking away)"), score -= 3;
    if (posture !== "Good Posture") issues.push("slouching/poor posture"), score -= 3;

    const negativeEmotions = ["angry", "sad", "scared", "disgusted", "no face"];
    if (negativeEmotions.includes(emotion.toLowerCase())) issues.push(`appearing ${emotion}`), score -= 2;

    return {
      score: Math.max(score, 0),
      eyeScore,
      postureScore,
      status: issues.length > 0
        ? `USER BEHAVIOR ISSUES: The candidate is currently ${issues.join(" and ")}.`
        : "User behavior is excellent."
    };
  } catch (e) {
    console.warn("Behavior analysis fallback:", e.message);
    return { score: 7.0, status: "Normal", eyeScore: 7, postureScore: 7 };
  }
}

// =================================================================
// ENDPOINTS
// =================================================================

app.get('/api/list-models', async (req, res) => {
  try { const result = await gemini.models.list(); res.json(result); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const userId = parseInt(req.body.userId);
    knowledgeBase = ""; chatHistory = []; jobDescription = "";
    interviewDifficulty = "medium";

    const [intResult] = await db.query('INSERT INTO interviews (user_id, start_time) VALUES (?, NOW())', [userId]);
    const interviewId = intResult.insertId;

    if (req.files) {
      for (const file of req.files) {
        if (file.mimetype === 'application/pdf') {
          const dataBuffer = fs.readFileSync(file.path);
          const data = await pdf(dataBuffer);
          knowledgeBase += data.text + "\n";
        }
        await db.query(`INSERT INTO documents (user_id, type, filename, upload_time) VALUES (?, 'cv', ?, NOW())`, [userId, file.originalname]);
        fs.unlinkSync(file.path);
      }
    }
    res.json({ message: "Upload successful", interviewId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/job', async (req, res) => {
  const { job, userId } = req.body;
  jobDescription = job || "";
  const id = await getActiveInterviewId(userId);
  if (id) await db.query('UPDATE interviews SET job_description = ? WHERE id = ?', [jobDescription, id]);
  res.json({ reply: "Job set." });
});

app.post('/api/settings', (req, res) => {
  interviewDifficulty = req.body.difficulty || "medium";
  res.json({ reply: "Settings saved" });
});

app.post('/api/persona', (req, res) => {
  interviewerPersona.gender = req.body.gender || "neutral";
  res.json({ reply: "Persona set" });
});

// ✅ Updated: store exact frontend metrics without forcing defaults
app.post('/api/metrics', async (req, res) => {
  try {
    const interviewId = await getActiveInterviewId(req.body.userId);
    if (!interviewId) return res.status(404).json({ error: "No active interview" });

    const rawEye = req.body.eye_contact;
    const rawPosture = req.body.posture_alert;
    const rawEmotion = req.body.emotion;

    const eye = typeof rawEye === "string" ? rawEye.trim() : null;
    const posture = typeof rawPosture === "string" ? rawPosture.trim() : null;
    const emotion = typeof rawEmotion === "string" ? rawEmotion.trim() : null;

    // Insert exactly what frontend sends
    const [result] = await db.query(
      `INSERT INTO behaviormetrics (interview_id, timestamp, eye_contact, emotion, posture_alert)
       VALUES (?, NOW(), ?, ?, ?)`,
      [interviewId, eye, emotion, posture]
    );

    res.json({ message: "Saved metrics snapshot", id: result.insertId });
  } catch (err) {
    console.error("Metrics Error:", err);
    res.status(500).json({ error: "DB Error" });
  }
});

// All remaining endpoints 
app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const interviewId = await getActiveInterviewId(userId);
    if (!interviewId) return res.status(404).json({ error: 'No active interview' });

    chatHistory.push(`User: ${message}`);

    const [qRows] = await db.query('SELECT id FROM questions WHERE interview_id = ? ORDER BY id DESC LIMIT 1', [interviewId]);
    const lastQId = qRows.length > 0 ? qRows[0].id : null;

    const behavior = await getBehaviorAnalysis(interviewId);

    const prompt = `
      You are a ${interviewerPersona.gender} interviewer with ${interviewerPersona.personality} personality.
      Role: ${jobDescription || "Software Developer"}. Difficulty Level: ${interviewDifficulty.toUpperCase()}.
      Candidate CV: ${knowledgeBase || "No CV uploaded."}
      Behavioral Observation: ${behavior.status}
      
      TASK:
      1. Rate the user's last answer (0-10).
      2. Ask the next question based on CV.
      
      Respond ONLY in JSON: {"score": <number>, "question": "<text>"}
    `;

    let geminiScore = 5;
    let aiReply = "Let's move forward.";
    try {
      const response = await gemini.models.generateContent({ model: CURRENT_MODEL, contents: prompt });
      const rawText = typeof response.text === 'function' ? response.text() : response.text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonResp = JSON.parse(jsonMatch[0]);
        aiReply = jsonResp.question || aiReply;
        geminiScore = jsonResp.score || geminiScore;
      }
    } catch (aiErr) { console.error("Gemini Chat Failed:", aiErr); }

    if (lastQId) await db.query('UPDATE questions SET score = ? WHERE id = ?', [geminiScore, lastQId]);
    await db.query('INSERT INTO questions (interview_id, question_text, difficulty) VALUES (?, ?, ?)', [interviewId, aiReply, interviewDifficulty]);

    const [scoredQs] = await db.query('SELECT score FROM questions WHERE interview_id = ? AND score > 0', [interviewId]);
    const avgContentScore = scoredQs.length ? (scoredQs.reduce((a, q) => a + q.score, 0) / scoredQs.length) : 0;

    let deepScore = { hireability_index: 0, candidate_level: "Analyzing..." };
    try {
      const pyRes = await axios.post('http://127.0.0.1:8000/analyze', {
        avg_content_score: avgContentScore,
        avg_eye_contact: behavior.eyeScore,
        avg_posture: behavior.postureScore,
        avg_emotion_score: behavior.score,
        userId: parseInt(userId)
      }, { timeout: 3000 });
      deepScore = pyRes.data;
      if (deepScore.recommended_difficulty) interviewDifficulty = deepScore.recommended_difficulty;
    } catch (pyErr) { console.warn("Python Brain Offline."); }

    res.json({ reply: aiReply, score: geminiScore, difficulty: interviewDifficulty, metrics: { eye: behavior.eyeScore, posture: behavior.postureScore }, deepScore });

  } catch (err) { res.status(500).json({ error: err.message }); }
});



app.post('/api/report', async (req, res) => {
  const { userId } = req.body;
  try {
    const interviewId = await getActiveInterviewId(userId);
    if (!interviewId) return res.status(404).json({ error: "No interview found" });

    const [metrics] = await db.query('SELECT * FROM behaviormetrics WHERE interview_id = ?', [interviewId]);
    let b = { eye: 0, posture: 0, emotion: 0 };
    if (metrics.length) {
      metrics.forEach(m => {
  const eye = (m.eye_contact || "").trim();
  const posture = (m.posture_alert || "").trim();
  const emotion = (m.emotion || "").trim().toLowerCase();

  b.eye += (eye === "Good") ? 10 : 5;
  b.posture += (posture === "Good Posture") ? 10 : 5;
  b.emotion += ["neutral", "happy", "surprised"].includes(emotion) ? 10 : 5;
});
      b.eye /= metrics.length; b.posture /= metrics.length; b.emotion /= metrics.length;
    }
    const avgBehaviorScore = (b.eye + b.posture + b.emotion) / 3;

    const [questions] = await db.query('SELECT score FROM questions WHERE interview_id = ? AND score > 0', [interviewId]);
    let avgContentScore = questions.length > 0 ? (questions.reduce((a, q) => a + q.score, 0) / questions.length) : 0;

    let deepScore = { hireability_index: 0, candidate_level: "Analyzing...", momentum: "Stable" };
    try {
        const pythonRes = await axios.post('http://127.0.0.1:8000/analyze', {
  avg_content_score: avgContentScore,
  avg_eye_contact: b.eye,
  avg_posture: b.posture,
  avg_emotion_score: b.emotion,  //  computed emotion avg
  userId: parseInt(userId)
}, { timeout: 3000 });

        deepScore = pythonRes.data;
    } catch (pyErr) { console.warn("Python Brain Offline."); }

    const finalOverallScore = (avgContentScore * 0.5) + (avgBehaviorScore * 0.5);

    const reportPrompt = `
      Role: ${jobDescription}. 
      Overall Score: ${finalOverallScore.toFixed(1)}/10. 
      Python Deep Analysis: Hireability ${deepScore.hireability_index}%, Level ${deepScore.candidate_level}.
      Transcript: ${chatHistory.join("\n")}
      Write a professional recruiter report with: Summary, Strengths, and specific areas to improve.
    `;

    let feedback = "Report generated.";
    try {
      const response = await gemini.models.generateContent({ model: CURRENT_MODEL, contents: reportPrompt });
      feedback = typeof response.text === 'function' ? response.text() : response.text;
    } catch { console.error("AI Report Failed"); }

    await db.query(
      `UPDATE interviews SET feedback_text = ?, score_overall = ?, emotional_score = ?, eye_contact_score = ?, posture_score = ?, end_time = NOW() WHERE id = ?`,
      [feedback, finalOverallScore, b.emotion, b.eye, b.posture, interviewId]
    );

    await db.query(
      `INSERT INTO interview_dataset (interview_id, user_id, job_description, start_time, end_time, score_overall, emotional_score, eye_contact_score, posture_score, feedback_text, created_at)
      SELECT id, user_id, job_description, start_time, NOW(), score_overall, emotional_score, eye_contact_score, posture_score, feedback_text, NOW()
      FROM interviews WHERE id = ?`, [interviewId]
    );

    try { await axios.post('http://127.0.0.1:8000/train'); } catch (trainErr) { }

    res.json({
      reply: feedback,
      deepScore: deepScore,
      scores: {
        overall: finalOverallScore,
        contentAvg: avgContentScore,
        behaviorAvg: avgBehaviorScore,
        details: { emotion: b.emotion, eyeContact: b.eye, posture: b.posture }
      },
      report: true
    });

  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [rows] = await db.query('SELECT * FROM interview_dataset WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    let improvement = 0;
    if (rows.length > 1) { improvement = rows[0].score_overall - rows[rows.length - 1].score_overall; }
    res.json({ history: rows, stats: { totalInterviews: rows.length, avgScore: rows.length ? (rows.reduce((a, b) => a + b.score_overall, 0) / rows.length).toFixed(1) : "0", improvement: improvement.toFixed(1) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));