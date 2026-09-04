from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from functools import wraps
import json
import os
import sqlite3
import secrets

# Set up the Flask app
app = Flask(__name__, static_folder='.', static_url_path='')

# Security: Use a random secret key from environment variable or generate one
# The secret key is used to sign session cookies - must be kept secret!
app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))

# Enable CORS for all routes
CORS(app, supports_credentials=True)


def login_required(f):
    """Decorator to require login for protected endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# In-memory data stores (mirrors of the SQLite database)
# Default admin credentials - used ONLY to seed the admin_users table
# the first time the database is created. Login always reads from the DB.
# For production, set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
DEFAULT_ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'paps')
DEFAULT_ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', secrets.token_urlsafe(16))

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

DEFAULT_SETTINGS = {
    'personal': {
        'profilePic': 'MFON4013.jpg',
        'name': 'Paps Photography',
        'email': 'hello@papsphotography.com',
        'phone': '+233000000000',
        'website': '',
        'socials': {
            'instagram': 'https://instagram.com/papsphotography',
            'twitter': 'https://twitter.com/papsphotography',
            'facebook': 'https://facebook.com/papsphotography'
        }
    },
    'business': {
        'brandName': 'Paps Photography',
        'brandLogo': 'PHOTOGRAPHY.png',
        'aboutUs': 'Capturing moments, creating memories. Paps Photography specializes in weddings, events, portraits, and more.',
        'tagline': 'Capturing moments, creating memories.'
    },
    'rateCard': [
        {
            'id': 'cat_1',
            'name': 'Wedding Photography',
            'description': 'Comprehensive wedding coverage to capture every precious moment.',
            'coverPhoto': '350A5368.jpg',
            'terms': 'Standard wedding photography terms apply.',
            'addOns': [{'name': 'Extra Hour', 'price': 100}, {'name': 'Second Photographer', 'price': 300}],
            'services': [
                {'id': 'serv_1', 'name': 'Silver Package', 'price': 1500, 'description': '6 hours coverage', 'includes': ['Consultation', 'Online Gallery']},
                {'id': 'serv_2', 'name': 'Gold Package', 'price': 2500, 'description': '8 hours coverage', 'includes': ['Consultation', 'Online Gallery', 'Engagement Shoot']},
            ]
        },
        {
            'id': 'cat_2',
            'name': 'Portrait Sessions',
            'description': 'Professional portrait photography for individuals and families.',
            'coverPhoto': 'MFON3430.jpg',
            'terms': 'Portrait session terms apply.',
            'addOns': [{'name': 'Additional Outfit', 'price': 50}],
            'services': [
                {'id': 'serv_3', 'name': 'Basic Portrait', 'price': 200, 'description': '1-hour session', 'includes': ['10 digital images']},
                {'id': 'serv_4', 'name': 'Family Portrait', 'price': 350, 'description': '2-hour session', 'includes': ['20 digital images', '1 print']},
            ]
        }
    ]
}

DEFAULT_BOOKINGS = [
    {
        'id': 'PAP-ABC123',
        'service': 'Premium Session',
        'amount': 570,
        'name': 'Jane Doe',
        'email': 'jane.doe@example.com',
        'date': '2024-09-15',
        'time': '14:00',
        'status': 'Confirmed'
    },
    {
        'id': 'PAP-XYZ789',
        'service': 'Standard Session',
        'amount': 250,
        'name': 'John Smith',
        'email': 'john.smith@example.com',
        'date': '2024-10-01',
        'time': '10:00',
        'status': 'Pending'
    }
]

DEFAULT_PORTFOLIO = [
    {
        'id': 'proj_weddings_sample',
        'name': 'Wedding Stories',
        'works': [
            {'id': 'work_ws_1', 'imageUrl': 'https://images.unsplash.com/photo-1519741497674-6114d186b25c?q=80&w=1740', 'caption': 'Wedding ceremony'},
            {'id': 'work_ws_2', 'imageUrl': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1740', 'caption': 'Reception moments'}
        ]
    },
    {
        'id': 'proj_events_sample',
        'name': 'Event Highlights',
        'works': [
            {'id': 'work_eh_1', 'imageUrl': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1740', 'caption': 'Event setup'},
            {'id': 'work_eh_2', 'imageUrl': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1740', 'caption': 'Guest moments'}
        ]
    }
]

in_memory_data = {
    'settings': DEFAULT_SETTINGS,
    'bookings': DEFAULT_BOOKINGS,
    'invoices': [],
    'reviews': [
        {
            'id': 'rev_1',
            'name': 'Alice Johnson',
            'date': '2024-07-20',
            'rating': 5,
            'feedback': 'Absolutely stunning photos! Paps has an incredible eye for detail and made us feel so comfortable.',
            'status': 'Approved'
        },
        {
            'id': 'rev_2',
            'name': 'Michael Brown',
            'date': '2024-06-15',
            'rating': 4,
            'feedback': 'Great experience overall. The photos were beautiful, though the turnaround time was a bit longer than expected.',
            'status': 'Pending'
        }
    ],
    'portfolio': DEFAULT_PORTFOLIO
}


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    try:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )
        ''')
        # Seed the default admin user the first time the database is created
        admin_count = conn.execute('SELECT COUNT(*) FROM admin_users').fetchone()[0]
        if admin_count == 0:
            conn.execute(
                'INSERT INTO admin_users (username, password) VALUES (?, ?)',
                (DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD)
            )
        conn.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                service TEXT,
                amount REAL,
                original_amount REAL,
                discount_percent REAL,
                addons TEXT,
                name TEXT,
                email TEXT,
                phone TEXT,
                location TEXT,
                date TEXT,
                time TEXT,
                status TEXT
            )
        ''')
        for column, definition in (
            ('original_amount', 'REAL'),
            ('discount_percent', 'REAL')
        ):
            try:
                conn.execute(f'ALTER TABLE bookings ADD COLUMN {column} {definition}')
            except sqlite3.OperationalError:
                pass
        conn.execute('''
            CREATE TABLE IF NOT EXISTS portfolio (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS app_data (
                resource TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')

        settings_row = conn.execute('SELECT value FROM settings WHERE key = ?', ('app_settings',)).fetchone()
        if settings_row is None:
            conn.execute(
                'INSERT INTO settings (key, value) VALUES (?, ?)',
                ('app_settings', json.dumps(DEFAULT_SETTINGS))
            )

        booking_count = conn.execute('SELECT COUNT(*) FROM bookings').fetchone()[0]
        if booking_count == 0:
            for booking in DEFAULT_BOOKINGS:
                conn.execute(
                    'INSERT INTO bookings (id, service, amount, addons, name, email, phone, location, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        booking.get('id'),
                        booking.get('service'),
                        booking.get('amount', 0),
                        json.dumps(booking.get('addons', [])),
                        booking.get('name'),
                        booking.get('email'),
                        booking.get('phone', ''),
                        booking.get('location', ''),
                        booking.get('date'),
                        booking.get('time'),
                        booking.get('status', 'Pending')
                    )
                )

        portfolio_row = conn.execute('SELECT value FROM portfolio WHERE id = ?', ('main',)).fetchone()
        if portfolio_row is None:
            # Seed with empty portfolio - only projects created in admin panel will appear
            conn.execute('INSERT INTO portfolio (id, value) VALUES (?, ?)', ('main', json.dumps([])))

        for resource in ('messages', 'invoices', 'finance', 'calendar'):
            conn.execute(
                'INSERT OR IGNORE INTO app_data (resource, value) VALUES (?, ?)',
                (resource, '[]')
            )

        conn.commit()
    finally:
        conn.close()


def load_settings_from_db():
    conn = get_db_connection()
    row = conn.execute('SELECT value FROM settings WHERE key = ?', ('app_settings',)).fetchone()
    conn.close()
    if row is None:
        return DEFAULT_SETTINGS
    return json.loads(row['value'])


def save_settings_to_db(payload):
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            ('app_settings', json.dumps(payload))
        )
        conn.commit()
    finally:
        conn.close()


def load_admin_user():
    """Return the stored admin user as a dict, or the default if none exists."""
    conn = get_db_connection()
    row = conn.execute(
        'SELECT id, username, password FROM admin_users ORDER BY id LIMIT 1'
    ).fetchone()
    conn.close()
    if row is None:
        return {'username': DEFAULT_ADMIN_USERNAME, 'password': DEFAULT_ADMIN_PASSWORD}
    return {'username': row['username'], 'password': row['password']}


def save_admin_user(username, password):
    """Update the admin credentials in the database (keeps a single admin row)."""
    conn = get_db_connection()
    try:
        existing = conn.execute('SELECT id FROM admin_users LIMIT 1').fetchone()
        if existing is None:
            conn.execute(
                'INSERT INTO admin_users (username, password) VALUES (?, ?)',
                (username, password)
            )
        else:
            conn.execute(
                'UPDATE admin_users SET username = ?, password = ? WHERE id = ?',
                (username, password, existing['id'])
            )
        conn.commit()
    finally:
        conn.close()


def load_bookings_from_db():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM bookings ORDER BY date DESC').fetchall()
    conn.close()
    bookings = []
    for row in rows:
        bookings.append({
            'id': row['id'],
            'service': row['service'],
            'amount': row['amount'],
            'originalAmount': row['original_amount'],
            'discountPercent': row['discount_percent'] or 0,
            'addons': json.loads(row['addons']) if row['addons'] else [],
            'name': row['name'],
            'email': row['email'],
            'phone': row['phone'],
            'location': row['location'],
            'date': row['date'],
            'time': row['time'],
            'status': row['status']
        })
    return bookings


def save_booking_to_db(booking):
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO bookings (id, service, amount, original_amount, discount_percent, addons, name, email, phone, location, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                booking.get('id'),
                booking.get('service', 'Service'),
                booking.get('amount', 0),
                booking.get('originalAmount', booking.get('amount', 0)),
                booking.get('discountPercent', 0),
                json.dumps(booking.get('addons', [])),
                booking.get('name', 'Client'),
                booking.get('email', ''),
                booking.get('phone', ''),
                booking.get('location', ''),
                booking.get('date', ''),
                booking.get('time', ''),
                booking.get('status', 'Pending')
            )
        )
        conn.commit()
    finally:
        conn.close()


def update_booking_status_in_db(booking_id, new_status):
    conn = get_db_connection()
    try:
        result = conn.execute(
            'UPDATE bookings SET status = ? WHERE id = ?',
            (new_status, booking_id)
        )
        conn.commit()
        return result.rowcount > 0
    finally:
        conn.close()


def apply_booking_discount_in_db(booking_id, discount_percent):
    conn = get_db_connection()
    try:
        row = conn.execute('SELECT amount, original_amount FROM bookings WHERE id = ?', (booking_id,)).fetchone()
        if row is None:
            return None
        original_amount = row['original_amount'] if row['original_amount'] is not None else row['amount']
        discounted_amount = round(original_amount * (1 - discount_percent / 100), 2)
        conn.execute(
            'UPDATE bookings SET amount = ?, original_amount = ?, discount_percent = ?, status = ? WHERE id = ?',
            (discounted_amount, original_amount, discount_percent, 'Confirmed', booking_id)
        )
        conn.commit()
        return discounted_amount
    finally:
        conn.close()


def load_collection_from_db(resource):
    conn = get_db_connection()
    row = conn.execute('SELECT value FROM app_data WHERE resource = ?', (resource,)).fetchone()
    conn.close()
    if row is None:
        return []
    return json.loads(row['value'])


def save_collection_to_db(resource, value):
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO app_data (resource, value) VALUES (?, ?) '
            'ON CONFLICT(resource) DO UPDATE SET value = excluded.value',
            (resource, json.dumps(value))
        )
        conn.commit()
    finally:
        conn.close()

ALLOWED_BOOKING_STATUSES = {'Pending', 'Confirmed', 'Paid', 'Declined'}


def reset_all_data():
    """Factory reset: restore settings, bookings and portfolio defaults,
    and wipe all app collections (messages, invoices, finance, calendar)."""
    # 1) Settings back to defaults
    settings = json.loads(json.dumps(DEFAULT_SETTINGS))
    save_settings_to_db(settings)

    # 2) Bookings back to the seeded sample bookings
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM bookings')
        for booking in DEFAULT_BOOKINGS:
            conn.execute(
                'INSERT INTO bookings (id, service, amount, addons, name, email, phone, location, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    booking.get('id'),
                    booking.get('service'),
                    booking.get('amount', 0),
                    json.dumps(booking.get('addons', [])),
                    booking.get('name'),
                    booking.get('email'),
                    booking.get('phone', ''),
                    booking.get('location', ''),
                    booking.get('date'),
                    booking.get('time'),
                    booking.get('status', 'Pending')
                )
            )

        # 3) Portfolio back to the fresh (empty) sample state
        conn.execute(
            'INSERT INTO portfolio (id, value) VALUES (?, ?) '
            'ON CONFLICT(id) DO UPDATE SET value = excluded.value',
            ('main', json.dumps([]))
        )

        # 4) Clear all app collections
        for resource in ('messages', 'invoices', 'finance', 'calendar'):
            conn.execute(
                'INSERT INTO app_data (resource, value) VALUES (?, ?) '
                'ON CONFLICT(resource) DO UPDATE SET value = excluded.value',
                (resource, '[]')
            )
        conn.commit()
    finally:
        conn.close()

    # Refresh the in-memory cache
    in_memory_data['settings'] = settings
    in_memory_data['bookings'] = load_bookings_from_db()
    in_memory_data['portfolio'] = []
    for resource in ('messages', 'invoices', 'finance', 'calendar'):
        in_memory_data[resource] = []
    return settings


# ============================================================
# API ROUTES
# ============================================================

# --- Authentication ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '')
    password = data.get('password', '')

    admin_user = load_admin_user()
    if username == admin_user.get('username') and password == admin_user.get('password'):
        session['logged_in'] = True
        session['username'] = admin_user.get('username')
        return jsonify({'success': True, 'message': 'Login successful', 'username': admin_user.get('username')})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    if session.get('logged_in'):
        return jsonify({'logged_in': True, 'username': session.get('username')})
    else:
        return jsonify({'logged_in': False})

# --- Admin Account Management ---
@app.route('/api/admin/user', methods=['GET'])
def get_admin_user():
    if not session.get('logged_in'):
        return jsonify({'error': 'Not authenticated'}), 401
    admin_user = load_admin_user()
    return jsonify({'username': admin_user.get('username')})


@app.route('/api/admin/user', methods=['PUT'])
def update_admin_user():
    """Change the admin username and/or password.
    Requires the current password for verification.
    Payload: { currentPassword, newUsername, newPassword }
    """
    if not session.get('logged_in'):
        return jsonify({'error': 'Not authenticated'}), 401

    payload = request.get_json(silent=True) or {}
    current_password = payload.get('currentPassword', '')
    new_username = (payload.get('newUsername') or '').strip()
    new_password = payload.get('newPassword') or ''

    admin_user = load_admin_user()

    # Validate the current password
    if current_password != admin_user.get('password'):
        return jsonify({'error': 'Current password is incorrect'}), 400

    # Require a non-empty username
    if not new_username:
        return jsonify({'error': 'Username cannot be empty'}), 400

    # If a new password was given, require it to be at least 4 characters.
    # Empty means "keep the current password".
    if new_password and len(new_password) < 4:
        return jsonify({'error': 'New password must be at least 4 characters'}), 400

    final_password = new_password if new_password else admin_user.get('password')

    save_admin_user(new_username, final_password)
    session['username'] = new_username
    return jsonify({'success': True, 'message': 'Login details updated', 'username': new_username})

# --- Settings ---
@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(load_settings_from_db())

@app.route('/api/settings', methods=['PUT', 'PATCH'])
@login_required
def update_settings():
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({'error': 'Settings payload must be an object'}), 400

    current_settings = load_settings_from_db()

    if 'business' in payload:
        current_settings['business'] = {
            **current_settings.get('business', {}),
            **payload['business']
        }

    if 'personal' in payload:
        current_settings['personal'] = {
            **current_settings.get('personal', {}),
            **payload['personal']
        }

    if 'rateCard' in payload:
        current_settings['rateCard'] = payload['rateCard']

    in_memory_data['settings'] = current_settings
    save_settings_to_db(current_settings)
    return jsonify(current_settings)


@app.route('/api/settings/reset', methods=['POST'])
@login_required
def reset_settings():
    settings = json.loads(json.dumps(DEFAULT_SETTINGS))
    save_settings_to_db(settings)
    in_memory_data['settings'] = settings
    return jsonify(settings)

@app.route('/api/data/reset', methods=['POST'])
def reset_data():
    """Factory reset for ALL app data (settings, bookings, portfolio, collections)."""
    if not session.get('logged_in'):
        return jsonify({'error': 'Not authenticated'}), 401
    settings = reset_all_data()
    return jsonify({
        'success': True,
        'message': 'All data has been reset to factory defaults.',
        'settings': settings
    })

# --- Portfolio ---
@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    conn = get_db_connection()
    row = conn.execute('SELECT value FROM portfolio WHERE id = ?', ('main',)).fetchone()
    conn.close()
    projects = json.loads(row['value']) if row else DEFAULT_PORTFOLIO
    in_memory_data['portfolio'] = projects
    return jsonify(projects)

@app.route('/api/photos', methods=['GET'])
def get_all_photos():
    """Return all photos from all portfolio projects."""
    conn = get_db_connection()
    row = conn.execute('SELECT value FROM portfolio WHERE id = ?', ('main',)).fetchone()
    conn.close()
    projects = json.loads(row['value']) if row else DEFAULT_PORTFOLIO
    photos = []
    for project in projects:
        for work in (project.get('works') or []):
            photos.append({
                'id': work.get('id'),
                'imageUrl': work.get('imageUrl'),
                'caption': work.get('caption') or project.get('name', ''),
                'projectId': project.get('id'),
                'projectName': project.get('name', '')
            })
    return jsonify(photos)

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Return ONLY portfolio projects created in the admin panel (no default data)."""
    conn = get_db_connection()
    row = conn.execute('SELECT value FROM portfolio WHERE id = ?', ('main',)).fetchone()
    conn.close()
    if row is None:
        return jsonify([])
    projects = json.loads(row['value'])
    # Only return projects with actual content (not default sample data)
    return jsonify(projects)

