// prismaClient.js
import { PrismaClient } from "@prisma/client";

let prismaInstance = null;

/**
 * Returns the global PrismaClient instance.
 * Initializes it if it doesn't exist yet.
 * @param {object} [options] - Optional PrismaClient constructor options (e.g., datasources).
 * @returns {PrismaClient}
 */
function getPrismaClient(options) {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient(options);
    // You might want to connect here or let the first query do it.
    // prismaInstance.$connect().catch(e => console.error("Failed to connect initial Prisma instance", e));
  }
  return prismaInstance;
}

/**
 * Disconnects the current global PrismaClient instance (if any)
 * and initializes a new one.
 *
 * @param {object} [newOptions] - Optional PrismaClient constructor options for the new instance.
 * @returns {Promise<PrismaClient>} The new PrismaClient instance.
 */
async function reinitPrismaClient(newOptions) {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
    } catch (error) {
      console.error('Error disconnecting existing PrismaClient instance:', error);
      // Decide if you want to proceed or throw, depending on severity
    }
  }

  prismaInstance = new PrismaClient(newOptions);
  // Optionally, connect the new instance immediately
  try {
    // await prismaInstance.$connect(); // Uncomment if you want to connect immediately
  } catch (error) {
    console.error('Error connecting new PrismaClient instance:', error);
    // throw error; // Or handle as needed
  }
  return prismaInstance;
}

/**
 * Disconnects the global Prisma client.
 * Useful for graceful shutdown.
 */
async function disconnectPrisma() {
  if (prismaInstance) {
    console.log('Disconnecting global PrismaClient instance...');
    await prismaInstance.$disconnect();
    prismaInstance = null; // Clear the instance
    console.log('Global PrismaClient instance disconnected.');
  }
}

export { getPrismaClient, reinitPrismaClient, disconnectPrisma };

// Default export of the getter for convenience in most app parts
export default getPrismaClient();
