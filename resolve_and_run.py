import os
import subprocess
import sys

# Define the libraries we need to find
libs_to_find = [
    "libglib-2.0.so.0",
    "libnspr4.so",
    "libnss3.so",
    "libatk-1.0.so.0",
    "libcups.so.2",
    "libdrm.so.2",
    "libdbus-1.so.3",
    "libxcb.so.1",
    "libX11.so.6",
    "libXcomposite.so.1",
    "libXdamage.so.1",
    "libXext.so.6",
    "libXfixes.so.3",
    "libXrandr.so.2",
    "libgbm.so.1",
    "libpango-1.0.so.0",
    "libcairo.so.2",
    "libasound.so.2",
    "libatspi.so.0",
    "libgtk-3.so.0",
    "libgdk-3.so.0",
    "libxkbcommon.so.0",
    "libexpat.so.1"
]

# Known node path from previous search
node_path = "/nix/store/b3x7xvp565xqlj0whi2giwgbrplfwfpb-nodejs-22.16.0/bin"

print(f"Using Node path: {node_path}")

found_paths = set()

for lib in libs_to_find:
    print(f"Searching for {lib}...")
    try:
        # Using find with -quit to stop after first match to be faster
        cmd = f"find /nix/store -name {lib} -print -quit"
        result = subprocess.check_output(cmd, shell=True, text=True).strip()
        if result:
            lib_dir = os.path.dirname(result)
            found_paths.add(lib_dir)
            print(f"Found {lib} in {lib_dir}")
        else:
            print(f"Could not find {lib}")
    except subprocess.CalledProcessError:
        print(f"Error searching for {lib}")

# Construct LD_LIBRARY_PATH
ld_library_path = os.environ.get("LD_LIBRARY_PATH", "")
new_ld_path = ":".join(list(found_paths)) + ":" + ld_library_path

# Construct PATH
path = os.environ.get("PATH", "")
new_path = node_path + ":" + path

env = os.environ.copy()
env["LD_LIBRARY_PATH"] = new_ld_path
env["PATH"] = new_path

print("\nRunning Playwright test with updated environment...")
print(f"Extra LD_LIBRARY_PATH entries: {len(found_paths)}")

# Run the test
cmd = ["npx", "playwright", "test", "tests/e2e/prod-smoke-test.spec.ts"]
try:
    subprocess.run(cmd, env=env, check=True)
except subprocess.CalledProcessError as e:
    sys.exit(e.returncode)
