# 🎙️ Studeo

**The AI Oral Exam Proctor.**
*Transforming passive studying into active mastery through real-time interviews.*

![Project Status](https://img.shields.io/badge/Status-Beta-blue)
![Event](https://img.shields.io/badge/Built%20At-NexHacks%202026-indigo)
![Stack](https://img.shields.io/badge/Powered%20By-Gemini%20%7C%20LiveKit%20%7C%20Next.js-000000)

---

## 🧐 The Problem: The "Feedback Gap"
The most effective way to learn is by explaining concepts out loud (The Feynman Technique). However, most students study passively because explaining to an empty room provides zero feedback. 

Also, universities cannot scale oral exams—most times, a 1:500 professor-to-student ratio makes it impossible. **Studeo bridges this gap.**

## 💡 The Solution
Studeo is an **infinite-context, voice-first AI agent** that acts as a strict but fair oral examiner. It ingests your specific course materials (PDFs) and quizzes you in real-time, giving feedback on your verbal explanations with sub-second latency.

> **Current Status:** Studeo currently features **Proctor Mode**—an objective, rigorous testing environment. (Tutor Mode coming soon).

---

## 📸 Demo
Click the image below to watch the demo video!

<div style="text-align: center;">

[![Video Thumbnail](https://img.youtube.com/vi/imLQvjO64hk/0.jpg)](https://youtu.be/imLQvjO64hk)

</div>

---

## ⚡ Key Features

* **📚 Infinite Context:** Upload raw PDFs, textbooks, or assignments. Studeo ingests and "reads" the material instantly without forgetting any detail, given the more than 1 million tokens from Google Gemini Flash.
* **🗣️ Real-Time Voice:** Powered by LiveKit WebRTC, you can speak naturally. No "push-to-talk"—just a fluid conversation.
* **👨‍🏫 Proctor Mode:** The agent acts as an examiner, asking specific questions based *strictly* on your uploaded content and giving feedback on your accuracy.
* **⚡ Sub-Second Latency:** Optimized pipeline using Google Gemini Flash and LiveKit data channels for instant turn-taking.

---

## 🛠️ Tech Stack

Studeo utilizes a cutting-edge multimodal pipeline to ensure low latency and high accuracy.

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (App Router)** | Styled with Tailwind CSS |
| **Real-Time Comms** | **LiveKit** | Handles WebRTC audio streaming and state synchronization. |
| **Reasoning Engine** | **Google Gemini Flash** | Provides the logic for analyzing answers and question generation. |
| **Memory/Context** | **The Token Company (bear-1)** | Handles context compression and retrieval. |

---

## 🚀 Getting Started

### Prerequisites
* Node.js & npm
* Python 3.9+
* API Keys for: LiveKit, Google Gemini, and The Token Company.

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/PietroCoppola/tutor-agent.git](https://github.com/PietroCoppola/tutor-agent.git)
    cd tutor-agent
    ```

2.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Backend Agent Setup**
    ```bash
    cd agent
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python main.py dev
    ```

---

## 🚧 Roadmap

* [x] **Proctor Mode:** Strict oral exam functionality.
* [ ] **Tutor Mode:** A Socratic guide that helps you learn before you test.
* [ ] **Multimodal Input:** Support for lecture slides and video URLs.
* [ ] **Group Study:** Multi-user sessions with Speaker Diarization.

---

## 🏆 Context
Studeo was built for the inaugural edition of **NexHacks 2026** at Carnegie Mellon University (CMU).

**Wins:**
* Achieved near-instant conversational turn-taking.
* Solved complex state synchronization between audio streams and UI visualizers.
* Designed a dynamic agent system that can adapt to different exam scenarios and subjects separately.