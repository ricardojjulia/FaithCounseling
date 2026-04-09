import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient
from azure.ai.agentserver.agentframework import from_agent_framework
from azure.identity import AzureCliCredential

try:
    from agent_framework.foundry import FoundryChatClient
except Exception:
    FoundryChatClient = None

try:
    from .tools import (
        bootstrap_locale,
        build_translation_challenge_dataset,
        evaluate_accepted_terms,
        evaluate_locale_integrity,
        prepare_locale_in_application,
        run_language_agent,
        run_browser_translation_challenge,
    )
except ImportError:
    if __package__ in {None, ""}:
        sys.path.append(str(Path(__file__).resolve().parents[2]))
    from agents.translation_guardian.tools import (
        bootstrap_locale,
        build_translation_challenge_dataset,
        evaluate_accepted_terms,
        evaluate_locale_integrity,
        prepare_locale_in_application,
        run_language_agent,
        run_browser_translation_challenge,
    )


def _create_chat_client():
    return None  # Temporarily bypass model configuration to prevent startup failure.


def create_agent() -> Agent:
    client = _create_chat_client()

    return Agent(
        client=client,
        name="translation-guardian",
        instructions=(
            "You are Translation Guardian for a production counseling app. "
            "Your mandate is to protect application stability while validating translation quality. "
            "Always require a language_or_locale argument and run run_language_agent first for create/review requests. "
            "Then, when asked to evaluate a locale in detail, run this sequence: "
            "1) prepare_locale_in_application, "
            "2) evaluate_locale_integrity, "
            "3) evaluate_accepted_terms, "
            "4) build_translation_challenge_dataset, "
            "5) run_browser_translation_challenge. "
            "Never remove existing translation keys. Never alter source locale content. "
            "Always return clear pass/warn/fail outcomes with concrete keys and terminology issues."
        ),
        tools=[
            prepare_locale_in_application,
            bootstrap_locale,
            evaluate_locale_integrity,
            evaluate_accepted_terms,
            build_translation_challenge_dataset,
            run_browser_translation_challenge,
            run_language_agent,
        ],
    )


def main() -> None:
    load_dotenv(override=False)
    agent = create_agent()
    print("Starting Translation Guardian on HTTP server mode...")
    from_agent_framework(agent).run()


if __name__ == "__main__":
    main()
