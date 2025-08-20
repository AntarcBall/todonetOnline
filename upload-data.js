// upload-data.js
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// --- Secret Manager ---
async function getServiceAccountKey() {
    const projectId = process.env.GCP_PROJECT;
    const secretId = process.env.SECRET_ID;

    // For local development, we can fallback to a local file.
    if (!projectId || !secretId) {
        console.warn("GCP_PROJECT or SECRET_ID not set. Falling back to local 'serviceAccountKey.json'.");
        try {
            return require('./serviceAccountKey.json');
        } catch (fileError) {
            throw new Error("Failed to load service account key. Set GCP_PROJECT and SECRET_ID for production or ensure serviceAccountKey.json exists for local development.");
        }
    }

    const client = new SecretManagerServiceClient();
    const secretPath = `projects/${projectId}/secrets/${secretId}/versions/latest`;

    try {
        console.log(`Accessing secret: ${secretPath}`);
        const [version] = await client.accessSecretVersion({
            name: secretPath,
        });
        const payload = version.payload.data.toString('utf8');
        return JSON.parse(payload);
    } catch (error) {
        console.error('Failed to access secret from Secret Manager:', error);
        throw error;
    }
}

let db;

// --- Main Upload Function ---
async function main() {
    try {
        const serviceAccount = await getServiceAccountKey();
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        console.log('Firebase Admin SDK initialized successfully for upload script.');
        await upload();
    } catch (error) {
        console.error('Failed to initialize or run upload script:', error);
        process.exit(1);
    }
}

async function upload() {
    // --- Configuration ---
    const targetUid = process.argv[2];
    const dataFilePath = process.argv[3];
    // -------------------

    if (!targetUid || !dataFilePath) {
        console.error('Error: Missing arguments.');
        console.log('Usage: node upload-data.js <TARGET_USER_UID> <PATH_TO_JSON_FILE>');
        return;
    }

    const absoluteDataPath = path.resolve(dataFilePath);
    if (!fs.existsSync(absoluteDataPath)) {
        console.error(`Error: Data file not found at ${absoluteDataPath}`);
        return;
    }

    try {
        // 1. Delete all existing nodes for the user
        console.log(`Querying existing nodes for user ${targetUid} to delete them...`);
        const existingNodesSnapshot = await db.collection('nodes').where('ownerId', '==', targetUid).get();
        if (!existingNodesSnapshot.empty) {
            const batchDelete = db.batch();
            existingNodesSnapshot.docs.forEach(doc => {
                batchDelete.delete(doc.ref);
            });
            await batchDelete.commit();
            console.log(`Successfully deleted ${existingNodesSnapshot.size} old nodes.`);
        } else {
            console.log("No existing nodes found for this user.");
        }

        // 2. Read the new data from the JSON file
        console.log(`Reading new data from ${absoluteDataPath}...`);
        const jsonData = fs.readFileSync(absoluteDataPath, 'utf8');
        const nodesData = JSON.parse(jsonData);

        if (!Array.isArray(nodesData)) {
            console.error('Error: The JSON file must contain an array of node objects.');
            return;
        }

        // 3. First Pass: Create nodes without links and map old IDs to new IDs
        console.log(`Step 1: Creating ${nodesData.length} new node documents...`);
        const idMap = {}; // Maps oldId -> newId
        const batchCreate = db.batch();

        nodesData.forEach(node => {
            const { id: oldId, links, ...data } = node;
            const nodeRef = db.collection('nodes').doc(); // Create a new doc with a new ID
            idMap[oldId] = nodeRef.id; // Map old ID to the new one

            batchCreate.set(nodeRef, {
                ...data,
                links: {}, // Initialize with empty links
                ownerId: targetUid
            });
        });

        await batchCreate.commit();
        console.log("All node documents created successfully.");

        // 4. Second Pass: Update nodes with remapped links
        console.log("Step 2: Remapping and updating links for all nodes...");
        const batchUpdate = db.batch();

        nodesData.forEach(node => {
            if (node.links && Object.keys(node.links).length > 0) {
                const oldId = node.id;
                const newId = idMap[oldId];
                const nodeRef = db.collection('nodes').doc(newId);

                const remappedLinks = {};
                for (const oldLinkId in node.links) {
                    const newLinkId = idMap[oldLinkId]; // Find the new ID for the linked node
                    if (newLinkId) {
                        remappedLinks[newLinkId] = node.links[oldLinkId];
                    } else {
                        console.warn(`Warning: Could not find a new ID for old link ID: ${oldLinkId}. It will be skipped.`);
                    }
                }

                if (Object.keys(remappedLinks).length > 0) {
                    batchUpdate.update(nodeRef, { links: remappedLinks });
                }
            }
        });

        await batchUpdate.commit();
        console.log("All links remapped and updated successfully.");

        console.log('\n--- Success! ---');
        console.log(`Successfully uploaded and linked ${nodesData.length} new nodes for user ${targetUid}.`);

    } catch (error) {
        console.error('\n--- Script Failed! ---');
        console.error('An error occurred during the upload process:', error);
    }
}

main();
