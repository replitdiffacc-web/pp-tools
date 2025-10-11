from flask import Flask, request, send_file, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
import tempfile
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from utils.image_utils import convert_image, images_to_pdf as imgs_to_pdf
from utils.pdf_utils import pdf_to_images, merge_pdfs
from utils.office_utils import office_to_pdf
from utils.av_utils import convert_audio, convert_video, video_to_gif
from utils.ocr_utils import image_to_text, pdf_to_text
from utils.barcode_utils import make_qr, decode_codes
from utils.archive_utils import zip_folder, unzip
from utils.image_manipulation import invert_image, text_to_image

app = Flask(__name__, static_folder='dist', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

if os.environ.get('ENABLE_CORS', 'false').lower() == 'true':
    CORS(app, supports_credentials=True)

TMP = tempfile.gettempdir()

def get_db():
    return psycopg2.connect(os.environ.get('DATABASE_URL'), cursor_factory=RealDictCursor)

def init_db():
    conn = get_db()
    cur = conn.cursor()

    # Users table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Download history table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS download_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            original_filename VARCHAR(255) NOT NULL,
            output_filename VARCHAR(255) NOT NULL,
            conversion_type VARCHAR(50) NOT NULL,
            file_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    cur.close()
    conn.close()

# Initialize database on startup
try:
    init_db()
except Exception as e:
    print(f"Database initialization error: {e}")

def get_unique_filepath(original_filename):
    safe_name = secure_filename(original_filename)
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    return os.path.join(TMP, unique_name)

def save_download_history(user_id, original_filename, output_filename, conversion_type, file_data=None):
    if not user_id:
        return
    try:
        import base64
        conn = get_db()
        cur = conn.cursor()
        
        file_url = None
        if file_data:
            # Store as base64 data URL
            file_url = f"data:application/octet-stream;base64,{base64.b64encode(file_data).decode()}"
        
        cur.execute(
            'INSERT INTO download_history (user_id, original_filename, output_filename, conversion_type, file_url) VALUES (%s, %s, %s, %s, %s)',
            (user_id, original_filename, output_filename, conversion_type, file_url)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error saving download history: {e}")

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        conn = get_db()
        cur = conn.cursor()

        # Check if user exists
        cur.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Email already registered'}), 400

        # Create user
        password_hash = generate_password_hash(password)
        cur.execute(
            'INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id',
            (email, password_hash)
        )
        user_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()

        session['user_id'] = user_id
        session['email'] = email

        return jsonify({'success': True, 'email': email})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT id, password_hash FROM users WHERE email = %s', (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid email or password'}), 401

        session['user_id'] = user['id']
        session['email'] = email

        return jsonify({'success': True, 'email': email})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    if 'user_id' in session:
        return jsonify({'email': session.get('email')})
    return jsonify({'email': None})

@app.route('/api/history', methods=['GET'])
def get_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT id, original_filename, output_filename, conversion_type, file_url, created_at FROM download_history WHERE user_id = %s ORDER BY created_at DESC LIMIT 50',
            (session['user_id'],)
        )
        history = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/save', methods=['POST'])
def save_to_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        original_filename = request.form.get('original_filename')
        output_filename = request.form.get('output_filename')
        conversion_type = request.form.get('conversion_type')

        if not all([original_filename, output_filename, conversion_type]):
            return jsonify({'error': 'Missing required fields'}), 400

        file_data = None
        if 'file' in request.files:
            file_data = request.files['file'].read()
        elif 'files' in request.files:
            # Handle multiple files - save as zip
            files = request.files.getlist('files')
            import zipfile
            import io
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w') as zipf:
                for f in files:
                    zipf.writestr(f.filename, f.read())
            file_data = zip_buffer.getvalue()

        save_download_history(session['user_id'], original_filename, output_filename, conversion_type, file_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<int:history_id>', methods=['DELETE'])
def delete_history(history_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'DELETE FROM download_history WHERE id = %s AND user_id = %s',
            (history_id, session['user_id'])
        )
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/image/convert', methods=['POST'])
def api_convert_image():
    try:
        # Check if multiple files or single file
        if 'files' in request.files:
            files = request.files.getlist('files')
        elif 'file' in request.files:
            files = [request.files['file']]
        else:
            return jsonify({'error': 'No file provided'}), 400

        if not files or all(f.filename == '' for f in files):
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'png')
        width = request.form.get('width')
        height = request.form.get('height')
        quality = int(request.form.get('quality', 90))

        resize = None
        if width and height:
            resize = (int(width), int(height))

        # If single file, return the converted file directly
        if len(files) == 1:
            file = files[0]
            temp_input = get_unique_filepath(file.filename)
            file.save(temp_input)

            out_dir = tempfile.mkdtemp(dir=TMP, prefix='imgcvt_')
            out_path = convert_image(temp_input, out_dir, out_format, resize, quality)

            base_name = os.path.splitext(secure_filename(file.filename))[0]
            download_name = f"{base_name}.{out_format}"

            return send_file(out_path, as_attachment=True, download_name=download_name)
        
        # If multiple files, convert all and return as zip
        out_dir = tempfile.mkdtemp(dir=TMP, prefix='imgcvt_multi_')
        converted_files = []

        for file in files:
            if file.filename == '':
                continue
            
            temp_input = get_unique_filepath(file.filename)
            file.save(temp_input)

            out_path = convert_image(temp_input, out_dir, out_format, resize, quality)
            converted_files.append(out_path)

        if not converted_files:
            return jsonify({'error': 'No valid files provided'}), 400

        import zipfile
        zip_path = os.path.join(TMP, f'converted_images_{uuid.uuid4()}.zip')
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for img in converted_files:
                zipf.write(img, os.path.basename(img))

        return send_file(zip_path, as_attachment=True, download_name=f'converted_images_{out_format}.zip')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/image/to-pdf', methods=['POST'])
