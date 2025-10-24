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
from utils.office_utils import convert_office_document
from utils.av_utils import convert_audio, convert_video, video_to_gif
from utils.ocr_utils import image_to_text, pdf_to_text
from utils.barcode_utils import make_qr, decode_codes
from utils.archive_utils import zip_folder, unzip, extract_archive, create_archive
from utils.image_manipulation import invert_image, text_to_image
from utils.ebook_utils import convert_ebook
from utils.presentation_utils import convert_presentation
from utils.spreadsheet_utils import convert_spreadsheet
from utils.vector_utils import convert_vector
from utils.font_utils import convert_font
from utils.cad_utils import convert_cad
import yt_dlp  # Import yt_dlp

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

    # Citations table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS citations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            source_type VARCHAR(50) NOT NULL,
            citation_style VARCHAR(50) NOT NULL,
            metadata JSONB NOT NULL,
            formatted_citation TEXT NOT NULL,
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
    task_id = request.form.get('task_id', str(uuid.uuid4()))

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

        total_files = len(files)

        # If single file, return the converted file directly
        if len(files) == 1:
            update_progress(task_id, 30, 'processing', 'Converting image...')
            file = files[0]
            temp_input = get_unique_filepath(file.filename)
            file.save(temp_input)

            update_progress(task_id, 60, 'processing', 'Processing conversion...')
            out_dir = tempfile.mkdtemp(dir=TMP, prefix='imgcvt_')
            out_path = convert_image(temp_input, out_dir, out_format, resize, quality)

            base_name = os.path.splitext(secure_filename(file.filename))[0]
            download_name = f"{base_name}.{out_format}"

            update_progress(task_id, 100, 'complete', 'Conversion complete')
            threading.Thread(target=cleanup_progress, args=(task_id,)).start()

            return send_file(out_path, as_attachment=True, download_name=download_name)

        # If multiple files, convert all and return as zip
        update_progress(task_id, 10, 'processing', f'Converting {total_files} images...')
        out_dir = tempfile.mkdtemp(dir=TMP, prefix='imgcvt_multi_')
        converted_files = []

        for i, file in enumerate(files):
            if file.filename == '':
                continue

            progress = 10 + int((i / total_files) * 70)
            update_progress(task_id, progress, 'processing', f'Converting {i+1}/{total_files}...')

            temp_input = get_unique_filepath(file.filename)
            file.save(temp_input)

            out_path = convert_image(temp_input, out_dir, out_format, resize, quality)
            converted_files.append(out_path)

        if not converted_files:
            update_progress(task_id, 0, 'error', 'No valid files provided')
            threading.Thread(target=cleanup_progress, args=(task_id,)).start()
            return jsonify({'error': 'No valid files provided'}), 400

        update_progress(task_id, 85, 'processing', 'Creating archive...')
        import zipfile
        zip_path = os.path.join(TMP, f'converted_images_{uuid.uuid4()}.zip')
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for img in converted_files:
                zipf.write(img, os.path.basename(img))

        update_progress(task_id, 100, 'complete', 'Conversion complete')
        threading.Thread(target=cleanup_progress, args=(task_id,)).start()

        return send_file(zip_path, as_attachment=True, download_name=f'converted_images_{out_format}.zip')
    except Exception as e:
        import traceback
        traceback.print_exc()
        update_progress(task_id, 0, 'error', str(e))
        threading.Thread(target=cleanup_progress, args=(task_id,)).start()
        print(f"Error in api_convert_image: {str(e)}")
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

