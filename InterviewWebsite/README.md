# InterviewWebsite

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
check README.txt for description and instructions 

Project oerview:
Elevated Mock Interview is an AI-powered web application designed to help fresh graduates and job seekers prepare for real-world job interviews through personalized, adaptive, and data-driven mock interview simulations.

The platform combines conversational AI, real-time behavioral analysis, and performance prediction to provide users with a realistic interview experience along with intelligent feedback and hiring probability estimation.

Unlike traditional mock interview tools, this system integrates:

🎯 CV-based question personalization

📹 Real-time non-verbal behavior analysis

🧠 Dynamic difficulty adjustment

📊 Hiring level prediction

📝 Detailed analytical performance reports

The goal is to bridge the gap between theoretical knowledge and practical interview performance while increasing confidence, readiness, and employability.

Key features:
1-Personalized AI Interviewer

Users upload their CV.

The system extracts relevant background information.

A customized AI chatbot generates interview questions tailored to:

The candidate’s skills

Experience level

Industry domain

Users can select:

Interview duration

Interviewer personality (formal, friendly, challenging)

This ensures each interview session feels realistic and context-aware.

2-Real-Time Behavioral Analysis (Webcam-Based)

During the interview, the system activates the user's webcam and analyzes:

👁 Eye Contact

🧍 Posture

😊 Emotional Expressions

Using a Python-based analytics engine powered by OpenCV, the platform continuously extracts behavioral metrics and synchronizes them with the interview session.

All behavioral data is processed and sent to the backend in real time.

3-Adaptive Difficulty Adjustment (Core Intelligence)

One of the platform’s most advanced features is its dynamic difficulty engine.

The system does not ask static questions.

Instead, it:

Evaluates verbal response quality

Monitors non-verbal behavioral metrics

Tracks confidence indicators

Measures consistency of performance

Based on these combined metrics:

If performance is strong → question difficulty increases.

If performance drops → difficulty adjusts accordingly.

If anxiety or weak eye contact is detected → the system may adapt tone or complexity.

This creates a truly adaptive interview environment that mimics real recruiter behavior.
4-Hiring Level Prediction & Employability Assessment

At the end of the interview, the system:

Aggregates verbal and non-verbal scores

Evaluates behavioral consistency

Analyzes response structure and clarity

Considers adaptive performance trends

Using predictive logic models, it estimates:

📈 Probability of being hired

🏆 Recommended hiring level (e.g., Junior / Mid-level readiness)

🎯 Overall performance classification

This provides users with a realistic indication of their employability level.

5-Automated Analytical Report

After each session, the system generates a comprehensive performance report that includes:

Overall interview score

Eye contact score

Posture evaluation

Emotional consistency analysis

Verbal response scoring

Identified strengths

Areas requiring improvement

Personalized recommendations

The report transforms raw AI metrics into meaningful and actionable feedback.

This allows candidates to:

Understand their weaknesses

Track progress over time

Improve both soft and technical skills

System Architecture

The platform follows a client-server architecture:

🖥 Frontend

Built using Vue.js

Handles user interaction

Streams video data

Displays interview questions and reports

⚙ Backend

Powered by Node.js

Manages authentication

Handles REST API requests

Communicates with the database

Coordinates AI modules

🧠 AI & Analytics Engine

Python-based analysis module

Uses OpenCV for:

Emotion detection

Posture analysis

Eye contact tracking

Chatbot engine generates contextual questions

Difficulty predictor adjusts interview complexity dynamically

🗄 Database

MySQL relational database

Stores:

User data

CV information

Interview sessions

Responses

Behavioral metrics

Generated reports

Expected Impact

Elevated Mock Interview aims to:

Reduce interview anxiety

Improve non-verbal communication awareness

Provide affordable and accessible preparation tools

Increase confidence and employment readiness

Bridge the gap between academic knowledge and industry expectations

By combining behavioral science with artificial intelligence, the platform creates a scalable, intelligent, and personalized interview preparation experience.

Why This Project Matters

Research shows that non-verbal cues such as eye contact, posture, and emotional control significantly influence interview outcomes.

However, existing platforms:

Do not combine real-time behavioral analytics

Do not dynamically adjust difficulty

Do not provide predictive hiring insights

This project fills that gap by integrating multimodal analysis into a unified, adaptive, and intelligent system.
-----------------------------------------------------------------
First you have to install node.js from the website
https://nodejs.org/en/download
Second, go to vs code and navigate the project folder from its corresponding location
write the commands
cd capstone project
cd interviewWebsite
run the command "npm install"
npm run dev (for overall website)
then in another terminal(for database) 
Just before make sure you download xampp and open the db interview-trainer
cd interview-api
node app.js
Keep cd capstone project
then in another terminal(for emotion metric)
cd Emotion-recognition
(you have to have python + install uvicorn: pip install fastapi uvicorn)
uvicorn emotion_api:app --reload --port 8001
then in another terminal(for posture metric)
cd posture-watcher
uvicorn posture_api:app --reload --port 8002 
then in another terminal(eye-contact metric)
cd Eye-Contact-RealTime-Detection
uvicorn eye_api:app --reload --port 8003  
then in another terminal(for chatbot) 
cd ai-avatar
cd ai-avatar-bot
node server.js
then in another terminal(for brain and learning)
cd python_brain
python brain.py
last step is changing the api key to yours in ai-avatar-bot .env file
then you enter the url of the overall website
© 2026 Ghina Rashwani. All rights reserved.

 

 


