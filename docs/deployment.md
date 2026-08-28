# Deployment Guide for UVON

This guide explains how to deploy the UVON Next.js application to **Vercel** ($0/month Hobby tier) and configure your domain & email hosting with **mijn.host** without interrupting your email service.

---

## Architecture Overview
* **Frontend & Backend API:** Hosted on **Vercel** (Hobby Plan, $0/mo).
* **Database:** **Vercel Postgres** (Serverless PostgreSQL database, $0/mo integrated).
* **Domain & Custom Email Inboxes:** Managed and hosted at **mijn.host** (e.g. `info@uvon.nl`).
* **Automated Email Sending (Nodemailer):** Configured to send emails via your `mijn.host` SMTP server.

---

## Step 1: Push Code to GitHub
Ensure the latest code is pushed to your personal GitHub repository:
1. Initialize Git in the project folder (if not done already).
2. Link the repository to your personal account:
   ```bash
   git remote add origin git@github.com:mjvdende/uvon.git
   git push -u origin main
   ```

---

## Step 2: Set up Vercel & Postgres Database
1. Go to [Vercel](https://vercel.com) and log in with your GitHub account.
2. Click **Add New** -> **Project**.
3. Select your `uvon` repository and click **Import**.
4. In the configuration options:
   * Leave the **Framework Preset** as **Next.js**.
   * Open the **Environment Variables** section. Copy and paste the contents of your local `.env.production` file into the first key box. Vercel will parse the keys and values automatically. (You can use placeholder values for now and update them later).
5. Click **Deploy**. The initial build might take a minute.
6. Once deployed, go to the project dashboard and navigate to the **Storage** tab.
7. Click **Create Database** -> select **Postgres** -> Click **Continue**.
8. Name it and set the region (e.g., European region if `mijn.host` is European).
9. Under **Connect Project**, click **Connect**. This automatically injects the required database variables (`POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`) into your environment variables.

---

## Step 3: Run Database Migrations
Since we are using PostgreSQL, we need to create the tables in your new database:
1. In your local terminal, run the following command to push the database schema directly to your new Vercel Postgres database:
   ```bash
   npx prisma db push
   ```
   *(Note: This uses the connection URL in your local `.env` if you configure it, or you can temporarily pull down the Vercel connection string to run it locally).*
2. To run it through Vercel's build command automatically, you can edit your `package.json` build script to run migrations:
   `"build": "prisma generate && prisma db push && next build"`

---

## Step 4: Configure Domain & Email on mijn.host
To use your custom domain (e.g., `uvon.nl`) on Vercel while keeping your custom email inboxes (`info@uvon.nl`) working at `mijn.host`:

### A. Add your Domain to Vercel
1. Go to your project on Vercel -> **Settings** -> **Domains**.
2. Add your domain name (e.g., `uvon.nl`).
3. Vercel will display the required DNS records. It will ask for:
   * **An A Record:** Name: `@` (or empty), Value: `76.76.21.21`
   * **A CNAME Record:** Name: `www`, Value: `cname.vercel-dns.com`

### B. Configure DNS in mijn.host
1. Log in to the **mijn.host** control panel.
2. Go to your domain name and click **"DNS instellingen"**.
3. Add the A Record and CNAME Record provided by Vercel.
4. **WARNING:** Do *not* change the Nameservers to Vercel. By keeping the nameservers pointing to `mijn.host`, your MX records (which control your email inbox routing) will remain intact, and your custom emails will continue to work perfectly.

---

## Step 5: Environment Variables Checklist
Make sure these variables are configured in Vercel (**Settings** -> **Environment Variables**):

| Key | Description | Example |
| :--- | :--- | :--- |
| `NEXTAUTH_SECRET` | A secure random string used to encrypt cookies | *Pre-generated in `.env.production`* |
| `MOLLIE_API_KEY` | Your Mollie payment gateway key | `test_...` or `live_...` |
| `SMTP_HOST` | The SMTP server address from mijn.host | `mail.mijn.host` |
| `SMTP_PORT` | The SMTP server port (usually secure 465) | `465` |
| `SMTP_USER` | The email address sending the notifications | `info@uvon.nl` |
| `SMTP_PASSWORD` | The password for the email address | `********` |
| `CONTACT_EMAIL_TO` | The address that receives contact form messages | `info@uvon.nl` |

---

## Local Development (PostgreSQL)
To run the project locally after switching to PostgreSQL:
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy the connection string and paste it into your local [.env](file:///c:/Users/maart/projecten/uvon/.env) file:
   ```env
   POSTGRES_PRISMA_URL="postgresql://username:password@hostname/dbname?sslmode=require"
   POSTGRES_URL_NON_POOLING="postgresql://username:password@hostname/dbname?sslmode=require"
   ```
3. Run `npx prisma db push` to generate the tables locally.
4. Run `npm run dev` to start the local development server.
