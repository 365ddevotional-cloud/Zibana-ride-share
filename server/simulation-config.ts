export const SIMULATION_ENGINE_LOCKED = true;

export function getSimulationConfig() {
  const enabled = process.env.SIMULATION_MODE_ENABLED === "true";
  const codeLength = parseInt(process.env.SIMULATION_CODE_LENGTH || "9", 10);
  const expiresMinutes = parseInt(process.env.SIMULATION_EXPIRES_MINUTES || "60", 10);

  return { enabled, codeLength, expiresMinutes };
}

export function assertSimulationEnabled(): void {
  const { enabled } = getSimulationConfig();
  if (!enabled) {
    throw new SimulationDisabledError();
  }
}

export class SimulationDisabledError extends Error {
  status = 403;
  constructor() {
    super("Simulation Mode is disabled at system level.");
  }
}

export function logSimulationStatus(): void {
  const { enabled, codeLength, expiresMinutes } = getSimulationConfig();
  if (enabled) {
    console.log(`[SIMULATION MODE] ENABLED — code length: ${codeLength}, default expiry: ${expiresMinutes}min`);
  } else {
    console.log("[SIMULATION MODE] DISABLED");
  }
}
