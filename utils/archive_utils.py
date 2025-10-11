import os, zipfile, shutil

def zip_folder(folder_path, out_zip):
    with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(folder_path):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, folder_path)
                z.write(full, arcname=arc)
    return out_zip

def unzip(zip_path, out_dir):
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(out_dir)
    return out_dir
