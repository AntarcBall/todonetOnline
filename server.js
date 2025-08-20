// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const cron = require('node-cron');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// --- Secret Manager ---
async function getServiceAccountKey() {
    // Your gcloud command sets GCP_PROJECT. K_SERVICE is a standard variable in Cloud Run.
    // We check for either to determine if we're in a GCP environment.
    const isGcpEnvironment = !!process.env.K_SERVICE || !!process.env.GCP_PROJECT;

    if (process.env.SECRET_ID && isGcpEnvironment) {
        console.log('GCP environment detected. Fetching service account from Secret Manager...');
        // Use the project ID from the environment variables.
        const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
        if (!projectId) {
            throw new Error('Could not determine project ID. Set GCP_PROJECT or GOOGLE_CLOUD_PROJECT.');
        }

        try {
            const client = new SecretManagerServiceClient();
            const name = `projects/${projectId}/secrets/${process.env.SECRET_ID}/versions/latest`;
            const [version] = await client.accessSecretVersion({ name });
            const payload = version.payload.data.toString('utf8');
            console.log('Successfully fetched service account from Secret Manager.');
            return JSON.parse(payload);
        } catch (error) {
            console.error('Error fetching secret from Google Secret Manager:', error);
            throw new Error('Could not fetch service account from Secret Manager.');
        }
    }

    // For local development, fall back to file or .env variable.
    console.log('Local environment detected. Looking for local credentials...');
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        console.log('Using service account from serviceAccountKey.json file.');
        return serviceAccount;
    } catch (e) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.log('Using service account from local .env file.');
            try {
                return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            } catch (parseError) {
                console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_JSON. Make sure it's a valid JSON string.", parseError);
                throw parseError;
            }
        }
    }

    // If no credentials found, throw an error.
    throw new Error('Firebase service account key not found. Please provide it via Secret Manager, serviceAccountKey.json, or FIREBASE_SERVICE_ACCOUNT_JSON in .env.');
}

// --- Main Application Setup ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));
app.use('/test.html', express.static(path.join(__dirname, 'test.html')));