@app.route('/api/portfolio', methods=['PUT'])
@login_required
def save_portfolio():
    payload = request.get_json(silent=True) or []
    if not isinstance(payload, list):
        return jsonify({'error': 'Portfolio data must be a list'}), 400
    in_memory_data['portfolio'] = payload
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO portfolio (id, value) VALUES (?, ?) '
            'ON CONFLICT(id) DO UPDATE SET value = excluded.value',
            ('main', json.dumps(payload))
        )
        conn.commit()
    finally:
        conn.close()
    return jsonify(in_memory_data['portfolio'])


@app.route('/api/data/<resource>', methods=['GET'])
@login_required
def get_app_data(resource):
    allowed_resources = {'messages', 'invoices', 'finance', 'calendar', 'bookings'}
    if resource not in allowed_resources:
        return jsonify({'error': 'Unknown data collection'}), 404
    if resource == 'bookings':
        return jsonify(load_bookings_from_db())
    return jsonify(load_collection_from_db(resource))


@app.route('/api/data/<resource>', methods=['PUT'])
@login_required
def save_app_data(resource):
    allowed_resources = {'messages', 'invoices', 'finance', 'calendar', 'bookings'}
    if resource not in allowed_resources:
        return jsonify({'error': 'Unknown data collection'}), 404
    payload = request.get_json(silent=True)
    if not isinstance(payload, list):
        return jsonify({'error': 'Collection data must be a list'}), 400
    if resource == 'bookings':
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM bookings')
            for booking in payload:
                conn.execute(
                    'INSERT INTO bookings (id, service, amount, addons, name, email, phone, location, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        booking.get('id'), booking.get('service', 'Service'), booking.get('amount', 0),
                        json.dumps(booking.get('addons', [])), booking.get('name', 'Client'),
                        booking.get('email', ''), booking.get('phone', ''), booking.get('location', ''),
                        booking.get('date', ''), booking.get('time', ''), booking.get('status', 'Pending')
                    )
                )
            conn.commit()
        finally:
            conn.close()
        in_memory_data['bookings'] = payload
        return jsonify(payload)
    save_collection_to_db(resource, payload)
    return jsonify(payload)

