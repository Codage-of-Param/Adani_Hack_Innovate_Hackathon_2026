# Free Tier Deployment Guide (Step-by-Step)

This guide uses **Vercel** and **Render**, which are the best **free** tools for deploying this type of application (React Frontend + Python Backend).

> [!NOTE]
> **Why these tools?**
> *   **Vercel**: Best for React apps. Free "Hobby" plan is generous and permanent for personal projects.
> *   **Render**: Best for Python/FastAPI. Offers a completely free "Web Service" tier (note: it may sleep after inactivity, taking 30s to wake up).
> *   **No Database Cost**: Since your app uses Excel files, you don't need a paid database!

## Prerequisites
1.  **GitHub Account**: You must have your code pushed to a GitHub repository.

## Phase 1: Deploy Backend (Render) - 5 Mins

We deploy the backend first to get the API URL.

1.  **Go to [dashboard.render.com](https://dashboard.render.com/)** and sign up/login (use GitHub).
2.  Click **New +** and select **Web Service**.
3.  Connect your `Adani_hackathon` repository.
4.  **Configure the Service** (Scroll down to fill these):
    *   **Name**: `clinker-backend`
    *   **Region**: Singapore (or closest to you)
    *   **Root Directory**: `Clinker/Clinker_backend`
    *   **Runtime**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
    *   **Instance Type**: Select **Free** (Latest).
5.  Click **Create Web Service**.
6.  **Wait**: You will see logs. Wait until you see "Application startup complete".
7.  **Copy URL**: Top left, looks like `https://clinker-backend.onrender.com`. **Save this.**

## Phase 2: Connect Frontend to Backend

1.  Open your local file: `Clinker/Clinker_frontend/src/App.tsx`.
2.  Search for `http://localhost:8000`.
3.  **Replace ALL** instances of `http://localhost:8000` with your new Render URL (e.g., `https://clinker-backend.onrender.com`).
    *   *Note: Do not add a trailing slash `/` unless the code needs it.*
4.  **Commit and Push** these changes to GitHub.

## Phase 3: Deploy Frontend (Vercel) - 3 Mins

1.  **Go to [vercel.com](https://vercel.com/)** and sign up/login (use GitHub).
2.  Click **Add New...** -> **Project**.
3.  Import the same `Adani_hackathon` repository.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Root Directory**: Click "Edit" and select `Clinker/Clinker_frontend`.
5.  Click **Deploy**.
6.  Wait ~1 minute. You will see fireworks when done!
7.  **Click the huge Screenshot** to visit your live site.

## Phase 4: Verify

1.  Open your Vercel URL.
2.  Check the Dashboard. It might take 30-60 seconds to load data initially because the free Render backend needs to "wake up".
3.  If data loads, you are done!

> [!IMPORTANT]
> **Files on Free Tier**: On Render's free tier, the Excel files you save (via the Save Allocation button) might reset if the server restarts. For a hackathon demo, this is fine. For production, you would need a database (like PostgreSQL) or cloud storage (like AWS S3).
