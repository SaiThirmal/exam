from typing import List, Tuple


def _normalize(text: str) -> str:
    return text.strip().lower()


def evaluate_attempt(scenario_id: str, payload: str, evidence: str) -> Tuple[int, bool, List[str]]:
    normalized_payload = _normalize(payload)
    normalized_evidence = _normalize(evidence)
    score = 0
    feedback: List[str] = []

    if scenario_id == "sqli-login-bypass":
        score += _score_sqli(normalized_payload, normalized_evidence, feedback)
    elif scenario_id == "xss-reflected-search":
        score += _score_xss(normalized_payload, normalized_evidence, feedback)
    elif scenario_id == "jwt-none-alg":
        score += _score_jwt(normalized_payload, normalized_evidence, feedback)
    else:
        feedback.append("Unknown scenario.")
        return 0, False, feedback

    passed = score >= 60
    if passed:
        feedback.append("Pass threshold met. Great work.")
    else:
        feedback.append("Pass threshold not met. Refine payload and evidence.")
    return min(score, 100), passed, feedback


def _score_sqli(payload: str, evidence: str, feedback: List[str]) -> int:
    score = 10
    if " or " in payload and ("1=1" in payload or "'1'='1" in payload):
        score += 45
        feedback.append("Detected classic boolean bypass SQLi pattern.")
    elif "admin' --" in payload or "admin' #" in payload:
        score += 40
        feedback.append("Detected comment-based SQLi bypass payload.")
    else:
        feedback.append("Payload does not yet show a strong SQLi bypass.")

    if "--" in payload or "#" in payload:
        score += 10
        feedback.append("Comment truncation marker detected.")

    if len(evidence) >= 20:
        score += 20
        feedback.append("Evidence length is strong enough for audit review.")
    else:
        feedback.append("Add stronger evidence (response snippet, observed behavior).")

    if "welcome admin" in evidence or "login bypassed" in evidence:
        score += 20
        feedback.append("Evidence suggests successful auth bypass.")
    return score


def _score_xss(payload: str, evidence: str, feedback: List[str]) -> int:
    score = 10
    if "<script" in payload and "alert" in payload:
        score += 45
        feedback.append("Detected direct script execution payload.")
    elif "onerror=" in payload or "onload=" in payload:
        score += 40
        feedback.append("Detected event handler based XSS payload.")
    else:
        feedback.append("Payload does not yet indicate executable script context.")

    if "<" in payload and ">" in payload:
        score += 10
        feedback.append("HTML tag injection structure detected.")

    if "popup" in evidence or "alert" in evidence or "script executed" in evidence:
        score += 25
        feedback.append("Evidence suggests script execution in browser.")
    elif len(evidence) >= 20:
        score += 15
        feedback.append("Evidence details recorded for validation.")
    else:
        feedback.append("Add browser evidence (alert, console output, screenshot note).")
    return score


def _score_jwt(payload: str, evidence: str, feedback: List[str]) -> int:
    score = 10
    if '"alg":"none"' in payload or "'alg':'none'" in payload or "alg:none" in payload:
        score += 35
        feedback.append("Detected alg:none JWT header abuse.")
    else:
        feedback.append("Payload does not mention none algorithm exploitation.")

    if "role" in payload and "admin" in payload:
        score += 25
        feedback.append("Role escalation intent detected.")
    elif "admin=true" in payload:
        score += 20
        feedback.append("Admin-claim modification detected.")

    if "signature skipped" in evidence or "accepted token" in evidence:
        score += 20
        feedback.append("Evidence indicates token accepted without signature checks.")
    elif len(evidence) >= 20:
        score += 15
        feedback.append("Evidence details captured.")
    else:
        feedback.append("Add stronger evidence about authorization result.")

    if "dashboard admin" in evidence or "privilege escalated" in evidence:
        score += 15
        feedback.append("Evidence suggests successful privilege escalation.")
    return score
