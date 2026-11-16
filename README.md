# Inventory Management System (IVM)

A modern, full-stack enterprise **Inventory Management System** built with **Django REST Framework** on the backend and **React (Vite + Tailwind CSS)** on the frontend.

---

## 🚀 Key Features

* **Authentication & Authorization**: Secure JWT-based authentication with role-based access control (Admin & Staff roles).
* **Product Catalog**: Manage products with SKU, barcodes, categories, pricing, unit specifications, and low-stock alerts.
* **Inventory & Stock Tracking**: Real-time stock movement tracking (Inflow, Outflow, Adjustments) and historical audit trails.
* **Purchases & Suppliers**: Purchase order lifecycle management, supplier directories, and cost tracking.
* **Sales & Orders**: Customer management, point-of-sale processing, automated stock deduction, and invoices.
* **Dashboard & Analytics**: Interactive charts, KPIs, revenue graphs, and low-stock indicators.
* **Quick Demo Access**: Instant 1-click demo login credentials for evaluators and guests.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.12, Django 5.x, Django REST Framework, SimpleJWT, SQLite / MySQL support.
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios, React Router v6.

---

## 📦 Project Structure

```text
IVM/
├── Backend/                 # Django REST Framework backend
│   ├── accounts/            # Authentication & user management
│   ├── categories/          # Product categories
│   ├── config/              # Core Django settings, URLs, WSGI
│   ├── customers/           # Customer management
│   ├── inventory/           # Stock movements & tracking
│   ├── products/            # Product catalog & stock levels
│   ├── purchases/           # Purchase orders & stock receipts
│   ├── reports/             # Analytics & reporting APIs
│   ├── sales/               # Sales orders & revenue
│   ├── suppliers/           # Supplier management
│   ├── requirements.txt     # Python dependencies
│   └── manage.py
├── Frontend/                # React (Vite) Single Page Application
│   ├── src/                 # React components, pages, layouts & context
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
└── README.md
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd Backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Apply database migrations
python manage.py migrate

# Create a superuser (optional)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```
The Django API will be running at `http://127.0.0.1:8000/`.

### 3. Frontend Setup

```bash
# In a new terminal, navigate to the frontend directory
cd Frontend

# Install node dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will be accessible at `http://localhost:5173/`.

---

## 📄 License

This project is licensed under the MIT License.
