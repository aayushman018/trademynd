import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config("alembic.ini")
    command.revision(alembic_cfg, autogenerate=True, message="Add conversational fields")
    print("Migration generated successfully!")
except Exception as e:
    print(f"Error: {e}")
