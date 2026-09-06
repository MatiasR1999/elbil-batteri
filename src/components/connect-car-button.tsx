"use client";

import { useState } from "react";

type ConnectMode = "simulated" | "live";

export function ConnectCarButton({
  defaultMode = "simulated",
}: {
  defaultMode?: ConnectMode;
}) {
  const [mode, setMode] = useState<ConnectMode>(defaultMode);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function connect() {
    setError("");
    setIsPending(true);

    try {
      const response = await fetch("/api/smartcar/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Smartcar Connect kunne ikke startes.");
      }

      window.location.assign(result.url);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Smartcar Connect kunne ikke startes.",
      );
      setIsPending(false);
    }
  }

  return (
    <div className="connect-control">
      <label htmlFor="connect-mode">Smartcar-miljø</label>
      <div className="connect-fields">
        <select
          id="connect-mode"
          onChange={(event) => setMode(event.target.value as ConnectMode)}
          value={mode}
        >
          <option value="simulated">Simulert bil</option>
          <option value="live">Ekte bil</option>
        </select>
        <button
          className="button button-accent"
          disabled={isPending}
          onClick={connect}
          type="button"
        >
          {isPending ? "Åpner Smartcar …" : "Koble til bilen"}
        </button>
      </div>
      {error ? <p className="form-message form-error">{error}</p> : null}
    </div>
  );
}
