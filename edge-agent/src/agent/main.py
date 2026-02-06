import argparse

from .settings import load_settings
from .lifecycle import run_agent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to agent.yaml")
    parser.add_argument(
        "--heartbeat-only",
        action="store_true",
        help="Run only heartbeat loop (skip vision pipeline)",
    )
    args = parser.parse_args()

    settings = load_settings(args.config)
    run_agent(settings, heartbeat_only=args.heartbeat_only)


if __name__ == "__main__":
    main()