@app.route('/api/office/convert', methods=['POST'])
@app.route('/api/office/to-pdf', methods=['POST'])
def api_office_convert():
    try:
        uploads = []

        if 'files' in request.files:
            uploads = [f for f in request.files.getlist('files') if f.filename]
        elif 'file' in request.files:
            file = request.files['file']
            if file.filename:
                uploads = [file]

        if not uploads:
            return jsonify({'error': 'No file provided'}), 400

        out_format = request.form.get('format', 'pdf').lower()
        out_dir = tempfile.mkdtemp(dir=TMP, prefix='office_convert_')

        converted_paths = []
        for upload in uploads:
            temp_input = get_unique_filepath(upload.filename)
            upload.save(temp_input)
            try:
                converted = convert_office_document(temp_input, out_dir, out_format=out_format)
                converted_paths.append(converted)
            finally:
                try:
                    os.remove(temp_input)
                except OSError:
                    pass

        if not converted_paths:
            return jsonify({'error': 'Conversion failed'}), 500

        if len(converted_paths) == 1:
            result = converted_paths[0]
            return send_file(result, as_attachment=True, download_name=os.path.basename(result))

        import zipfile

        zip_filename = f'converted_document_{out_format}.zip'
        zip_path = os.path.join(TMP, f"{uuid.uuid4()}_{zip_filename}")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for path in converted_paths:
                zipf.write(path, arcname=os.path.basename(path))

        return send_file(zip_path, as_attachment=True, download_name=zip_filename)
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

@app.route('/api/ebook/convert', methods=['POST'])
def api_convert_ebook():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'epub')
        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_format}')
        result = convert_ebook(temp_input, out_path, out_format)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/presentation/convert', methods=['POST'])
def api_convert_presentation():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'pdf')
        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_format}')
        result = convert_presentation(temp_input, out_path, out_format)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/spreadsheet/convert', methods=['POST'])
def api_convert_spreadsheet():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'xlsx')
        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_format}')
        result = convert_spreadsheet(temp_input, out_path, out_format)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vector/convert', methods=['POST'])
def api_convert_vector():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'svg')
        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_format}')
        result = convert_vector(temp_input, out_path, out_format)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/font/convert', methods=['POST'])
def api_convert_font():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'ttf')
        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_format}')
        result = convert_font(temp_input, out_path, out_format)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cad/convert', methods=['POST'])
def api_convert_cad():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        out_format = request.form.get('format', 'pdf')
        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        base = os.path.splitext(secure_filename(file.filename))[0]
        out_path = os.path.join(TMP, f'{base}_{uuid.uuid4()}.{out_format}')
        result = convert_cad(temp_input, out_path, out_format)
        return send_file(result, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations', methods=['GET'])
def get_citations():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT id, source_type, citation_style, metadata, formatted_citation, created_at FROM citations WHERE user_id = %s ORDER BY created_at DESC',
            (session['user_id'],)
        )
        citations = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify({'citations': citations})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations', methods=['POST'])
def save_citation():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.json
        source_type = data.get('source_type')
        citation_style = data.get('citation_style')
        metadata = data.get('metadata')
        formatted_citation = data.get('formatted_citation')

        if not all([source_type, citation_style, metadata, formatted_citation]):
            return jsonify({'error': 'Missing required fields'}), 400

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO citations (user_id, source_type, citation_style, metadata, formatted_citation) VALUES (%s, %s, %s, %s, %s) RETURNING id',
            (session['user_id'], source_type, citation_style, metadata, formatted_citation)
        )
        citation_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'success': True, 'citation_id': citation_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations/<int:citation_id>', methods=['DELETE'])
