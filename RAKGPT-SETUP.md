# RAKGPT setup (GitHub Pages + Cloudflare Worker + Gemini API)

The RAKGPT chat interface is in `index.html`. A static GitHub Pages site cannot safely keep an AI API key secret, so the AI calls must go through a backend.

## 1. Create the AI key safely
- Use a Google account that is permitted to use the Gemini API. If you are under 18, ask a parent/guardian to help with account, billing, and service terms.
- Create a Gemini API key in Google AI Studio.
- Never paste the key into `index.html`, public GitHub files, chats, or screenshots.

## 2. Deploy the backend
- Sign in to Cloudflare and open Workers & Pages.
- Create a Worker named something like `rakgpt-api`.
- Replace the starter Worker code with the contents of `worker.js` from this repository and deploy it.
- In the Worker settings, add a secret named `GEMINI_API_KEY` and paste the API key there. Do not add it as a public variable.
- Check Cloudflare/Gemini current usage limits and pricing before enabling it for visitors. Add rate limiting/usage controls to avoid unexpected use.

## 3. Connect the website
- Copy the deployed Worker URL, for example `https://rakgpt-api.<your-subdomain>.workers.dev`.
- In `index.html`, find `const RAKGPT_API_URL='https://YOUR-CLOUDFLARE-WORKER.workers.dev/api/chat';`
- Replace the placeholder with your real Worker URL plus `/api/chat`, then commit the change.
- Wait for GitHub Pages to deploy, open the site, and test a short question.

## Notes
- Until the Worker is deployed and the URL is configured, RAKGPT shows a setup message rather than pretending to provide live AI answers.
- This is a starter implementation. Before broad public use, add abuse protection/rate limits and monitor usage.
