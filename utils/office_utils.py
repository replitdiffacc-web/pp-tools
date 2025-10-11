import os, shutil, subprocess
from dotenv import load_dotenv
load_dotenv()

def libreoffice_path():
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

def office_to_pdf(in_path, out_dir):
    soffice = libreoffice_path()
    if not soffice:
        raise RuntimeError('LibreOffice (soffice) not found. Install with: brew install --cask libreoffice')
    cmd = [soffice, '--headless', '--convert-to', 'pdf', '--outdir', out_dir, in_path]
    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if cp.returncode != 0:
        raise RuntimeError(f"LibreOffice failed:\nSTDOUT:\n{cp.stdout}\nSTDERR:\n{cp.stderr}")
    # Find output
    base = os.path.splitext(os.path.basename(in_path))[0] + '.pdf'
    out_path = os.path.join(out_dir, base)
    if not os.path.exists(out_path):
        # LO sometimes writes with uppercase/lowercase tweaks
        for f in os.listdir(out_dir):
            if f.lower() == base.lower():
                out_path = os.path.join(out_dir, f); break
    if not os.path.exists(out_path):
        raise RuntimeError('Converted PDF not found in output directory.')
    return out_path
