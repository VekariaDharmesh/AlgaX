import sys
import os

# Add the parent directory to sys.path so 'simulator' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
