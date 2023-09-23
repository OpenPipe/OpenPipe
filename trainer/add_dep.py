#!/usr/bin/env python3

import json
from urllib.request import urlopen
import subprocess
import sys


def get_latest_version(package_name):
    url = f"https://pypi.org/pypi/{package_name}/json"
    try:
        with urlopen(url) as response:
            data = json.load(response)
            return data["info"]["version"]
    except Exception as e:
        print(f"Failed to fetch information for {package_name}. Error: {e}")
        sys.exit(1)


def append_to_requirements(package_name, version):
    with open("requirements.txt", "a") as f:
        f.write(f"{package_name}=={version}\n")


def install_requirements():
    subprocess.run(
        f"{sys.executable} -m pip install -r requirements.txt", shell=True, check=True
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: ./add_dep.py package1 package2 ...")
        sys.exit(1)

    for package_name in sys.argv[1:]:
        latest_version = get_latest_version(package_name)
        append_to_requirements(package_name, latest_version)
        print(f"Added {package_name}=={latest_version}")

    install_requirements()
    print("Installation complete.")
