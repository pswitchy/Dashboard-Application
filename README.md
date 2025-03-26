# Dashboard with Google Sheets Integration

This project is a full-stack web application featuring a user dashboard built with Next.js (frontend) and Node.js/Express (backend). It includes JWT-based authentication, dynamic table creation based on Google Sheets data, real-time data updates (via WebSocket polling), and the ability to add custom columns directly in the dashboard UI.

## Features

*   **Authentication:** Secure user signup and login using JWT (JSON Web Tokens). Passwords are hashed using bcrypt.
*   **Protected Routes:** Dashboard access is restricted to logged-in users (using frontend and backend middleware). Automatic logout on token expiry via API interceptors.
*   **Google Sheets Integration:**
    *   Users configure the dashboard to connect to a specific Google Sheet ID, Sheet Name, and Header Row.
    *   Initial columns (matching the Sheet's headers) are defined during setup with data types (Text/Date).
    *   Data is fetched from the Google Sheet and displayed in a table on the dashboard.
*   **Real-time Updates:** The backend polls the Google Sheet periodically. Changes are pushed to connected frontend clients via WebSockets, updating the table automatically without manual refresh.
*   **Dynamic Column Addition:** Users can add new columns (Text or Date type) directly to the dashboard table UI. These columns are saved per user but **do not** modify the original Google Sheet.
*   **Clean UI:** Built with Tailwind CSS and Shadcn UI for a modern and responsive user interface.

## Tech Stack

*   **Frontend:**
    *   Next.js (App Router)
    *   React
    *   TypeScript
    *   Tailwind CSS
    *   Shadcn UI
    *   Axios (for API calls)
    *   Sonner (for toasts/notifications)
    *   `date-fns` (for date formatting)
    *   `react-hook-form`, `zod` (for form validation)
    *   `next-themes` (for theme switching - setup included)
*   **Backend:**
    *   Node.js
    *   Express.js
    *   MongoDB (Database)
    *   Mongoose (ODM)
    *   JSONWebToken (JWT for auth)
    *   Bcrypt (Password hashing)
    *   `googleapis` (Google Sheets API client)
    *   `ws` (WebSocket server)
    *   `dotenv` (Environment variables)
    *   `cors` (Cross-Origin Resource Sharing)
    *   `cookie-parser` (For handling HttpOnly auth cookies)
*   **Authentication:** JWT stored in HttpOnly cookies.

## Prerequisites

*   **Node.js:** v18 or higher recommended.
*   **npm** or **yarn:** Package manager for Node.js.
*   **MongoDB:** A running MongoDB instance (local or cloud-based like MongoDB Atlas). Get the connection string.
*   **Google Cloud Platform Account:** Required for Google Sheets API access.
*   **Git:** For cloning the repository.

## Getting Started

**1. Clone the Repository:**

```bash
git clone <your-repository-url>
cd <your-repository-name>
```

**2. Backend Setup:**

   *   **Navigate to the backend directory:**
      ```bash
      cd backend
      ```
   *   **Install dependencies:**
      ```bash
      npm install or yarn install
      ```
   *   **Create Environment File:**
      Create a `.env` file in the `/backend` directory. Copy the contents of `.env.example` (if provided) or add the following variables, replacing placeholder values:

      ```env
      # /backend/.env

      NODE_ENV=development
      PORT=5001 # Port for the backend API server
      MONGO_URI=mongodb://localhost:27017/dashboardApp # Your MongoDB connection string
      JWT_SECRET=your_super_secret_jwt_key_CHANGE_THIS # Strong, random secret for JWT signing
      JWT_EXPIRES_IN=1h # How long tokens are valid (e.g., 1h, 7d)
      GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json # Path to Google credentials file (relative to backend root)
      WEBSOCKET_PORT=5002 # Port for the WebSocket server
      FRONTEND_URL=http://localhost:3000 # URL of your frontend (for CORS)
      ```
      **Security Note:** Choose a strong, unique `JWT_SECRET` and keep it private. Do not commit `.env` to Git.

   *   **Setup Google Credentials:**
      *   Follow the steps in the "Google Sheets Integration Setup" section below to generate a `google-credentials.json` file.
      *   Place the downloaded `google-credentials.json` file directly inside the `/backend` directory.
      **Security Note:** Do not commit `google-credentials.json` to Git. Ensure your `.gitignore` file includes it.

   *   **Ensure MongoDB is Running:** Make sure your MongoDB server is accessible at the `MONGO_URI` specified.

**3. Frontend Setup:**

   *   **Navigate to the frontend directory:**
      ```bash
      cd ../frontend
      ```
   *   **Install dependencies:**
      ```bash
      npm install or yarn install
      ```
   *   **Create Environment File:**
      Create a `.env.local` file in the `/frontend` directory with the following variables:

      ```env
      # /frontend/.env.local

      NEXT_PUBLIC_API_URL=http://localhost:5001/api # URL of your backend API (matching backend PORT)
      NEXT_PUBLIC_WS_URL=ws://localhost:5002       # URL of your WebSocket server (matching backend WEBSOCKET_PORT)
      ```

**4. Running the Application:**

   *   **Start the Backend Server:**
      Open a terminal in the `/backend` directory:
      ```bash
      npm run dev
      ```
      The backend API and WebSocket server should start (typically on ports 5001 and 5002).

   *   **Start the Frontend Server:**
      Open a *separate* terminal in the `/frontend` directory:
      ```bash
      npm run dev
      ```
      The Next.js development server should start (typically on port 3000).

   *   **Access the Application:**
      Open your web browser and navigate to `http://localhost:3000`.

## Configuration

### Environment Variables

*   **Backend (`/backend/.env`):**
    *   `NODE_ENV`: Set to `development` or `production`. Affects cookie security settings.
    *   `PORT`: Port for the Express API server.
    *   `MONGO_URI`: Connection string for your MongoDB database.
    *   `JWT_SECRET`: Secret key for signing JWTs. **Keep this secure!**
    *   `JWT_EXPIRES_IN`: Validity duration for JWTs (e.g., `1h`, `7d`).
    *   `GOOGLE_APPLICATION_CREDENTIALS`: Path to the Google service account key file (relative to `/backend`). Default: `./google-credentials.json`.
    *   `WEBSOCKET_PORT`: Port for the WebSocket server for real-time updates.
    *   `FRONTEND_URL`: The base URL of your frontend application (used for CORS configuration).
*   **Frontend (`/frontend/.env.local`):**
    *   `NEXT_PUBLIC_API_URL`: Full URL to your backend API endpoint (e.g., `http://localhost:5001/api`). `NEXT_PUBLIC_` prefix makes it available in the browser.
    *   `NEXT_PUBLIC_WS_URL`: Full URL for the WebSocket connection (e.g., `ws://localhost:5002`).

### Google Sheets Integration Setup

To allow the backend to read your Google Sheet, you need to create a Service Account in Google Cloud Platform and grant it access:

1.  **Go to Google Cloud Console:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create/Select Project:** Create a new project or select an existing one.
3.  **Enable Google Sheets API:**
    *   Navigate to "APIs & Services" > "Library".
    *   Search for "Google Sheets API" and enable it for your project.
4.  **Create Service Account:**
    *   Navigate to "APIs & Services" > "Credentials".
    *   Click "+ CREATE CREDENTIALS" > "Service account".
    *   Give the service account a name (e.g., `dashboard-sheets-reader`).
    *   Click "CREATE AND CONTINUE". You can skip granting roles on the project level for now. Click "CONTINUE".
    *   Skip granting user access. Click "DONE".
5.  **Generate Key:**
    *   Find the service account you just created in the Credentials list. Click on its email address.
    *   Go to the "KEYS" tab.
    *   Click "ADD KEY" > "Create new key".
    *   Select "JSON" as the key type and click "CREATE".
    *   A JSON file will be downloaded. **Rename this file to `google-credentials.json`**.
6.  **Place Key File:** Move the downloaded and renamed `google-credentials.json` file into the root of your `/backend` directory.
7.  **Share Google Sheet:**
    *   Open the specific Google Sheet you want to display data from.
    *   Click the **"Share"** button (top right).
    *   In the "Add people and groups" field, paste the **`client_email` address** found inside your `google-credentials.json` file.
    *   Set the role to **"Viewer"** (or "Editor"). "Viewer" is sufficient for reading data.
    *   Click **"Share"** or **"Send"**. (You can usually skip sending a notification).

## Usage

1.  **Navigate** to `http://localhost:3000`.
2.  You will be redirected to the **Login** page. If you don't have an account, click the link to **Sign Up**.
3.  **Register** or **Log In** using your credentials.
4.  Upon successful login, you will be redirected to the **Dashboard**.
5.  **Initial Setup:** If no table is configured, you'll see a message prompting you to create one.
6.  Click **"Create Table"** (or "Edit Table Config" if one exists).
7.  In the dialog:
    *   Enter the **Google Sheet ID** (found in the URL of your sheet, e.g., `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`).
    *   Enter the **Sheet Name** (the name of the tab within your spreadsheet, e.g., `Sheet1`).
    *   Enter the **Header Row** number (usually `1`).
    *   Define the **Initial Columns:** List the column headers *exactly* as they appear in your Google Sheet's header row. Select the correct **Type** (Text/Date) for each.
8.  Click **"Save Configuration"**.
9.  The dashboard will fetch data from the specified Google Sheet and display it in the table.
10. **Real-time Updates:** As new rows are added or data is changed in the Google Sheet, the table in the dashboard should update automatically within about 30 seconds (polling interval).
11. **Add Dynamic Columns:** Click **"Add Dynamic Column"**, provide a unique name and type (Text/Date), and click **"Add Column"**. This new column will appear in the dashboard table but not in the Google Sheet. These columns are saved with your table configuration.
12. **Logout:** Click the logout icon in the header to end your session and clear the authentication cookie.
