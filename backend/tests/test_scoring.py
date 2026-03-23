from backend.app.services.scoring import evaluate_attempt


def test_sqli_high_score_payload():
    score, passed, feedback = evaluate_attempt(
        scenario_id="sqli-login-bypass",
        payload="' OR '1'='1' --",
        evidence="Login bypassed and welcome admin message displayed.",
    )
    assert score >= 60
    assert passed
    assert any("SQLi" in item or "bypass" in item for item in feedback)


def test_xss_low_score_without_executable_payload():
    score, passed, feedback = evaluate_attempt(
        scenario_id="xss-reflected-search",
        payload="normal search text",
        evidence="No popup occurred.",
    )
    assert score < 60
    assert not passed
    assert any("not yet" in item.lower() for item in feedback)


def test_jwt_pass_with_none_alg_and_evidence():
    score, passed, _ = evaluate_attempt(
        scenario_id="jwt-none-alg",
        payload='{"header":{"alg":"none"},"payload":{"role":"admin"}}',
        evidence="Accepted token, privilege escalated to dashboard admin.",
    )
    assert score >= 60
    assert passed
