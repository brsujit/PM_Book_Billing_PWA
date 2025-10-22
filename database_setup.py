import sqlite3

def setup_database():
    conn = sqlite3.connect('bookstore.db')
    cursor = conn.cursor()

    # --- 1. BOOKS (Inventory) Table ---
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
    )''')

    # --- 2. CUSTOMERS Table ---
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT
    )''')

    # --- 3. SALES LOG Table ---
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sales_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT UNIQUE NOT NULL,
        sale_date DATE NOT NULL,
        customer_name TEXT,
        customer_address TEXT,
        subtotal REAL NOT NULL,
        item_discounts REAL NOT NULL,
        global_discount REAL NOT NULL,
        gst_amount REAL NOT NULL,
        grand_total REAL NOT NULL,
        payment_method TEXT,
        amount_paid REAL,
        balance_due REAL
    )''')
    
    # --- 4. SALES ITEMS Table ---
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sales_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        book_title TEXT NOT NULL,
        book_author TEXT,
        quantity INTEGER NOT NULL,
        price_per_unit REAL NOT NULL,
        discount_percent REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales_log (id) ON DELETE CASCADE
    )''')

    conn.commit()
    conn.close()
    print("Database setup complete. Customers table added/verified.")

if __name__ == '__main__':
    setup_database()
  
