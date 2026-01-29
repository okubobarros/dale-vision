import argparse

from .settings import load_settings
from .lifecycle import run_agent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to agent.yaml")
    args = parser.parse_args()

    settings = load_settings(args.config)
    run_agent(settings)


if __name__ == "__main__":
    main()
