STEVEN, WHERE ARE YOU? — VERSION 4.0

WHAT IS FIXED
- Complete Netlify Functions backend is included.
- Admin updates save and appear on the public page.
- Weather votes, reactions, comments, and ride requests save in Netlify Blobs.
- Ride requests include the rider's telephone number and notes.
- Recent ride requests load in Steven's admin dashboard.
- Optional Twilio text-message alert when a new ride request arrives.
- Corrected and validated netlify.toml file.

FILES TO UPLOAD
Upload the COMPLETE contents of this folder to the same repository connected to Netlify.
Keep the netlify/functions folder and every file inside it exactly where they are.
Do not rename index.html, admin.html, package.json, or netlify.toml.

REQUIRED NETLIFY SETTING
In Netlify, open Project configuration > Environment variables.
Create this variable:

ADMIN_PIN = a PIN only Steven knows

After saving the variable, trigger a new deploy.

OPTIONAL TEXT-MESSAGE ALERTS
The ride request saves and appears in the dashboard without text-message setup.
For automatic text alerts, add these Netlify environment variables from a Twilio account:

TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
SMS_TO_NUMBER

If using a Twilio Messaging Service, use TWILIO_MESSAGING_SERVICE_SID instead of TWILIO_FROM_NUMBER.
All telephone numbers must include country code, for example: +17025551234
Redeploy after adding or changing environment variables.

ADDRESSES
Public page: https://steven-where-are-you.netlify.app/
Steven's dashboard: https://steven-where-are-you.netlify.app/admin.html

IMPORTANT
Do not place the PIN or Twilio credentials inside any HTML, JavaScript, TOML, or JSON file.
Keep those values only in Netlify Environment variables.
