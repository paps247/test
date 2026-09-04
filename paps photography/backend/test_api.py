import os
# Set test environment variables before importing backend
os.environ.setdefault('ADMIN_USERNAME', 'paps')
os.environ.setdefault('ADMIN_PASSWORD', 'testpass123')
os.environ.setdefault('FLASK_SECRET_KEY', 'test-secret-key-for-tests')

# Temporary end-to-end test for the new admin features.
# Uses Flask's test client against the real database.
from backend import app, init_db, get_db_connection, DEFAULT_BOOKINGS, DB_PATH

# Delete existing database to start fresh with test credentials
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

init_db()
client = app.test_client()

PASS = 0
FAIL = 0

def check(name, cond, extra=''):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {extra}")


# Use the same credentials set via environment variables
TEST_USERNAME = 'paps'
TEST_PASSWORD = 'testpass123'


print("== 1. Login ==")
r = client.post('/api/login', json={'username': TEST_USERNAME, 'password': TEST_PASSWORD})
check("login with default creds", r.status_code == 200, r.get_json())

r = client.post('/api/login', json={'username': TEST_USERNAME, 'password': 'wrong'})
check("login with wrong password rejected", r.status_code == 401, r.get_json())

print("== 2. Admin user endpoints ==")
r = client.get('/api/admin/user')
check("GET /api/admin/user returns username", r.status_code == 200 and r.get_json().get('username') == TEST_USERNAME, r.get_json())

r = client.post('/api/login', json={'username': TEST_USERNAME, 'password': TEST_PASSWORD})
check("session login", r.status_code == 200)

# Change credentials
r = client.put('/api/admin/user', json={
    'currentPassword': TEST_PASSWORD,
    'newUsername': 'papsadmin',
    'newPassword': 'newpass42'
})
check("PUT /api/admin/user updates credentials", r.status_code == 200, r.get_json())

r = client.get('/api/admin/user')
check("GET returns new username", r.get_json().get('username') == 'papsadmin', r.get_json())

r = client.put('/api/admin/user', json={
    'currentPassword': 'badpass',
    'newUsername': 'x',
    'newPassword': 'y'
})
check("PUT with wrong current password rejected", r.status_code == 400, r.get_json())

# Logout then login with the NEW credentials
client.post('/api/logout')
r = client.post('/api/login', json={'username': TEST_USERNAME, 'password': TEST_PASSWORD})
check("old password no longer works", r.status_code == 401, r.get_json())

r = client.post('/api/login', json={'username': 'papsadmin', 'password': 'newpass42'})
check("new credentials login works", r.status_code == 200, r.get_json())

print("== 3. Reset all data ==")
r = client.post('/api/data/reset')
check("POST /api/data/reset works", r.status_code == 200 and r.get_json().get('success') is True, r.get_json())

conn = get_db_connection()
bookings_count = conn.execute('SELECT COUNT(*) FROM bookings').fetchone()[0]
conn.close()
check("bookings reset to seed count", bookings_count == len(DEFAULT_BOOKINGS), bookings_count)

print("== 4. Restore default credentials ==")
r = client.put('/api/admin/user', json={
    'currentPassword': 'newpass42',
    'newUsername': TEST_USERNAME,
    'newPassword': TEST_PASSWORD
})
check("credentials restored to defaults", r.status_code == 200, r.get_json())

print("== 5. Protected endpoints require authentication ==")
# Logout first
client.post('/api/logout')

# Test PUT /api/settings (update settings)
r = client.put('/api/settings', json={'business': {'brandName': 'Hacked'}})
check("PUT /api/settings requires auth (401)", r.status_code == 401, r.get_json())

# Test POST /api/settings/reset
r = client.post('/api/settings/reset')
check("POST /api/settings/reset requires auth (401)", r.status_code == 401, r.get_json())

# Test PUT /api/portfolio (save portfolio)
r = client.put('/api/portfolio', json=[])
check("PUT /api/portfolio requires auth (401)", r.status_code == 401, r.get_json())

# Test GET /api/data/messages
r = client.get('/api/data/messages')
check("GET /api/data/messages requires auth (401)", r.status_code == 401, r.get_json())

# Test PUT /api/data/messages
r = client.put('/api/data/messages', json=[])
check("PUT /api/data/messages requires auth (401)", r.status_code == 401, r.get_json())

# Test GET /api/data/finance
r = client.get('/api/data/finance')
check("GET /api/data/finance requires auth (401)", r.status_code == 401, r.get_json())

# Test GET /api/data/invoices
r = client.get('/api/data/invoices')
check("GET /api/data/invoices requires auth (401)", r.status_code == 401, r.get_json())

# Test GET /api/data/calendar
r = client.get('/api/data/calendar')
check("GET /api/data/calendar requires auth (401)", r.status_code == 401, r.get_json())

# Test PUT /api/bookings/<id>/status
r = client.put('/api/bookings/PAP-ABC123/status', json={'status': 'Confirmed'})
check("PUT /api/bookings/<id>/status requires auth (401)", r.status_code == 401, r.get_json())

# Test PUT /api/bookings/<id>/discount
r = client.put('/api/bookings/PAP-ABC123/discount', json={'discountPercent': 10})
check("PUT /api/bookings/<id>/discount requires auth (401)", r.status_code == 401, r.get_json())

# Test GET /api/bookings (all bookings)
r = client.get('/api/bookings')
check("GET /api/bookings requires auth (401)", r.status_code == 401, r.get_json())

# Test GET /api/bookings/<id> (single booking)
r = client.get('/api/bookings/PAP-ABC123')
check("GET /api/bookings/<id> requires auth (401)", r.status_code == 401, r.get_json())

print("== 6. Public endpoints remain accessible ==")
# These should still work without authentication
r = client.get('/api/settings')
check("GET /api/settings is public (200)", r.status_code == 200, r.get_json())

r = client.get('/api/portfolio')
check("GET /api/portfolio is public (200)", r.status_code == 200, r.get_json())

print("== 7. Public tracking endpoint ==")
# Test the new public tracking endpoint - should work without auth
r = client.get('/api/track/PAP-ABC123')
check("GET /api/track/<id> is public (200)", r.status_code == 200, r.get_json())

# Verify tracking endpoint only returns non-sensitive data
tracking_data = r.get_json()
check("Tracking does not expose email", 'email' not in tracking_data, tracking_data)
check("Tracking does not expose phone", 'phone' not in tracking_data, tracking_data)
check("Tracking does not expose amount", 'amount' not in tracking_data, tracking_data)
check("Tracking does not expose name", 'name' not in tracking_data, tracking_data)
check("Tracking returns service", 'service' in tracking_data, tracking_data)
check("Tracking returns status", 'status' in tracking_data, tracking_data)
check("Tracking returns date", 'date' in tracking_data, tracking_data)

# Test tracking endpoint with invalid ID
r = client.get('/api/track/INVALID-ID')
check("GET /api/track/<invalid> returns 404", r.status_code == 404, r.get_json())

print()
print(f"TOTAL: {PASS} passed, {FAIL} failed")
if FAIL:
    raise SystemExit(1)
print("ALL TESTS PASSED")