# --- Bookings ---
@app.route('/api/bookings', methods=['GET'])
@login_required
def get_bookings():
    bookings = load_bookings_from_db()
    in_memory_data['bookings'] = bookings
    return jsonify(bookings)

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    payload = request.get_json(silent=True) or {}
    booking = {
        'id': payload.get('id') or f"BR-{len(load_bookings_from_db()) + 1:04d}",
        'service': payload.get('service', 'Service'),
        'amount': payload.get('amount', 0),
        'addons': payload.get('addons', []),
        'name': payload.get('name', 'Client'),
        'email': payload.get('email', ''),
        'phone': payload.get('phone', ''),
        'location': payload.get('location', ''),
        'date': payload.get('date', ''),
        'time': payload.get('time', ''),
        'status': payload.get('status', 'Pending')
    }
    save_booking_to_db(booking)
    in_memory_data['bookings'] = load_bookings_from_db()
    return jsonify(booking), 201

@app.route('/api/bookings/<booking_id>', methods=['GET'])
@login_required
def get_booking(booking_id):
    booking = next((item for item in load_bookings_from_db() if item.get('id') == booking_id), None)
    if booking is None:
        return jsonify({'error': 'Booking not found'}), 404
    return jsonify(booking)

@app.route('/api/bookings/<booking_id>/status', methods=['PUT', 'PATCH'])
@login_required
def update_booking_status(booking_id):
    booking = next((item for item in load_bookings_from_db() if item.get('id') == booking_id), None)
    if booking is None:
        return jsonify({'error': 'Booking not found'}), 404

    payload = request.get_json(silent=True) or {}
    new_status = payload.get('status')

    if not new_status:
        return jsonify({'error': 'Status is required'}), 400
    if new_status not in ALLOWED_BOOKING_STATUSES:
        return jsonify({'error': 'Invalid booking status'}), 400

    updated = update_booking_status_in_db(booking_id, new_status)
    if not updated:
        return jsonify({'error': 'Booking not found'}), 404

    booking['status'] = new_status
    in_memory_data['bookings'] = load_bookings_from_db()
    return jsonify(booking)


