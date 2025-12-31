Need to install ngrok in the path of the project: 
npm install -g ngrok
(install globally for ease given my jr. development experience)

You need to authenticate ngrok first. Here's how:

  Step 1: Sign Up (if you haven't)

  Go to: https://dashboard.ngrok.com/signup

  Step 2: Get Your Authtoken

  Go to: https://dashboard.ngrok.com/get-started/your-authtoken

  Step 3: Add the Authtoken

  ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE

  Step 4: Run ngrok (port 3000, not 80)

  ngrok http --url=albertina-inspiratory-pausingly.ngrok-free.dev 3000

  Note: Use port 3000 since that's where the Ranger API runs, not 80.

  Quick Summary

  # 1. Add your token (one-time)
  ngrok config add-authtoken 37H6qfnvEKaGFR2LYCLGuN35dFB_3U2Ln7sZEQonr17Z6C1Rt

  # 2. Start the tunnel
  ngrok http --url=albertina-inspiratory-pausingly.ngrok-free.dev 3000

  # 3. In another terminal, run the API
  npm run api:dev