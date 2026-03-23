# CyberRange Lite: Literature Review

## 1. Need for Practical Cybersecurity Training

Several curriculum studies and industry reports indicate that students entering cybersecurity roles are often underprepared for practical testing tasks, especially in web application security and secure development practices. Traditional learning models rely on lectures, static case studies, and textbook examples, which are important but insufficient for skill transfer. Practical simulation environments improve retention because students repeatedly test hypotheses, observe outcomes, and learn from immediate feedback.

In the context of Indian undergraduate programs, this issue is more visible in institutions where lab infrastructure is limited and advanced commercial platforms are not always affordable. A lightweight cyber range, therefore, must be technically meaningful but easy to run on standard lab machines. This constraint strongly motivates the architecture choices in CyberRange Lite.

## 2. Existing Platforms and Learning Approaches

Existing platforms can broadly be grouped into:

1. Deliberately vulnerable applications (e.g., DVWA, OWASP Juice Shop)
2. Capture-the-Flag (CTF) ecosystems (e.g., picoCTF, Hack The Box style challenges)
3. Enterprise-grade cyber ranges for red-team/blue-team simulation

DVWA (Damn Vulnerable Web Application) and OWASP Juice Shop are widely used for introducing web vulnerabilities. They are effective for demonstration and guided labs, but they are not always structured around assessment analytics out of the box. In many teaching settings, evaluation still depends on manual checking by instructors.

CTF platforms improve engagement through gamification and progressive challenge design. They are highly motivating and useful for competitive training. However, many CTF systems emphasize final flag retrieval over process evidence, which may not align with academic assessment rubrics that require partial grading, written explanation, and repeatable scoring.

Enterprise cyber ranges provide realistic environments and advanced simulation capabilities, but these solutions can be expensive, infrastructure-heavy, or operationally complex for regular college use.

The literature and ecosystem survey suggest a practical gap: a system that combines educational vulnerability scenarios with transparent, rubric-friendly scoring and low-overhead deployment.

## 3. Standards and Frameworks Used in Scenario Design

The scenario selection in this project is informed by established security references:

- OWASP Top 10 (2021), which highlights major web application risks including injection and broken access control patterns.
- NIST SP 800-115, which outlines methods for technical security testing and emphasizes controlled, authorized assessment practices.
- MITRE ATT&CK, which provides a structured view of adversarial behavior and is helpful for mapping practical exercises to real-world tactics.

By grounding scenario content in these references, CyberRange Lite avoids arbitrary challenge creation and aligns with industry-recognized threat categories. This is useful in academic evaluation because the chosen exercises can be justified using accepted standards rather than informal examples.

## 4. Role of Feedback and Gamification in Learning

Educational research on applied computing consistently reports that immediate feedback improves learning outcomes in skill-based domains. In cybersecurity labs, delayed or binary grading can reduce student engagement because learners do not understand where their approach failed. Platforms that provide incremental scoring, hints, and explanatory feedback help students iterate more effectively.

Gamification elements such as scoreboards, progression levels, and challenge tiers also increase participation. That said, pure competition may disadvantage beginners if not balanced with guidance. CyberRange Lite adopts a hybrid approach: it keeps a leaderboard for motivation but also provides per-attempt feedback intended for formative learning.

## 5. Gaps Identified from Prior Work

From the review of existing tools and teaching practices, the following gaps are clear:

1. Assessment gap: Many learning platforms do not provide transparent, rubric-style automated scoring suitable for college grading.
2. Deployment gap: Full-scale cyber ranges can be difficult to deploy in standard campus lab environments.
3. Feedback gap: Some challenge systems focus on correct/incorrect outcomes without giving actionable improvement hints.
4. Tracking gap: Instructors need simple progress signals (attempt count, successful attempts, total score) without complex analytics infrastructure.

CyberRange Lite is positioned as a response to these gaps: it is intentionally lightweight, easy to deploy, and designed around measurable student progression.

## 6. How CyberRange Lite Extends Existing Approaches

Compared with common vulnerable-app practice setups, this project contributes:

- Structured attempt model: payload + evidence + timestamp
- Rule-based scoring engine: supports partial credit and repeatable grading logic
- Feedback-first workflow: helps students refine approaches instead of guessing blindly
- Persistent leaderboard analytics: summarizes performance across attempts
- Modular architecture: supports future migration to container-based vulnerable labs and role-based evaluation

This balance makes the system suitable for semester projects and departmental lab demonstrations where both technical depth and assessment clarity are required.

## 7. Summary of Literature Insights

The literature indicates that hands-on security education is most effective when practice is:

- aligned with real vulnerability categories,
- delivered in controlled and ethical environments,
- supported by immediate, explanatory feedback, and
- measurable through transparent scoring.

CyberRange Lite is built directly around these principles. It does not attempt to replace large professional cyber ranges; instead, it fills the gap between theoretical classroom teaching and heavy enterprise simulation systems by offering a practical, academic-friendly middle layer.

## References

1. OWASP Foundation, OWASP Top 10: The Ten Most Critical Web Application Security Risks, 2021.
2. K. Scarfone, M. Souppaya, A. Cody, and A. Orebaugh, NIST SP 800-115: Technical Guide to Information Security Testing and Assessment, National Institute of Standards and Technology, 2008.
3. MITRE Corporation, MITRE ATT&CK Framework, 2013-present.
4. OWASP Foundation, OWASP Juice Shop Documentation, latest edition.
5. DVWA Project, Damn Vulnerable Web Application (DVWA) Documentation, latest edition.
6. picoCTF Team, picoCTF Platform and Educational Resources, Carnegie Mellon University, various releases.
