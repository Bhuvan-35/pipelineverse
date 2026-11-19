
import re

RULES = [
    (
        r"Invalid requirement|Expected end or semicolon",
        "Invalid requirements.txt formatting",
        "Pip found an incorrectly formatted dependency in requirements.txt.",
        "Put each dependency on a separate line. Remove literal escape characters and verify the version specifiers."
    ),
    (
        r"No module named ['\"]analyzer['\"]",
        "Python project module import failure",
        "Python could not locate the local analyzer.py module.",
        "Check the repository structure, current working directory, and Python import path."
    ),
    (
        r"ModuleNotFoundError|No module named",
        "Missing Python dependency",
        "Python could not import a required package.",
        "Add the missing package to requirements.txt and install it."
    ),
    (
        r"SyntaxError|IndentationError",
        "Python syntax/indentation error",
        "Python could not parse a source file.",
        "Check the indicated line for missing brackets, colons, quotes, or incorrect indentation."
    ),
    (
        r"AssertionError|FAILED.*test|pytest.*failed",
        "Automated test failed",
        "A test result did not match the expected result.",
        "Inspect the failed test and compare expected and actual values."
    ),
    (
        r"failed to solve|docker.*(failed|error)|Dockerfile",
        "Docker build failure",
        "Docker could not complete an image build instruction.",
        "Check Dockerfile syntax, COPY paths, build context, and dependency installation."
    ),
    (
        r"Permission denied|EACCES|access is denied",
        "Permission problem",
        "The workflow process cannot access a file or command.",
        "Check file permissions and GitHub Actions token permissions."
    ),
    (
        r"timed out|TimeoutError|ETIMEDOUT",
        "Operation timed out",
        "A command or network operation exceeded its time limit.",
        "Check network availability and configure a suitable timeout."
    ),
    (
        r"command not found|not recognized as an internal",
        "Command not found",
        "The runner cannot find the requested executable.",
        "Install the required tool or correct the command name."
    ),
    (
        r"Could not resolve host|Name or service not known|ConnectionError",
        "Network failure",
        "The job could not connect to a remote service.",
        "Check the URL, DNS, network access, and remote service availability."
    )
]


def analyze_error(log_text):
    text = str(log_text)[-50000:]
    matches = []

    for pattern, category, cause, solution in RULES:
        if re.search(pattern, text, re.IGNORECASE):
            matches.append({
                "category": category,
                "cause": cause,
                "solution": solution
            })

    if not matches:
        matches.append({
            "category": "Unclassified pipeline failure",
            "cause": "The log did not match the built-in error patterns.",
            "solution": "Inspect the first failed command and the surrounding workflow log."
        })

    return {
        "analysis": matches,
        "note": "Rule-based guidance: confirm the likely cause using the original workflow log."
    }
