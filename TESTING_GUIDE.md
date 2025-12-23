# ScriptishRx Testing Guide

Since your application uses **Twilio (Voice)** and **OpenAI (Chat)**, testing involves a mix of local verification and "real world" connectivity.

## 1. Automated System Check (Fastest)
We have a built-in script that simulates a full interaction flow (creating a tenant, sending a chat message, checking voice logic).

**Run this command in your terminal:**
```bash
node backend/verify_full_flow.js
```
*   **What it does:** Checks database connection, OpenAI API key validity, and Twilio configuration.
*   **Expected Output:** You should see `✅ Tenant Created`, `✅ Chat Service returned response`, and `✅ TwiML contains custom welcome message`.

---

## 2. Testing AI Chat (Manual)
You can test the AI Chat API directly without a frontend using `curl`.

**1. Start the server:**
```bash
npm run dev
```

**2. In a new terminal window, run:**
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{"message": "Hello, who are you?", "tenantId": "<YOUR_TENANT_ID>"}'
```
*(Note: You'll need a valid JWT Token and Tenant ID from your database to do this manually. The `verify_full_flow.js` script handles this for you automatically.)*

---

## 3. Testing Voice Calls (Requires Public URL)
**Crucial:** Twilio needs to reach your local computer to fetch the "Script" for the call (TwiML). Since `localhost` is private, you need a tunnel.

### Step A: Install & Run ngrok
1.  Download [ngrok](https://ngrok.com/download).
2.  Run it to expose your backend port (5000):
    ```bash
    ngrok http 5000
    ```
3.  Copy the `https://....ngrok-free.app` URL it generates.

### Step B: Update .env
Update your `.env` file so the app knows its public URL:
```env
APP_URL=https://your-ngrok-url.ngrok-free.app
```

### Step C: Configure Twilio
1.  Go to the [Twilio Console > Phone Numbers](https://console.twilio.com/).
2.  Select your number (`+18667243198`).
3.  Under **Voice & Fax**, set "A CALL COMES IN" to:
    *   **Webhook**: `https://your-ngrok-url.ngrok-free.app/api/twilio/webhook/voice`
    *   **Method**: `POST`
4.  Save.

### Step D: Call your Number!
1.  Call **+1 (866) 724-3198** from your cell phone.
2.  You should hear the AI welcome message defined in your database (or the default one).
3.  Check your terminal running the server—you should see logs like `[Twilio] Inbound call from...`.

---

## 4. Testing Outbound Calls
You can trigger an outbound call via the API.

**Check the `test_call.js` script included in the backend:**
```bash
# Edit the script to put YOUR cell phone number
node backend/test_call.js
```
*This will trigger the system to call YOU.*
