import re

RULES = [
    (r"ModuleNotFoundError|No module named", "Missing Python dependency",
     "Python could not import a required package.",
     "Add the missing package to requirements.txt, then run pip install -r requirements.txt."),
    (r"SyntaxError|IndentationError", "Python syntax/indentation error",
     "Python could not parse a source file.",
     "Check the indicated line for missing brackets, colons, quotes, or incorrect indentation."),
    (r"AssertionError|FAILED.*test|pytest.*failed", "Automated test failed",
     "A test result did not match the expected result.",
     "Inspect the failed test, compare expected and actual values, and correct the code or test."),
    (r"failed to solve|docker.*(failed|error)|Dockerfile", "Docker build failure",
     "Docker could not complete an image build instruction.",
     "Check Dockerfile syntax, COPY paths, build context, and dependency installation."),
    (r"Permission denied|EACCES|access is denied", "Permission problem",
     "The workflow process cannot access a file or command.",
     "Check file permissions, working directory, and GitHub Actions token permissions."),
    (r"timed out|TimeoutError|ETIMEDOUT", "Operation timed out",
     "A command or network operation exceeded its time limit.",
     "Check service/network availability and use a suitable timeout."),
    (r"command not found|not recognized as an internal", "Command not found",
     "The runner cannot find the requested executable.",
     "Install the tool in the workflow or correct the command name."),
    (r"Could not resolve host|Name or service not known|ConnectionError", "Network failure",
     "The job could not connect to a remote service.",
     "Check the URL, DNS, network access, and remote service availability.")
]

def analyze_error(log_text):
    text = log_text[-50000:]
    matches = []
    for pattern, category, cause, solution in RULES:
        if re.search(pattern, text, re.IGNORECASE):
            matches.append({"category": category, "cause": cause,
                            "solution": solution})
    if not matches:
        matches.append({
            "category": "Unclassified pipeline failure",
            "cause": "The log did not match the built-in error patterns.",
            "solution": "Open the GitHub Actions log, find the first failed command, and inspect the lines immediately above the error."
        })
    return {"analysis": matches,
            "note": "Rule-based guidance: confirm the likely cause using the original workflow log."}
