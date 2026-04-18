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
    foundry_endpoint = os.getenv("FOUNDRY_PROJECT_ENDPOINT")
    foundry_model = os.getenv("FOUNDRY_MODEL_DEPLOYMENT_NAME") or os.getenv("AZURE_AI_MODEL_DEPLOYMENT_NAME")

    if foundry_endpoint and foundry_model and FoundryChatClient is not None:
        return FoundryChatClient(
            project_endpoint=foundry_endpoint,
            model=foundry_model,
            credential=AzureCliCredential(),
        )

    openai_key = os.getenv("OPENAI_API_KEY")
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    if openai_key:
        return OpenAIChatClient(model=openai_model, api_key=openai_key)

    return None


def create_agent() -> Agent:
    client = _create_chat_client()
    if client is None:
        raise RuntimeError("No model client available — call main() which handles the unconfigured case.")

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
    client = _create_chat_client()
    if client is None:
        print(
            "\n  Translation Guardian: no model configured — skipping startup.\n"
            "\n"
            "  To enable, set one of the following in .env:\n"
            "    OPENAI_API_KEY=sk-...                          (+ optional OPENAI_MODEL)\n"
            "    FOUNDRY_PROJECT_ENDPOINT + FOUNDRY_MODEL_DEPLOYMENT_NAME\n"
            "\n"
            "  The Translation Guardian provides browser-level visual verification\n"
            "  before promoting a locale to 'complete'. It is not required for\n"
            "  machine translation — use `pnpm i18n:translate <locale>` instead.\n"
        )
        sys.exit(0)

    agent = create_agent()
    print("Starting Translation Guardian on HTTP server mode...")
    from_agent_framework(agent).run()


if __name__ == "__main__":
    main()
