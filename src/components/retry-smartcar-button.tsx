"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetrySmartcarButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function retry() {
    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/smartcar/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });
      const result = (await response.json()) as {
        status?: "pending" | "completed";
        connectionCount?: number;
        message?: string;
        error?: string;
      };

      if (!response.ok && response.status !== 202) {
        throw new Error(result.error ?? "Synkroniseringen feilet.");
      }

      if (result.status === "completed") {
        router.replace(
          `/app?smartcar=connected&count=${result.connectionCount ?? 1}`,
        );
        router.refresh();
        return;
      }

      setMessage(
        result.message ??
          "Tilkoblingen er fortsatt ikke synlig. Prøv igjen om litt.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Synkroniseringen feilet.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="retry-control">
      <button
        className="button button-quiet"
        disabled={isPending}
        onClick={retry}
        type="button"
      >
        {isPending ? "Synkroniserer …" : "Prøv synkronisering på nytt"}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}
