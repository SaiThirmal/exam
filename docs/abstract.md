# CyberRange Lite: Abstract

Cybersecurity education in undergraduate programs often focuses heavily on theory, while hands-on security testing is either limited or delayed until internships or specialized training. This creates a gap between what students learn in classrooms and what is expected in practical security roles. The project CyberRange Lite addresses this gap by providing a compact, classroom-friendly cybersecurity simulator where students can practice controlled attack-defense scenarios and receive structured feedback.

CyberRange Lite is designed as an educational web platform with three core modules: scenario management, attempt evaluation, and leaderboard-based performance tracking. The platform currently includes beginner-to-intermediate scenarios mapped to common vulnerability categories such as SQL Injection, Cross-Site Scripting (XSS), and JWT misconfiguration. Learners submit payloads and evidence, after which the system evaluates their attempts using rule-driven scoring logic. Instead of only giving pass/fail output, the platform returns targeted feedback so that students understand why an attempt was accepted, partially accepted, or rejected.

From a technical point of view, the project is implemented using FastAPI for backend services, SQLite for persistent storage, and a lightweight browser-based user interface for ease of deployment in regular college lab systems. The architecture keeps setup simple while still supporting modular extension into advanced features such as role-based access, team competitions, and containerized vulnerable labs.

The key contribution of this project is not only scenario simulation, but also measurable learning progression through scoring, evidence capture, and leaderboard analytics. This makes CyberRange Lite suitable for academic demonstrations, lab assignments, and mini-CTF style practice sessions in a controlled environment. Overall, the system aims to make cybersecurity practice accessible, trackable, and pedagogically useful for undergraduate students.

Keywords: cybersecurity education, cyber range, secure coding, OWASP, attack simulation, scoring engine, CTF-inspired learning
