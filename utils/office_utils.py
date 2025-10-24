import os
import shutil
import subprocess
from dotenv import load_dotenv

load_dotenv()


def libreoffice_path():
    """Find a usable LibreOffice executable."""

    # Try env override first
    lo_env = os.getenv('LIBREOFFICE_PATH')
    if lo_env and os.path.exists(lo_env):
        return lo_env

    # Default Homebrew cask location on macOS
    default = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    if os.path.exists(default):
        return default

    # Fallback to PATH
    return shutil.which('soffice') or shutil.which('libreoffice')


def convert_office_document(in_path, out_dir, out_format='pdf'):
    """Convert a document to the requested format using LibreOffice."""

    soffice = libreoffice_path()
    if not soffice:
        raise RuntimeError(
            'LibreOffice (soffice) not found. Install with: brew install --cask libreoffice'
        )

    os.makedirs(out_dir, exist_ok=True)

    # Map requested formats to LibreOffice filter strings when necessary.
    format_map = {
        'pdf': 'pdf',
        'doc': 'doc',
        'docx': 'docx',
        'odt': 'odt',
        'rtf': 'rtf',
        'txt': 'txt:Text',
        'html': 'html:XHTML Writer File'
    }

    target_format = format_map.get(out_format.lower(), out_format)

    before_files = set(os.listdir(out_dir))

    cmd = [
        soffice,
        '--headless',
        '--convert-to',
        target_format,
        '--outdir',
        out_dir,
        in_path
    ]

    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if cp.returncode != 0:
        raise RuntimeError(
            f"LibreOffice failed:\nSTDOUT:\n{cp.stdout}\nSTDERR:\n{cp.stderr}"
        )

    after_files = set(os.listdir(out_dir))
    new_files = sorted(after_files - before_files)

    if not new_files:
        base_name = os.path.splitext(os.path.basename(in_path))[0]
        expected = f"{base_name}.{out_format}"
        expected_lower = expected.lower()
        for filename in os.listdir(out_dir):
            if filename.lower() == expected_lower:
                new_files = [filename]
                break

    if not new_files:
        raise RuntimeError('Converted file not found in output directory.')

    # LibreOffice may sometimes drop/alter the base name; prefer files that start with it.
    base_name = os.path.splitext(os.path.basename(in_path))[0]
    base_name_lower = base_name.lower()
    preferred = [
        f for f in new_files if os.path.splitext(f)[0].lower() == base_name_lower
    ] or [
        f for f in new_files if f.lower().startswith(base_name_lower)
    ] or new_files

    out_filename = preferred[0]
    out_path = os.path.join(out_dir, out_filename)

    if not os.path.exists(out_path):
        raise RuntimeError('Converted file not found in output directory.')

    return out_path
