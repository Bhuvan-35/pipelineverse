from analyzer import analyze_error

def test_missing_module():
    result = analyze_error("ModuleNotFoundError: No module named flask")
    assert result["analysis"][0]["category"] == "Missing Python dependency"

def test_syntax_error():
    result = analyze_error("SyntaxError: invalid syntax")
    assert "syntax" in result["analysis"][0]["category"].lower()

def test_unknown_error_fallback():
    result = analyze_error("unexpected runner output")
    assert result["analysis"][0]["category"] == "Unclassified pipeline failure"
