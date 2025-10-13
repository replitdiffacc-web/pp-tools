import os
import zipfile
import shutil
import subprocess
import tarfile

def has_7z():
    """Check if 7z is installed"""
    return shutil.which('7z') is not None

def has_unrar():
    """Check if unrar is installed"""
    return shutil.which('unrar') is not None

def extract_archive(archive_path, out_dir):
    """Extract various archive formats"""
    ext = os.path.splitext(archive_path)[1].lower()
    
    # Handle tar-based archives
    if 'tar' in archive_path.lower():
        with tarfile.open(archive_path, 'r:*') as tar:
            tar.extractall(out_dir)
        return out_dir
    
    # Handle zip
    if ext == '.zip':
        with zipfile.ZipFile(archive_path, 'r') as z:
            z.extractall(out_dir)
        return out_dir
    
    # Handle gz, bz2, xz (single file compression)
    if ext in ['.gz', '.bz2', '.xz', '.lz', '.lzma', '.z']:
        import gzip, bz2, lzma
        
        decompressors = {
            '.gz': gzip.open,
            '.bz2': bz2.open,
            '.xz': lzma.open,
            '.lzma': lzma.open,
        }
        
        if ext in decompressors:
            out_file = os.path.join(out_dir, os.path.basename(archive_path).replace(ext, ''))
            with decompressors[ext](archive_path, 'rb') as f_in:
                with open(out_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            return out_dir
    
    # Try 7z for everything else
    if has_7z():
        cmd = ['7z', 'x', f'-o{out_dir}', archive_path, '-y']
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return out_dir
        raise RuntimeError(f'7z extraction failed: {result.stderr}')
    
    # Try unrar for RAR files
    if ext == '.rar' and has_unrar():
        cmd = ['unrar', 'x', '-y', archive_path, out_dir]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return out_dir
        raise RuntimeError(f'unrar extraction failed: {result.stderr}')
    
    raise RuntimeError(f'No tool available to extract {ext} files. Install 7z or unrar.')

def create_archive(files_or_folder, out_path, archive_format='zip'):
    """Create various archive formats"""
    ext = archive_format.lower()
    
    # Handle zip
    if ext == 'zip':
        with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
            if os.path.isdir(files_or_folder):
                for root, _, files in os.walk(files_or_folder):
                    for f in files:
                        full = os.path.join(root, f)
                        arc = os.path.relpath(full, files_or_folder)
                        z.write(full, arcname=arc)
            else:
                for f in files_or_folder:
                    z.write(f, os.path.basename(f))
        return out_path
    
    # Handle tar-based archives
    if 'tar' in ext or ext in ['tgz', 'tbz2', 'tbz']:
        mode_map = {
            'tar': 'w',
            'tar.gz': 'w:gz',
            'tgz': 'w:gz',
            'tar.bz2': 'w:bz2',
            'tbz2': 'w:bz2',
            'tbz': 'w:bz2',
            'tar.xz': 'w:xz',
        }
        mode = mode_map.get(ext, 'w')
        
        with tarfile.open(out_path, mode) as tar:
            if os.path.isdir(files_or_folder):
                tar.add(files_or_folder, arcname=os.path.basename(files_or_folder))
            else:
                for f in files_or_folder:
                    tar.add(f, arcname=os.path.basename(f))
        return out_path
    
    # Try 7z for other formats
    if has_7z():
        cmd = ['7z', 'a', '-t' + ext, out_path]
        if os.path.isdir(files_or_folder):
            cmd.append(files_or_folder)
        else:
            cmd.extend(files_or_folder)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return out_path
        raise RuntimeError(f'7z archive creation failed: {result.stderr}')
    
    raise RuntimeError(f'No tool available to create {ext} archives. Install 7z.')

def zip_folder(folder_path, out_zip):
    """Legacy function - creates zip archive"""
    return create_archive(folder_path, out_zip, 'zip')

def unzip(zip_path, out_dir):
    """Legacy function - extracts zip archive"""
    return extract_archive(zip_path, out_dir)