@app.route('/api/bookings/<booking_id>/discount', methods=['PUT', 'PATCH'])
@login_required
def apply_booking_discount(booking_id):
    payload = request.get_json(silent=True) or {}
    try:
        discount_percent = float(payload.get('discountPercent'))
    except (TypeError, ValueError):
        return jsonify({'error': 'A valid discount percentage is required'}), 400

    if discount_percent < 0 or discount_percent > 100:
        return jsonify({'error': 'Discount percentage must be between 0 and 100'}), 400

    discounted_amount = apply_booking_discount_in_db(booking_id, discount_percent)
    if discounted_amount is None:
        return jsonify({'error': 'Booking not found'}), 404

    booking = next(item for item in load_bookings_from_db() if item['id'] == booking_id)
    in_memory_data['bookings'] = load_bookings_from_db()
    return jsonify(booking)

# --- Public Tracking Endpoint ---
# Returns ONLY non-sensitive data for client booking tracking
# Does NOT expose: email, phone, amount, client name
@app.route('/api/track/<booking_id>', methods=['GET'])
def track_booking(booking_id):
    booking = next((item for item in load_bookings_from_db() if item.get('id') == booking_id), None)
    if booking is None:
        return jsonify({'error': 'Booking not found'}), 404
    # Return only non-sensitive fields for public tracking
    return jsonify({
        'id': booking.get('id'),
        'service': booking.get('service'),
        'date': booking.get('date'),
        'time': booking.get('time'),
        'status': booking.get('status'),
        'location': booking.get('location')
    })

