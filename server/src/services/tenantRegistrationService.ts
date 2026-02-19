import { exec } from "child_process";
import path from "path";

export const runTenantRegistration = (tenantId: string, databaseUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Navigate from landing page/server/src/services to version/server
        const omsPath = path.resolve(__dirname, "../../../../version/server");
        const scriptPath = path.join(omsPath, "src/db/scripts/register-tenant.js");

        console.log(`🚀 Triggering registration script for tenant: ${tenantId}`);
        console.log(`Executing: node "${scriptPath}" ${tenantId} "${databaseUrl}"`);

        exec(`node "${scriptPath}" ${tenantId} "${databaseUrl}"`,
            { cwd: omsPath },
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Registration script error: ${error.message}`);
                    console.error(`Stderr: ${stderr}`);
                    reject(new Error(stderr || error.message));
                } else {
                    console.log(`✅ Registration script success for ${tenantId}`);
                    resolve(stdout);
                }
            }
        );
    });
};
