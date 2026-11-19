# PipelineVerse

An interactive 3D CI/CD dashboard for GitHub Actions with rule-based failure explanations. The included workflow tests the app, builds a Docker image, and publishes the image to GitHub Container Registry (GHCR) on pushes to main.

## Requirements
- Python 3.10 or newer
- Docker Desktop with Docker Compose
- A GitHub repository with Actions enabled
- GitHub fine-grained PAT with repository access and Actions: Read permission (and Metadata: Read)

## Configure
1. Copy `.env.example` to `.env`.
2. Set `GITHUB_REPO=owner/repository`.
3. Set `GITHUB_TOKEN` to your token.
4. Never commit `.env` or expose your token.

## Run with Docker
```bash
docker compose up --build
```
Open http://localhost:5000

## Run locally
```bash
python -m venv .venv
# Windows CMD:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Test
```bash
pip install pytest
pytest -q
```

## Demo
Push a commit to trigger `.github/workflows/ci.yml`. The test-and-build job runs tests and builds the image. On pushes to main, the deploy-image job publishes `ghcr.io/OWNER/REPOSITORY:latest`. Open the dashboard, refresh, select a workflow run and a job. For a failed job, choose Analyze selected job logs.

## API endpoints
- GET `/api/health`
- GET `/api/workflows`
- GET `/api/jobs?run_id=WORKFLOW_RUN_ID`
- POST `/api/analyze` with `{"job_id":"JOB_ID"}` or `{"log":"error log text"}`

## Important limitations
- Dashboard refreshes by polling GitHub every 30 seconds; it is not a websocket stream.
- Failure analysis is a transparent rule-based prototype, not a trained ML model and not a guaranteed diagnosis.
- Three.js and Google Fonts use public CDNs, so the dashboard needs internet access to load those assets.
- The GitHub token stays on the Flask server; do not put it in browser JavaScript.

## Deployment image
The GitHub Actions workflow publishes the container image to GHCR on pushes to `main`. In the repository's Settings → Actions → General, allow the workflow to create and write packages if your organization/repository policy requires it. The published image is a deployable container artifact; running it on a separate cloud VM or hosting platform requires that platform's credentials and is not configured by default.
