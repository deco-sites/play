export async function waitForPort(
  port: number,
  options: { listening?: boolean; timeout?: number } = {},
): Promise<void> {
  const { listening = true, timeout = 10000 } = options;
  const startTime = Date.now();
  while (true) {
    try {
      // Try to connect to the port
      const conn = await Deno.connect({ port, transport: "tcp" });
      conn.close();
      if (listening) {
        return;
      }
    } catch {
      if (!listening) {
        return;
      }
      // If connection fails, wait for a short time before trying again
    }
    // Check if timeout is reached
    if (Date.now() - startTime >= timeout) {
      throw new Error(
        `Timeout waiting for port ${port} to ${
          listening ? "be ready" : "be unavailable"
        }`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
