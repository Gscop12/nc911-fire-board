# Newton County Fire v012

**Important:** Netlify manual drag-and-drop deploys static files only. It will NOT deploy the compton-raws serverless function.

To deploy the RAWS integration, put the contents of this ZIP at the root of a GitHub repository, then in Netlify use **Add new project > Import an existing project** and connect the repository. Netlify reads netlify.toml and builds the `public/` folder and `netlify/functions/` function. On subsequent updates, commit the new build files to the repository.

Test: `https://YOUR-SITE.netlify.app/.netlify/functions/compton-raws` should respond with JSON (or a 503 JSON error when NIFC is unavailable), not a 404.

Leaflet CSS integrity hash fixed; JavaScript remains unchanged.
