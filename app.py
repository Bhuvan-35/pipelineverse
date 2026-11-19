import os
import io
import zipfile
import requests
from flask import Flask, jsonify, render_template, request
from analyzer import analyze_error

app = Flask(__name__)
REPO = os.getenv("GITHUB_REPO", "")  # owner/repository
TOKEN = os.getenv("GITHUB_TOKEN", "")
HEADERS = {"Accept": "application/vnd.github+json",
           "X-GitHub-Api-Version": "2022-11-28"}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

def github_get(path):
    if not REPO or "/" not in REPO:
        raise ValueError("Set GITHUB_REPO in .env as owner/repository.")
    r = requests.get(f"https://api.github.com/repos/{REPO}/{path}",
                     headers=HEADERS, timeout=25)
    if r.status_code == 401:
        raise RuntimeError("GitHub rejected the token. Check GITHUB_TOKEN.")
    if r.status_code == 403:
        raise RuntimeError("GitHub denied access or the API rate limit was reached. Check token permissions.")
    if r.status_code == 404:
        raise RuntimeError("Repository/resource not found. Check GITHUB_REPO and token access.")
    r.raise_for_status()
    return r.json()

@app.get("/")
def home():
    return render_template("index.html", repo=REPO or "Not configured")

@app.get("/api/health")
def health():
    return jsonify(status="ok", repository=REPO or None)

@app.get("/api/workflows")
def workflows():
    try:
        data = github_get("actions/runs?per_page=10")
        runs = []
        for x in data.get("workflow_runs", []):
            runs.append({
                "id": x["id"], "name": x.get("name") or x.get("display_title") or "Workflow",
                "branch": x.get("head_branch"), "status": x.get("status"),
                "conclusion": x.get("conclusion"), "html_url": x.get("html_url"),
                "created_at": x.get("created_at"), "run_number": x.get("run_number")
            })
        return jsonify(repository=REPO, total_count=data.get("total_count", 0), runs=runs)
    except Exception as e:
        return jsonify(error=str(e), runs=[]), 400

@app.get("/api/jobs")
def jobs():
    run_id = request.args.get("run_id", "")
    if not run_id.isdigit():
        return jsonify(error="Provide a numeric run_id from /api/workflows."), 400
    try:
        data = github_get(f"actions/runs/{run_id}/jobs?per_page=100")
        jobs = []
        for x in data.get("jobs", []):
            jobs.append({
                "id": x["id"], "name": x["name"], "status": x.get("status"),
                "conclusion": x.get("conclusion"), "html_url": x.get("html_url"),
                "started_at": x.get("started_at"), "completed_at": x.get("completed_at"),
                "steps": [{"name": s["name"], "status": s.get("status"),
                           "conclusion": s.get("conclusion")} for s in x.get("steps", [])]
            })
        return jsonify(run_id=run_id, jobs=jobs)
    except Exception as e:
        return jsonify(error=str(e), jobs=[]), 400

@app.post("/api/analyze")
def analyze():
    body = request.get_json(silent=True) or {}
    log_text = body.get("log", "")
    job_id = str(body.get("job_id", "")).strip()
    if job_id:
        if not job_id.isdigit():
            return jsonify(error="job_id must be numeric."), 400
        try:
            r = requests.get(
                f"https://api.github.com/repos/{REPO}/actions/jobs/{job_id}/logs",
                headers=HEADERS, timeout=30, allow_redirects=True)
            if r.status_code == 404:
                raise RuntimeError("Job logs unavailable. The job may still be running or logs may have expired.")
            r.raise_for_status()
            # GitHub's job-log endpoint normally redirects to a ZIP archive.
            content_type = r.headers.get("Content-Type", "").lower()
            if "zip" in content_type or r.content[:2] == b"PK":
                with zipfile.ZipFile(io.BytesIO(r.content)) as archive:
                    log_parts = []
                    for name in archive.namelist():
                        if not name.endswith("/"):
                            try:
                                log_parts.append(archive.read(name).decode("utf-8", errors="replace"))
                            except Exception:
                                pass
                    log_text = "\\n".join(log_parts)
            else:
                log_text = r.text
        except Exception as e:
            return jsonify(error=str(e)), 400
    if not isinstance(log_text, str) or not log_text.strip():
        return jsonify(error="Send log text or a completed failed job_id."), 400
    return jsonify(analyze_error(log_text))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