# --- SEO Technical Files ---
@app.route('/sitemap.xml')
def sitemap():
    return send_from_directory('../client', 'sitemap.xml')

@app.route('/robots.txt')
def robots():
    return send_from_directory('../client', 'robots.txt')

@app.route('/llms.txt')
def llms():
    return send_from_directory('../client', 'llms.txt')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('../client', 'favicon.svg', mimetype='image/svg+xml')

# --- Root and Static File Serving ---
@app.route('/')
def index():
    return send_from_directory('.', 'client console.html')

@app.route('/<path:path>')
def serve_static(path):
    # Security check: Disallow directory traversal
    if '..' in path or path.startswith('/'):
        return send_from_directory('../client', '404.html'), 404
    
    # Check if the requested path is a directory, if so, serve index.html from it
    if os.path.isdir(os.path.join('.', path)) and os.path.exists(os.path.join('.', path, 'index.html')):
        return send_from_directory(os.path.join('.', path), 'index.html')
    
    # Check if file exists before serving
    file_path = os.path.join('.', path)
    if not os.path.exists(file_path):
        return send_from_directory('../client', '404.html'), 404
        
    return send_from_directory('.', path)

# --- Custom 404 Error Handler ---
@app.errorhandler(404)
def page_not_found(e):
    return send_from_directory('../client', '404.html'), 404


init_db()

if __name__ == '__main__':
    # Use 0.0.0.0 to make it accessible on the local network
    # Security: Debug mode should NEVER be enabled in production
    # Set FLASK_DEBUG=1 environment variable to enable debug mode
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