def delete_citation(citation_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'DELETE FROM citations WHERE id = %s AND user_id = %s',
            (citation_id, session['user_id'])
        )
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations/<int:citation_id>', methods=['PUT'])
def update_citation(citation_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.json
        source_type = data.get('source_type')
        citation_style = data.get('citation_style')
        metadata = data.get('metadata')
        formatted_citation = data.get('formatted_citation')

        if not all([source_type, citation_style, metadata, formatted_citation]):
            return jsonify({'error': 'Missing required fields'}), 400

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'UPDATE citations SET source_type = %s, citation_style = %s, metadata = %s, formatted_citation = %s WHERE id = %s AND user_id = %s',
            (source_type, citation_style, metadata, formatted_citation, citation_id, session['user_id'])
        )
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations/fetch-metadata', methods=['POST'])
def fetch_url_metadata():
    try:
        data = request.json
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        import requests
        from bs4 import BeautifulSoup
        from datetime import datetime

        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if not parsed.netloc or not '.' in parsed.netloc:
                return jsonify({'error': 'Invalid URL format. Please enter a valid website URL.'}), 400
        except:
            return jsonify({'error': 'Invalid URL format. Please enter a valid website URL.'}), 400

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        metadata = {
            'url': url,
            'title': None,
            'author': None,
            'publishDate': None,
            'accessDate': datetime.now().strftime('%Y-%m-%d')
        }

        # Extract title
        title_tag = soup.find('meta', property='og:title') or soup.find('title')
        if title_tag:
            metadata['title'] = title_tag.get('content') if title_tag.get('content') else title_tag.get_text()

        # Extract author
        author_tag = (
            soup.find('meta', attrs={'name': 'author'}) or
            soup.find('meta', property='article:author') or
            soup.find('meta', attrs={'name': 'citation_author'})
        )
        if author_tag:
            metadata['author'] = author_tag.get('content')

        # Extract publish date
        date_tag = (
            soup.find('meta', property='article:published_time') or
            soup.find('meta', attrs={'name': 'publication_date'}) or
            soup.find('meta', attrs={'name': 'date'}) or
            soup.find('meta', property='og:updated_time')
        )
        if date_tag:
            date_str = date_tag.get('content')
            try:
                # Try to parse ISO format date
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                metadata['publishDate'] = parsed_date.strftime('%Y-%m-%d')
            except:
                metadata['publishDate'] = date_str

        return jsonify(metadata)
    except requests.RequestException as e:
        return jsonify({'error': f'Failed to fetch URL: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/citations/export', methods=['POST'])
def export_citations():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.json
        citation_ids = data.get('citation_ids', [])
        export_format = data.get('format', 'txt')

        if not citation_ids:
            return jsonify({'error': 'No citations selected'}), 400

        conn = get_db()
        cur = conn.cursor()

        placeholders = ','.join(['%s'] * len(citation_ids))
        cur.execute(
            f'SELECT formatted_citation FROM citations WHERE id IN ({placeholders}) AND user_id = %s',
            (*citation_ids, session['user_id'])
        )
        citations = cur.fetchall()
        cur.close()
        conn.close()

        if not citations:
            return jsonify({'error': 'No citations found'}), 404

        content = '\n\n'.join([c['formatted_citation'] for c in citations])

        import io
        output = io.BytesIO()
        output.write(content.encode('utf-8'))
        output.seek(0)

        return send_file(
            output,
            as_attachment=True,
            download_name=f'citations.{export_format}',
            mimetype='text/plain'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

import threading
import time
import json

# Global progress tracking
conversion_progress = {}
download_progress = {}  # For YouTube downloads

def update_progress(task_id, progress, status='processing', message=''):
    """Update progress for a task"""
    conversion_progress[task_id] = {
        'progress': progress,
        'status': status,
        'message': message
    }

def cleanup_progress(task_id):
    """Clean up progress data after a delay"""
    time.sleep(5)
    if task_id in conversion_progress:
        del conversion_progress[task_id]
    if task_id in download_progress:
        del download_progress[task_id]


@app.route('/api/progress/<task_id>')
def get_progress(task_id):
    """Generic progress endpoint for all conversions"""
    def generate():
        while True:
            if task_id in conversion_progress:
                data = conversion_progress[task_id]
                yield f"data: {json.dumps(data)}\n\n"
                if data.get('status') in ['complete', 'error']:
                    break
            time.sleep(0.3)

    return app.response_class(generate(), mimetype='text/event-stream')

@app.route('/api/youtube/progress/<task_id>')
def youtube_progress(task_id):
    """YouTube-specific progress endpoint"""
    def generate():
        while True:
            if task_id in download_progress:
                data = download_progress[task_id]
                yield f"data: {json.dumps(data)}\n\n"
                if data.get('status') in ['complete', 'error']:
                    break
            time.sleep(0.3)

    return app.response_class(generate(), mimetype='text/event-stream')

@app.route('/api/capture/<format_type>', methods=['POST'])
def capture_website(format_type):
    data = request.json
    url = data.get('url')
    task_id = data.get('task_id')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        if task_id:
            update_progress(task_id, 10, 'processing', 'Capturing website...')

        import subprocess
        output_path = os.path.join(TMP, f'capture_{uuid.uuid4().hex}')

        if format_type == 'pdf':
            if task_id:
                update_progress(task_id, 50, 'processing', 'Converting to PDF...')
            subprocess.run(['wkhtmltopdf', url, f'{output_path}.pdf'], check=True, capture_output=True)
            final_path = f'{output_path}.pdf'
            mimetype = 'application/pdf'
        else:
            if task_id:
                update_progress(task_id, 50, 'processing', f'Taking {format_type.upper()} screenshot...')
            subprocess.run(['wkhtmltoimage', '--format', format_type, url, f'{output_path}.{format_type}'], check=True, capture_output=True)
            final_path = f'{output_path}.{format_type}'
            mimetype = f'image/{format_type}'

        if task_id:
            update_progress(task_id, 100, 'complete', 'Capture complete')

        response = send_file(final_path, as_attachment=True, download_name=f'website.{format_type}', mimetype=mimetype)

        @response.call_on_close
        def cleanup():
            threading.Thread(target=cleanup_progress, args=(task_id,)).start()
            try:
                if os.path.exists(final_path):
                    os.remove(final_path)
            except Exception as e:
                print(f"Error during cleanup: {e}")

        return response

    except subprocess.CalledProcessError as e:
        if task_id:
            update_progress(task_id, 0, 'error', f'Capture error: {str(e)}')
        return jsonify({'error': f'Capture failed: {str(e)}'}), 400
    except Exception as e:
        if task_id:
            update_progress(task_id, 0, 'error', str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/optimize/<tool>', methods=['POST'])
def optimize_file(tool):
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    task_id = request.form.get('task_id')

    try:
        if task_id:
            update_progress(task_id, 20, 'processing', 'Optimizing file...')

        temp_input = get_unique_filepath(file.filename)
        file.save(temp_input)

        if task_id:
            update_progress(task_id, 60, 'processing', 'Compressing...')

        # Simple compression using Pillow for images
        from PIL import Image

        if tool == 'compress-pdf':
            # For PDF, we'll use basic optimization
            import PyPDF2
            reader = PyPDF2.PdfReader(temp_input)
            writer = PyPDF2.PdfWriter()

            for page in reader.pages:
                writer.add_page(page)

            output_path = os.path.join(TMP, f'compressed_{uuid.uuid4()}.pdf')
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
        else:
            # For images
            img = Image.open(temp_input)
            output_path = os.path.join(TMP, f'compressed_{uuid.uuid4()}.{tool.split("-")[1]}')

            if tool == 'compress-png':
                img.save(output_path, 'PNG', optimize=True, compress_level=9)
            elif tool in ['compress-jpg', 'compress-jpeg']:
                img.save(output_path, 'JPEG', optimize=True, quality=85)

        if task_id:
            update_progress(task_id, 100, 'complete', 'Compression complete')

        response = send_file(output_path, as_attachment=True)

        @response.call_on_close
        def cleanup():
            threading.Thread(target=cleanup_progress, args=(task_id,)).start()
            try:
                if os.path.exists(temp_input):
                    os.remove(temp_input)
                if os.path.exists(output_path):
                    os.remove(output_path)
            except Exception as e:
                print(f"Error during cleanup: {e}")

        return response

    except Exception as e:
        if task_id:
            update_progress(task_id, 0, 'error', str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/youtube/download', methods=['POST'])
def youtube_download():
    data = request.json or {}
    url = data.get('url')
    format_type = data.get('format', 'mp4')
    task_id = data.get('task_id')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        if task_id:
            download_progress[task_id] = {'progress': 0, 'status': 'starting', 'message': 'Initializing download...'}

        output_path = os.path.join(TMP, f'yt_{uuid.uuid4().hex}')

        def progress_hook(d):
            if task_id and d['status'] == 'downloading':
                try:
                    percent = d.get('_percent_str', '0%').strip().replace('%', '')
                    progress = float(percent)
                    download_progress[task_id] = {'progress': progress, 'status': 'downloading', 'message': f'Downloading... {int(progress)}%'}
                except Exception as e:
                    print(f"Error in progress hook: {e}")
                    download_progress[task_id] = {'progress': 0, 'status': 'error', 'message': f'Progress tracking failed: {str(e)}'}
            elif task_id and d['status'] == 'finished':
                download_progress[task_id] = {'progress': 95, 'status': 'processing', 'message': 'Processing...'}

        base_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
            'outtmpl': output_path,
            'merge_output_format': 'mp4',
            'concurrent_fragment_downloads': 8,
            'http_chunk_size': 10485760,
            'retries': 10,
            'fragment_retries': 10,
            'progress_hooks': [progress_hook] if task_id else [],
            'quiet': True,
            'no_warnings': True,
            'sleep_interval': 2,
            'max_sleep_interval': 5
        }
        client_profiles = [
            {
                'http_headers': {
                    'User-Agent': 'com.google.android.youtube/18.17.36 (Linux; U; Android 13; en_US) gzip',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'X-YouTube-Client-Name': '3',
                    'X-YouTube-Client-Version': '18.17.36',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android'],
                        'skip': ['dash', 'configs']
                    }
                }
            },
            {
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web']
                    }
                }
            },
            {
                'http_headers': {
                    'User-Agent': 'YouTube/18.15.1 CFNetwork/1240.0.4 Darwin/20.6.0',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'X-YouTube-Client-Name': '5',
                    'X-YouTube-Client-Version': '18.15.1',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['ios'],
                        'skip': ['dash', 'configs']
                    }
                }
            }
        ]

        info = None
        last_error = None

        for profile in client_profiles:
            try:
                ydl_opts = {**base_opts, 'http_headers': profile['http_headers'], 'extractor_args': profile['extractor_args']}
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                break
            except yt_dlp.utils.DownloadError as profile_error:
                last_error = profile_error
                error_message = str(profile_error).lower()
                if 'sign in to confirm you' not in error_message and 'please sign in' not in error_message:
                    break

        if info is None and last_error:
            raise last_error

        title = info.get('title', 'download')

        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_title = safe_title[:50] if len(safe_title) > 50 else safe_title

        if format_type == 'mp3':
            filename = f"{safe_title}.mp3"
            final_path = output_path + '.mp3'
        else:
            filename = f"{safe_title}.mp4"
            final_path = output_path + '.mp4'

        # Try to find the actual downloaded file
        actual_file_found = False
        for ext in ['.mp4', '.mkv', '.webm', '.mp3', '.m4a']:  # Add common video/audio extensions
            potential_path = f"{output_path}{ext}"
            if os.path.exists(potential_path):
                final_path = potential_path
                actual_file_found = True
                break

        if not actual_file_found:
            # Fallback if the exact extension wasn't found but download should be complete
            if os.path.exists(output_path):
                final_path = output_path
            else:
                raise Exception("Output file not found after download.")

        if task_id:
            download_progress[task_id] = {'progress': 100, 'status': 'complete', 'message': 'Download complete'}

        response = send_file(
            final_path,
            as_attachment=True,
            download_name=filename,
            mimetype='video/mp4' if format_type == 'mp4' else 'audio/mpeg'
        )

        response.headers['X-Task-ID'] = task_id  # Add task_id to response headers for client-side tracking

        @response.call_on_close
        def cleanup():
            if task_id:
                threading.Thread(target=cleanup_progress, args=(task_id,)).start()
            try:
                if os.path.exists(final_path):
                    os.remove(final_path)
                # Clean up other potential temporary files
                for ext in ['.part', '.ytdl', '.mp4', '.mkv', '.webm', '.mp3', '.m4a']:
                    temp_file = f"{output_path}{ext}"
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
            except Exception as e:
                print(f"Error during cleanup: {e}")

        return response

    except yt_dlp.utils.DownloadError as e:
        if task_id:
            download_progress[task_id] = {'progress': 0, 'status': 'error', 'message': f'yt-dlp error: {str(e)}'}
        return jsonify({'error': f'Download failed: {str(e)}'}), 400
    except Exception as e:
        if task_id:
            download_progress[task_id] = {'progress': 0, 'status': 'error', 'message': str(e)}
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
