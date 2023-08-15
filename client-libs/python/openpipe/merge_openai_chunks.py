from typing import Any, Optional


def merge_openai_chunks(base: Optional[Any], chunk: Any) -> Any:
    if base is None:
        return merge_openai_chunks({**chunk, "choices": []}, chunk)

    choices = base["choices"].copy()
    for choice in chunk["choices"]:
        base_choice = next((c for c in choices if c["index"] == choice["index"]), None)

        if base_choice:
            base_choice["finish_reason"] = (
                choice.get("finish_reason") or base_choice["finish_reason"]
            )
            base_choice["message"] = base_choice.get("message") or {"role": "assistant"}

            if choice.get("delta") and choice["delta"].get("content"):
                base_choice["message"]["content"] = (
                    base_choice["message"].get("content") or ""
                ) + (choice["delta"].get("content") or "")
            if choice.get("delta") and choice["delta"].get("function_call"):
                fn_call = base_choice["message"].get("function_call") or {}
                fn_call["name"] = (fn_call.get("name") or "") + (
                    choice["delta"]["function_call"].get("name") or ""
                )
                fn_call["arguments"] = (fn_call.get("arguments") or "") + (
                    choice["delta"]["function_call"].get("arguments") or ""
                )
        else:
            # Here, we'll have to handle the omitted property "delta" manually
            new_choice = {k: v for k, v in choice.items() if k != "delta"}
            choices.append(
                {**new_choice, "message": {"role": "assistant", **choice["delta"]}}
            )

    return {
        **base,
        "choices": choices,
    }
