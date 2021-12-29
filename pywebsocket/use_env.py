import json
import os
import pathlib
from typing import Dict


def load_env():
    try:
        env_path = pathlib.Path('../.env')
        if env_path.exists():
            text = env_path.read_text(encoding='utf-8')
            environment_variables: Dict[str, str] = json.loads(text)
            for key in environment_variables.keys():
                value = environment_variables[key]
                os.environ[key] = value
    except Exception as ex:
        print(ex)
