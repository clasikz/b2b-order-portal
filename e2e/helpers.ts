import path from "node:path";

// Seeded demo accounts used by the E2E suite. The client is the isolated test club's manager
// (created in global-setup); the rest are the standard seeded staff.
export const USERS = {
  client: "e2e-manager@portal.test",
  designer: "designer@portal.test",
  warehouse: "warehouse@portal.test",
  admin: "admin@portal.test",
};

export const SAMPLE = (name: string) => path.join(process.cwd(), "docs", name);
export const DESIGN_IMAGE = path.join(process.cwd(), "public", "example_jersey_v1.jpg");