def api_images_to_pdf():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files selected'}), 400

        temp_files = []

        for file in files:
            if file.filename == '':
                continue
            temp_path = get_unique_filepath(file.filename)
            file.save(temp_path)
            temp_files.append(temp_path)

        if not temp_files:
            return jsonify({'error': 'No valid files provided'}), 400

        out_pdf = os.path.join(TMP, f'images_to_pdf_{uuid.uuid4()}.pdf')
        result = imgs_to_pdf(temp_files, out_pdf)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf/to-images', methods=['POST'])
def api_pdf_to_images():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        dpi = int(request.form.get('dpi', 200))
        fmt = request.form.get('format', 'png')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        out_dir = tempfile.mkdtemp(dir=TMP, prefix='pdfimg_')
        images = pdf_to_images(temp_input, out_dir, dpi=dpi, fmt=fmt)

        import zipfile
        zip_path = os.path.join(TMP, f'pdf_images_{uuid.uuid4()}.zip')
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for img in images:
                zipf.write(img, os.path.basename(img))

        return send_file(zip_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf/merge', methods=['POST'])
def api_merge_pdfs():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files selected'}), 400

        temp_files = []

        for file in files:
            if file.filename == '':
                continue
            temp_path = get_unique_filepath(file.filename)
            file.save(temp_path)
            temp_files.append(temp_path)

        if not temp_files:
            return jsonify({'error': 'No valid files provided'}), 400

        out_pdf = os.path.join(TMP, f'merged_{uuid.uuid4()}.pdf')
        result = merge_pdfs(temp_files, out_pdf)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/office/to-pdf', methods=['POST'])
def api_office_to_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        out_dir = tempfile.mkdtemp(dir=TMP, prefix='office2pdf_')
        result = office_to_pdf(temp_input, out_dir)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/audio/convert', methods=['POST'])
def api_convert_audio():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_ext = request.form.get('format', 'mp3')
        bitrate = request.form.get('bitrate', '192k')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_ext}')
        result = convert_audio(temp_input, out_path, bitrate=bitrate)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/video/convert', methods=['POST'])
def api_convert_video():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_ext = request.form.get('format', 'mp4')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_ext}')
        result = convert_video(temp_input, out_path)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/video/to-gif', methods=['POST'])
def api_video_to_gif():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        fps = int(request.form.get('fps', 12))
        width = request.form.get('width')
        height = request.form.get('height')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.gif')

        scale = None
        if width and height:
            scale = (int(width), int(height))

        result = video_to_gif(temp_input, out_path, fps=fps, scale=scale)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ocr/image', methods=['POST'])
def api_image_ocr():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        lang = request.form.get('lang', 'eng')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        text = image_to_text(temp_input, lang)
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ocr/pdf', methods=['POST'])
def api_pdf_ocr():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        lang = request.form.get('lang', 'eng')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        text = pdf_to_text(temp_input, lang)
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/qr/generate', methods=['POST'])
def api_generate_qr():
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.json.get('data', '')
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        out_path = os.path.join(TMP, f'qrcode_{uuid.uuid4()}.png')
        result = make_qr(data, out_path)
        return send_file(result, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/qr/decode', methods=['POST'])
def api_decode_codes():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        results = decode_codes(temp_input)
        return jsonify({'codes': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/image/invert', methods=['POST'])
def api_invert_image():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        out_dir = tempfile.mkdtemp(dir=TMP, prefix='invert_')
        out_path = invert_image(temp_input, out_dir)

        base_name = os.path.splitext(secure_filename(file.filename))[0]
        return send_file(out_path, as_attachment=True, download_name=f"{base_name}_inverted.png")
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/text/to-image', methods=['POST'])
def api_text_to_image():
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        width = int(data.get('width', 800))
        height = int(data.get('height', 600))
        font_size = int(data.get('font_size', 24))

        out_path = os.path.join(TMP, f'text_image_{uuid.uuid4()}.png')
        result = text_to_image(text, out_path, width, height, font_size)
        return send_file(result, as_attachment=True, download_name='text_image.png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/archive/zip', methods=['POST'])
def api_zip_folder():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files selected'}), 400

        folder_name = secure_filename(request.form.get('folder_name', 'folder'))

        temp_folder = os.path.join(TMP, f'{folder_name}_{uuid.uuid4()}')
        os.makedirs(temp_folder, exist_ok=True)

        for file in files:
            if file.filename == '':
                continue
            safe_name = secure_filename(file.filename)
            file.save(os.path.join(temp_folder, safe_name))

        out_zip = os.path.join(TMP, f"{folder_name}_{uuid.uuid4()}.zip")
        result = zip_folder(temp_folder, out_zip)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/archive/unzip', methods=['POST'])
def api_unzip():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        out_dir = os.path.join(TMP, f'unzipped_{uuid.uuid4()}')
        os.makedirs(out_dir, exist_ok=True)
        result_dir = unzip(temp_input, out_dir)

        import zipfile
        zip_path = os.path.join(TMP, f'extracted_files_{uuid.uuid4()}.zip')
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for root, dirs, files in os.walk(result_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, os.path.relpath(file_path, result_dir))

        return send_file(zip_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'converter-api'}), 200

@app.route('/ready', methods=['GET'])
def ready():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT 1')
        cur.close()
        conn.close()
        return jsonify({'status': 'ready', 'database': 'connected'}), 200
    except Exception as e:
        return jsonify({'status': 'not ready', 'error': str(e)}), 503

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        response = send_from_directory(app.static_folder, 'index.html')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)