# Google Drive File Upload Setup Guide

This guide explains how to set up a Google Cloud Service Account and configure your backend to save student form file uploads directly to a Google Drive folder.

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Create a Google Service Account (1 Minute)
To allow the backend to upload files, you need a Google Service Account:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create a new one).
3. Navigate to **IAM & Admin** > **Service Accounts**.
4. Click **Create Service Account** at the top.
5. Provide a name (e.g., `rvce-placement-drive`), then click **Create and Continue**.
6. (Optional) Skip role assignment and click **Done**.

### Step 2: Generate and Download the JSON Key File
1. In the **Service Accounts** list, click on your newly created service account.
2. Go to the **Keys** tab at the top.
3. Click **Add Key** > **Create new key**.
4. Select **JSON** as the key type and click **Create**.
5. Save the downloaded `.json` file securely on your computer.

### Step 3: Configure your `backend/.env`
Open the downloaded JSON key file and your actual `backend/.env` file. Add the following variables to `backend/.env`:

```env
# 1. Paste the "client_email" field value from your JSON key file:
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=your-service-account-name@your-project.iam.gserviceaccount.com

# 2. Paste the "private_key" field value. Make sure it is enclosed in double quotes 
# and keep the "\n" characters intact:
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
```

> [!IMPORTANT]
> The private key must be formatted as a single line wrapped in double quotes `"`, replacing actual line breaks with `\n` characters so that Node.js reads it correctly.

---

## 📂 Link and Share your Google Drive Folder

### Step 4: Share the Target Google Drive Folder
Because Google Service Accounts are separate secure identities, they need explicit access to write into your folder:

#### Scenario A: If the Folder is Public ("Anyone with the link can edit")
- If the folder is shared with **"Anyone with the link" as Editor**, no extra sharing steps are needed! The Service Account will be able to upload files into it automatically.

#### Scenario B: If the Folder is Private/Restricted
1. Copy the `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` value (e.g., `your-service-account-name@your-project.iam.gserviceaccount.com`).
2. Go to your target Google Drive folder in your browser.
3. Click **Share** at the top right.
4. Paste the Service Account email address, set its role to **Editor**, and click **Share**.

---

## ⚡ How it Works Under the Hood

Once these environment variables are populated and the backend server restarts:
1. **Direct Uploads**: Students uploading files in custom forms will have their files uploaded directly to the designated Google Drive folder.
2. **Access Control**: The backend automatically sets file sharing permissions on Google Drive so that **anyone with the link can read** the file.
3. **Admin Responses Grid**: The final Google Drive web link is saved as the answer in the database. When the SPC admin views the submissions, it displays a neat, clickable **"View File"** link!
4. **Resilient Failover**: If the environment variables are unconfigured, the system automatically falls back to storing uploads locally/GridFS so form submissions never fail.