// Asynchronous function to initialize and start the server
async function startServer() {
    try {
        // 1. Initialize Firebase Admin SDK
        const serviceAccount = await getServiceAccountKey();
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();
        console.log('Firebase Admin SDK initialized successfully.');

        // 2. Define Middleware
        const verifyFirebaseToken = async (req, res, next) => {
            const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) {
                return res.status(401).send('Unauthorized: No token provided.');
            }
            try {
                req.user = await admin.auth().verifyIdToken(idToken, true);
                next();
            } catch (error) {
                console.error('Error verifying Firebase token:', error);
                res.status(403).send('Forbidden: Invalid token.');
            }
        };

        const verifyAdmin = (req, res, next) => {
            if (req.user.admin === true) {
                return next();
            }
            return res.status(403).send('Forbidden: Requires admin privileges.');
        };

        // 3. Define API Routes
        
        // Get all nodes for the authenticated user
        app.get('/api/nodes', verifyFirebaseToken, async (req, res) => {
            try {
                const snapshot = await db.collection('nodes')
                    .where('ownerId', '==', req.user.uid)
                    .get();
                const nodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                res.status(200).json(nodes);
            } catch (error) {
                console.error('Error getting nodes:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Get track records for the authenticated user
        app.get('/api/track', verifyFirebaseToken, async (req, res) => {
            try {
                const snapshot = await db.collection('tracks')
                    .where('ownerId', '==', req.user.uid)
                    .orderBy('date', 'desc')
                    .get();
                const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                res.status(200).json(tracks);
            } catch (error) {
                console.error('Error getting tracks:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Add a new node
        app.post('/api/nodes', verifyFirebaseToken, async (req, res) => {
            try {
                const { x, y, name, commit, links, color, starred, acute } = req.body;
                if (typeof x !== 'number' || typeof y !== 'number' || !name) {
                    return res.status(400).send('Bad Request: Missing required node properties.');
                }
                const newNode = {
                    name,
                    commit: commit || 0,
                    x, y,
                    links: links || {},
                    activation: 0,
                    color: color || '#000000',
                    starred: starred || false,
                    acute: acute || false,
                    ownerId: req.user.uid
                };
                const docRef = await db.collection('nodes').add(newNode);
                res.status(201).json({ id: docRef.id, ...newNode });
            } catch (error) {
                console.error('Error adding node:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Update a node
        app.put('/api/nodes/:id', verifyFirebaseToken, async (req, res) => {
            try {
                const nodeId = req.params.id;
                const nodeRef = db.collection('nodes').doc(nodeId);
                const doc = await nodeRef.get();
                if (!doc.exists || doc.data().ownerId !== req.user.uid) {
                    return res.status(403).send('Forbidden or Not Found');
                }
                const { id, ownerId, ...updateData } = req.body;
                await nodeRef.update(updateData);
                res.status(200).json({ id: nodeId, ...updateData });
            } catch (error) {
                console.error('Error updating node:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Delete a node
        app.delete('/api/nodes/:id', verifyFirebaseToken, async (req, res) => {
            try {
                const nodeId = req.params.id;
                const nodeRef = db.collection('nodes').doc(nodeId);
                const doc = await nodeRef.get();
                if (!doc.exists || doc.data().ownerId !== req.user.uid) {
                    return res.status(403).send('Forbidden or Not Found');
                }
                
                const batch = db.batch();
                batch.delete(nodeRef);

                const snapshot = await db.collection('nodes').where('ownerId', '==', req.user.uid).get();
                snapshot.forEach(linkedDoc => {
                    const nodeData = linkedDoc.data();
                    if (nodeData.links && nodeData.links[nodeId]) {
                        const linkedNodeRef = db.collection('nodes').doc(linkedDoc.id);
                        batch.update(linkedNodeRef, { [`links.${nodeId}`]: admin.firestore.FieldValue.delete() });
                    }
                });

                await batch.commit();
                res.status(204).send();
            } catch (error) {
                console.error('Error deleting node:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Bulk update node positions
        app.post('/api/nodes/positions', verifyFirebaseToken, async (req, res) => {
            try {
                const positions = req.body.positions;
                if (!Array.isArray(positions)) {
                    return res.status(400).send('Bad Request: Expected an array of positions.');
                }
                const batch = db.batch();
                const querySnapshot = await db.collection('nodes')
                    .where('ownerId', '==', req.user.uid)
                    .where(admin.firestore.FieldPath.documentId(), 'in', positions.map(p => p.id))
                    .get();
                
                const ownedNodeIds = new Set(querySnapshot.docs.map(doc => doc.id));
                positions.forEach(pos => {
                    if (ownedNodeIds.has(pos.id)) {
                        const nodeRef = db.collection('nodes').doc(pos.id);
                        batch.update(nodeRef, { x: pos.x, y: pos.y });
                    }
                });

                await batch.commit();
                res.status(204).send();
            } catch (error) {
                console.error('Error saving node positions:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Admin route for bulk-add
        app.post('/api/admin/users/:uid/nodes', verifyFirebaseToken, verifyAdmin, async (req, res) => {
            const targetUid = req.params.uid;
            const nodesData = req.body;
            if (!Array.isArray(nodesData)) {
                return res.status(400).send('Bad Request: Body must be an array of node objects.');
            }
            try {
                const batch = db.batch();
                nodesData.forEach(node => {
                    const { id, ...data } = node;
                    const nodeRef = db.collection('nodes').doc();
                    batch.set(nodeRef, { ...data, ownerId: targetUid });
                });
                await batch.commit();
                res.status(201).send(`Successfully added ${nodesData.length} nodes for user ${targetUid}.`);
            } catch (error) {
                console.error(`Admin bulk add failed for user ${targetUid}:`, error);
                res.status(500).send('Internal Server Error');
            }
        });

        // 4. Start the Server
        const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // 5. Schedule daily task at 05:00 AM
        cron.schedule('0 5 * * *', async () => {
            console.log('Running daily task to record node levels...');
            try {
                const usersSnapshot = await admin.auth().listUsers();
                for (const userRecord of usersSnapshot.users) {
                    const uid = userRecord.uid;
                    console.log(`Processing user: ${uid}`);
                    
                    // Get all nodes for the user
                    const nodesSnapshot = await db.collection('nodes')
                        .where('ownerId', '==', uid)
                        .get();
                    
                    if (nodesSnapshot.empty) {
                        console.log(`No nodes found for user ${uid}`);
                        continue;
                    }

                    // Calculate levels for each node
                    const nodeLevels = {};
                    nodesSnapshot.forEach(doc => {
                        const nodeData = doc.data();
                        const level = Math.floor(nodeData.activation / 10);
                        nodeLevels[doc.id] = level;
                    });

                    // Get yesterday's date
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const dateString = yesterday.toISOString().slice(0, 10);

                    // Save to tracks collection
                    await db.collection('tracks').add({
                        ownerId: uid,
                        date: dateString,
                        levels: nodeLevels,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`Saved track record for user ${uid} on ${dateString}`);
                }
            } catch (error) {
                console.error('Error in daily task:', error);
            }
        }, {
            timezone: "Asia/Seoul"
        });

    } catch (error) {
        console.error('CRITICAL: Failed to initialize server.', error);
        process.exit(1); // Exit the process with an error code
    }
}

// Start the asynchronous server initialization
startServer();



