import sqlite3
from flask import Flask, render_template, jsonify, request
import pandas as pd
from io import StringIO
from datetime import datetime

app = Flask(__name__, template_folder='templates', static_folder='static')
DATABASE = 'bookstore.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# --- PAGE ROUTING ---
@app.route('/')
def index(): return render_template('index.html')

@app.route('/manage')
def manage_inventory(): return render_template('manage_db.html')

@app.route('/history')
def sales_history_page(): return render_template('sales_history.html')

# --- API ROUTES ---

@app.route('/api/last_invoice_number', methods=['GET'])
def get_last_invoice_number():
    conn = get_db_connection()
    today_prefix = f"INV-{datetime.now().strftime('%Y%m%d')}"
    last_sale = conn.execute("SELECT invoice_no FROM sales_log WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1", (f"{today_prefix}%",)).fetchone()
    conn.close()
    last_number = 0
    if last_sale:
        try:
            last_number = int(last_sale['invoice_no'].split('-')[-1])
        except (IndexError, ValueError): pass
    return jsonify({"last_invoice_number": last_number})

@app.route('/api/customers', methods=['GET'])
def get_customers():
    conn = get_db_connection()
    customers = conn.execute('SELECT name, phone, address FROM customers ORDER BY name').fetchall()
    conn.close()
    return jsonify([dict(c) for c in customers])

@app.route('/api/books', methods=['GET'])
def get_books():
    conn = get_db_connection()
    books = conn.execute('SELECT id, title, author, price, stock FROM books ORDER BY id').fetchall()
    conn.close()
    return jsonify([dict(book) for book in books])

@app.route('/api/invoice', methods=['POST'])
def process_invoice():
    invoice_data = request.get_json()
    sale_record = invoice_data.get('sale_record')
    items_sold = sale_record.get('items', [])
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Update Inventory Stock
        for item in items_sold:
            cursor.execute("UPDATE books SET stock = stock - ? WHERE title = ?", (item['qty'], item['title']))
        
        # 2. Save or Update Customer Info
        customer_name = sale_record.get('customer')
        customer_phone = sale_record.get('phone')
        customer_address = sale_record.get('address')
        if customer_name and (customer_phone or customer_address): # Only save if there is data
            cursor.execute("SELECT id FROM customers WHERE name = ?", (customer_name,))
            existing_customer = cursor.fetchone()
            if existing_customer:
                cursor.execute("UPDATE customers SET phone = ?, address = ? WHERE name = ?", (customer_phone, customer_address, customer_name))
            else:
                cursor.execute("INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)", (customer_name, customer_phone, customer_address))

        # 3. Save Sale Header
        sale_date_obj = datetime.strptime(sale_record['date'], '%d/%m/%Y').strftime('%Y-%m-%d')
        cursor.execute(
            """INSERT INTO sales_log (invoice_no, sale_date, customer_name, customer_address, subtotal, item_discounts, global_discount, gst_amount, grand_total, payment_method, amount_paid, balance_due) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sale_record['invoiceNo'], sale_date_obj, customer_name, customer_address,
                sale_record['subtotal'], sale_record['itemDiscountsTotal'], sale_record['globalDiscountAmount'],
                sale_record['taxAmount'], sale_record['grandTotal'], sale_record['payment_method'],
                sale_record['amount_paid'], sale_record['balance_due']
            )
        )
        sale_id = cursor.lastrowid

        # 4. Save Sale Items
        for item in items_sold:
            cursor.execute("INSERT INTO sales_items (sale_id, book_title, book_author, quantity, price_per_unit, discount_percent) VALUES (?, ?, ?, ?, ?, ?)",
                (sale_id, item['title'], item['author'], item['qty'], item['price'], item['discount']))
        
        conn.commit()
        response = {"status": "success", "message": f"Invoice {sale_record['invoiceNo']} saved."}
    except Exception as e:
        conn.rollback()
        response = {"status": "error", "message": str(e)}
    finally:
        conn.close()
    return jsonify(response)

# (Add all your other API routes here: /api/book POST, PUT, DELETE, /api/sales, /api/import_csv)
# ...

if __name__ == '__main__':
    app.run(debug=True)
  
