from typing import Dict, List

from .models import ScenarioDetail, ScenarioSummary


_SCENARIOS: Dict[str, ScenarioDetail] = {
    "sqli-login-bypass": ScenarioDetail(
        id="sqli-login-bypass",
        title="SQL Injection Login Bypass",
        difficulty="Easy",
        tags=["owasp-a03", "sqli", "authentication"],
        description=(
            "A vulnerable login form concatenates raw input into a SQL query. "
            "Demonstrate how insecure string building can bypass authentication."
        ),
        objective="Craft an input that bypasses username/password validation.",
        hints=[
            "Think about boolean logic inside SQL WHERE clauses.",
            "Comment symbols can ignore trailing query text.",
        ],
        safe_payload_examples=["' OR '1'='1' --", "admin' --"],
    ),
    "xss-reflected-search": ScenarioDetail(
        id="xss-reflected-search",
        title="Reflected XSS in Search",
        difficulty="Medium",
        tags=["owasp-a03", "xss", "input-validation"],
        description=(
            "A search page reflects user input directly into HTML. "
            "Demonstrate payloads that can execute browser-side script."
        ),
        objective="Submit input that executes JavaScript in the rendered page.",
        hints=[
            "Try injecting script-capable HTML tags.",
            "Event handlers can execute JavaScript without <script> tags.",
        ],
        safe_payload_examples=["<script>alert('xss')</script>", "<img src=x onerror=alert(1)>"],
    ),
    "jwt-none-alg": ScenarioDetail(
        id="jwt-none-alg",
        title="JWT Misconfiguration (alg:none)",
        difficulty="Hard",
        tags=["owasp-a07", "jwt", "authz"],
        description=(
            "A backend accepts JWTs without enforcing a signature algorithm. "
            "Show how a forged token with alg:none can escalate privileges."
        ),
        objective="Produce forged token logic that changes role/claims.",
        hints=[
            "Inspect JWT header and algorithm validation.",
            "Role escalation often targets claims such as admin=true or role=admin.",
        ],
        safe_payload_examples=[
            '{"header":{"alg":"none","typ":"JWT"},"payload":{"role":"admin"}}',
            "Forged JWT with none algorithm and modified role claim",
        ],
    ),
}


def list_scenarios() -> List[ScenarioSummary]:
    return [
        ScenarioSummary(
            id=item.id,
            title=item.title,
            difficulty=item.difficulty,
            tags=item.tags,
        )
        for item in _SCENARIOS.values()
    ]


def get_scenario(scenario_id: str) -> ScenarioDetail | None:
    return _SCENARIOS.get(scenario_id)
